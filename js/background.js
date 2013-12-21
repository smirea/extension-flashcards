
var flashcards = [];
var history = []; // stack of sent flash cards

var options;

// Tracks when the next flashcard needs to be shown.
var timeout;

// Directory structure.
var dirs = {
  js: 'js/',
  css: 'css/',
  images: 'images/',
};

// Content script dependencies.
var dependencies = [
  dirs.css + 'jfc.css',
  dirs.js + 'PortWrapper.js',
  dirs.js + 'jquery.js',
  dirs.js + 'utils.js',
  dirs.js + 'init-port.js',
  dirs.js + 'jfc.js',
];

// Defaults for all the options that can be configured.
var defaultOptions = {
  enabled: true,
  disableGlobalHotkeys: false,
  minDelay: 45,
  setSize: 3,
  progressDisabled: false,
  progressTime: 15,
  progressHoverHide: true,
  exclude: {},
  layout: ('Romaji English story phrase').split(' '),
  layoutDisabled: ('Katakana Hiragana').split(' '),
  displayOrder: ('Katakana Hiragana Romaji story phrase English').split(' '),
  // These are keys in the flashcard models that are used by the system and will not be displayed on
  //  the flashcard itself.
  privateKeyNames: ['__id'],
};

// All handlers a port can post to. Anything else will raise an Exception.
var handlers = {
  refreshOptions: function _refreshOptions () {
    optionsChanged(options, ls.get('options'));
    options = ls.get('options');
    for (var tabId in ports) {
      if (ports[tabId] == this) { continue; }
      ports[tabId].post('refreshOptions');
    }
  },

  getOptions: function _getOptions (message) {
    message.callback(ls.get('options'));
  },

  getFlashcardSet: function _getFlashcardSet (message) {
    sendFlashcards(message.setSize || options.setSize);
  },

  loadData: function _getData (message) {
    loadData(message.url, message.callback);
  },

  // Utils.
  echo: function _echoServer (message) {
    this.post('echo', {content: 'ECHO: ' + message.content});
  },
};

/**
 * Sets the timer that will trigger the showing of a flash card.
 * Only reschedules if the time has passed, aka: localStorage['show-time'];
 */
function setTimer () {
  var showTime = ls.get('show-time');

  if (showTime && Date.now() < showTime && timeout) { return; }

  var repeater = function () {
    var delay = options.minDelay * 60 * 1000;
    var newTime = Date.now() + delay;

    if (showTime && Date.now() < showTime) {
      delay = showTime - Date.now();
      newTime = showTime;
    } else {
      sendFlashcards();
    }

    ls.set('show-time', newTime);
    clearTimeout(timeout);
    timeout = setTimeout(repeater, delay);

    console.log('Scheduled flashcard deck for: %s', new Date(newTime));
  }

  repeater();
}

function sendFlashcards (maxCards) {
  maxCards = maxCards || options.setSize;
  var available = flashcards.filter(function (card) { return !(card.__id in options.exclude); });
  available.shuffle();

  var cardDeck;
  if (available.length <= maxCards) {
    cardDeck = available;
  } else {
    cardDeck = available.slice(0, maxCards);
  }

  for (var i=0; i<cardDeck.length; ++i) {
    history.push(cardDeck[i]);
  }

  chrome.tabs.query({currentWindow: true, active : true}, function (arr) {
    var tab = arr[0];
    var done = function (port) { ports[tab.id].post('cardDeck', {cards: cardDeck}); };

    if (ports[tab.id]) { return done(); }

    initTab(tab.id, function () { setTimeout(done, 100); });
  });

  return cardDeck;
}

function optionsChanged (old) {
  //TODO: really do this properly ...
  // window.location.reload();
  reloadOptions();
  setFlashcards();
}

function reloadOptions () {
  // Make sure all the options have their defaults.
  options = ls.get('options', {});
  for (var key in defaultOptions) {
    if (key in options) { continue; }
    options[key] = defaultOptions[key];
  }
  ls.set('options', options);
  setTimer();
}

/**
 * Loads the flashcards from localStorage or from the JSON file if they are undefined.
 */
function setFlashcards (callback) {
  callback = callback || function () {};
  flashcards = ls.get('flashcards');

  if (flashcards && Array.isArray(flashcards) && flashcards.length > 0) {
    callback();
    return;
  }

  loadData(null, callback);
}

function handleUpdate () {
  // The second an update is available, install it!
  chrome.runtime.onUpdateAvailable.addListener(function (details) { chrome.runtime.reload() });

  // TODO: delete this in like a month or so
  // A previous version used the string "card.category|card.Romaji" as an unique id.
  // New version assigns an unique id to all cards, therefore we need to migrate.
  chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason != 'update') { return; }
    setFlashcards(function () {
      // Delete all old IDs from the exclude
      for (var oldId in options.exclude) {
        if (oldId.indexOf('|') == -1) { continue; }
        delete options.exclude[oldId];
      }
      ls.set('options', options);
    });
  })

}

function init () {
  reloadOptions();
  setFlashcards();
  setFlashcardIDs(flashcards);
  init_ports(handlers);
  if (!options.disableGlobalHotkeys) { init_global_hotkeys(); }
  handleUpdate();
}

/**
 * Initializes a tab by adding all the file dependencies for the content-script to it.
 * @param  {Number}   tabId
 * @param  {Function} callback
 */
function initTab (tabId, callback) {
  return syncLoading(dependencies, tabId, null, callback);
}

/**
 * All pages will be injected with a very small content script which adds key bindings that
 * can be used to request the pre-load of the big cheese.
 */
function init_global_hotkeys () {
  var deps = ['js/contentscript-hotkeys.js'];

  // Add hotkeys to all tabs.
  chrome.tabs.query({}, function (tabs) {
    for (var i=0; i<tabs.length; ++i) {
      syncLoading(deps, tabs[i].id);
    }
  });

  // Always add hotkey script to new tabs.
  chrome.tabs.onUpdated.addListener(function (tabId, info) {
    if (info.status != "complete") { return; }
    syncLoading(deps, tabId);
  });

  // Message passing for requests.
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    sendResponse();
    if (!sender.tab) { return; }
    switch (request) {
      case 'send-card': sendFlashcards(); break;
      default:
        console.warn('Unknown request type:', request, sender);
    }
  });
}

/**
 * Setup incoming ports and handlers.
 * @param  {Object} handlers
 */
var init_ports = (function (scope) {
  // All ports will be stored here by ID.
  var ports = {};
  scope.ports = ports;

  return function (handlers) {
    chrome.extension.onConnect.addListener(function _portOnConnect (incomingPort) {
      // Disregard option sockets
      if (incomingPort.name == 'options') {
        var port  = new PortWrapper(incomingPort);
        port.addHandlers(handlers);
        return;
      }

      var port  = new PortWrapper(incomingPort);
      if (ports[port.sender.tab.id]) {
        console.info('[PORT] Updating port for tab:', port.sender.tab.id);
      } else {
        console.info('[PORT] Initialized for tab:', port.sender.tab.id);
      }
      ports[port.sender.tab.id] = port;
      port.addHandlers(handlers);
      port.disconnect(function _disconnect () {
        delete ports[port.sender.tab.id];
      });
    });
  };
})(window);

/**
 * Loads a flashcards file.
 * @param  {String}   url      If undefined, then it will load the default one.
 * @param  {Function} callback
 * @return {jqXHR}
 */
function loadData (url, callback) {
  url = url || chrome.extension.getURL('flashcards.json');
  callback = callback || function _no_callback () {};
  console.warn('Resetting flashcards, loading from file: %s', url);

  return $.getJSON(url, function (data) {
    flashcards = data;
    saveFlashcards(true, flashcards);
    callback(data, url);
  }).fail(function(jqxhr, textStatus, error) {
    console.error("Failed to get data (%s): \n  %s\n  %s", url, textStatus, error.toString());
  })
}

/**
 * INIT
 */
init();

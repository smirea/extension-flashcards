
var flashcards = [];
var history = []; // stack of sent flash cards

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
  minDelay: 30,
  setSize: 3,
  progressDisabled: false,
  progressTime: 15,
  progressHoverHide: true,
  exclude: {},
  layout: ('Japanese English story phrase').split(' '),
  displayOrder: ('English Japanese phrase story').split(' '),
};

// Make sure all the options have their defaults.
var options = ls.get('options', {});
for (var key in defaultOptions) {
  if (key in options) { continue; }
  options[key] = defaultOptions[key];
}
ls.set('options', options);

// All handlers a port can post to. Anything else will raise an Exception.
var handlers = {
  refreshOptions: function _refreshOptions () {
    options = ls.get('options');
  },

  getOptions: function _getOptions (message) {
    message.callback(ls.get('options'));
  },

  getFlashcard: function _getFlashcard (message) {
    var available = flashcards.filter(function (c) {
      return !(hashFlashcard(c) in options.exclude);
    });
    var card = available[Math.floor(Math.random() * available.length)];
    message.callback(card);
    history.push(card);
  },

  loadData: function _getData (message) {
    loadData(message.url, message.callback);
  },

  // Utils.
  echo: function _echoServer (message) {
    this.post('echo', {content: 'ECHO: ' + message.content});
  },
};

function init () {
  loadData();
  init_ports(handlers);
  init_tabs();
}

function init_tabs () {
  chrome.tabs.onUpdated.addListener(function (tabId, info) {
    if (info.status != "complete") {
      return;
    }
    // Only enable this for localhost for now.
    chrome.tabs.get(tabId, function (tab) {
      if (!/^http:\/\/localhost/.test(tab.url)) {
        return;
      }
      syncLoading(dependencies, null);
    });
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
        port.post('accept');
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
      port.post('accept');
      port.disconnect(function _disconnect () {
        delete ports[port.sender.tab.id];
      });
    });
  };
})(window);

function filterFlashcards (filters) {

}

/**
 * Loads a flashcards file.
 * @param  {String}   url      If undefined, then it will load the default one.
 * @param  {Function} callback
 * @return {jqXHR}
 */
function loadData (url, callback) {
  url = url || chrome.extension.getURL('flashcards.json');
  callback = callback || function _no_callback () {};
  return $.getJSON(url, function (data) {
    callback(data, url);
    flashcards = data;
    ls.set('flashcards', flashcards);
  });
}

/**
 * INIT
 */
init();

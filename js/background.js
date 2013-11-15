
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

// All handlers a port can post to. Anything else will raise an Exception.
var handlers = {
  getFlashcard: function _getFlashcard (message) {
    var card = flashcards[Math.floor(Math.random() * flashcards.length)];
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
      var port  = new PortWrapper(incomingPort);
      if (ports[port.sender.tab.id]) {
        console.info('[PORT] Updating port for tab:', port.sender.tab.id);
      } else {
        console.info('[PORT] Initialized for tab:', port.sender.tab.id);
      }
      ports[port.sender.tab.id] = port;
      port.post('accept');
      port.addHandlers(handlers);
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
  });
}

/**
 * INIT
 */
init();
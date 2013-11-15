var port = null;

var handlers = {
  flashcard: function _flashcard (message) {

  },
  // Utils.
  accept: function _acceptedConnection (message) {
    console.info('[PORT] Connection accepted');
  },
  echo : function _echoClient (message) {
    console.log('[PORT]', message.content);
  }
};

init_port();

function init_port () {
  port = new PortWrapper(chrome.extension.connect());

  port.addHandlers(handlers);

  port.disconnect(function _onDisconnect (event) {
    console.warn('[PORT] disconnected');
  });
}
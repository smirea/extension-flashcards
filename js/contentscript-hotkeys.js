
(function () {
  if (window.jfc_init) { return; }

  var hotkey = 78; // N
  var excludeTags = 'select input textarea'.split(' ');

  document.addEventListener('keydown', oneShotHotkeys);

  window.jfc_init = true;
  window.jfc_unbind = document.removeEventListener.bind(document, 'keydown', oneShotHotkeys);

  function oneShotHotkeys (event) {
    if (excludeTags.indexOf(event.target.nodeName.toLowerCase()) > -1) { return; }
    if (event.keyCode != hotkey) { return; }
    sendMessage('send-card');
    document.removeEventListener('keydown', oneShotHotkeys);
  }

  function sendMessage (data, callback) {
    return chrome.runtime.sendMessage(data, callback || function () {});
  }
})();

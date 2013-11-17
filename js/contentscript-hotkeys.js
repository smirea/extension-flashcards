
(function () {
  if (window.jfc_init) { return; }
  window.jfc_init = true;

  var hotkey = 78; // N
  var excludeTags = 'select input textarea'.split(' ');

  document.addEventListener('keydown', oneShotHotkeys);

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

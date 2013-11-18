
(function () {
  if (window.jfc_init) { return; }

  var hotkey = 78; // N
  var excludeTags = 'select input textarea'.split(' ');

  document.addEventListener('keydown', oneShotHotkeys);

  window.jfc_init = true;
  window.jfc_unbind = function () {
    document.removeEventListener('keydown', oneShotHotkeys);
    delete window.jfc_init;
    delete window.jfc_unbind;
  };

  function oneShotHotkeys (event) {
    if (event.keyCode != hotkey) { return; }

    // Check if the element is not an text input.
    if (excludeTags.indexOf(event.target.nodeName.toLowerCase()) > -1) { return; }

    // Check to see if the element or any of its parents is not a rich text field.
    var p = event.target;
    while (p && p != document) {
      if (p.getAttribute('contenteditable')) { return; }
      p = p.parentNode;
    }

    window.jfc_unbind();
    sendMessage('send-card');
  }

  function sendMessage (data, callback) {
    return chrome.runtime.sendMessage(data, callback || function () {});
  }
})();

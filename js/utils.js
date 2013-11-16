/**
 * Perform fuzzy searching on the string.
 *
 * @param  {String} str The string to match against.
 * @param {Boolean} case_insensitive=false
 *
 * @return {Object|null} If a full match is not found, null is returned.
 * If a match is found, the resulting object will have as keyx the index in the
 * original string where the the substring is found.
 *
 * @example
 * 'I am a little string'.fuzzySearch('yolo'); // null
 * 'I am a little string'.fuzzySearch('ials'); // {8: "it", 11: "le", 15: "tring"}
 * 'I am a little string'.fuzzySearch('ials'); // {0: "I", 9: "t", 11: "le", 15: "tring"}
 */
String.prototype.fuzzySearch = function (str, case_insensitive) {
  var origin = this;
  if (case_insensitive) {
    origin = this.toLowerCase();
    str = str.toLowerCase();
  }
  var result = {};
  var j = 0;
  for (var i = 0; i < origin.length && j < str.length; ++i) {
    var start = null;
    while (str[j] == origin[i] && i < origin.length && j < str.length) {
      start = start !== null ? start : i;
      ++i;
      ++j;
    }
    if (start !== null) {
      result[start] = this.slice(start, i);
    }
  }
  return j == str.length ? result : null;
};

/**
 * Returns the css properties of an element.
 * Useful for javascript css toggle.
 * @param  {jQuery} $elem
 * @param  {Array<String>} properties
 * @return {Object}
 */
function saveCSS ($elem, properties) {
  properties = Array.isArray(properties) ? properties : [properties];
  var css = {};

  for (var i=0; i<properties.length; ++i) {
    css[properties[i]] = $elem.css(properties[i]);
  }

  return css;
}

/**
 * Create a new jQuery element of specified type
 * @param {string} type
 * @return {jQuery}
 */
function jqElement (type) {
  return $(document.createElement(type));
}

/**
 * Sequencially load the files.
 * @param  {Object}   files
 * @param  {Number}   tab
 * @param  {Number}   index = 0
 * @param  {Function} callback
 */
function syncLoading (files, tab, index, callback) {
  tab = tab || null;
  index = index || 0;
  callback = callback || function _emptyCallback () {};

  var fileObject = typeof files[index] === 'object' ? files[index]
                                                      : { file: files[index] };
  var extension = fileObject.file.slice(fileObject.file.lastIndexOf('.')+1);
  var loadFunction = extension === 'js' ? 'executeScript' : 'insertCSS';

  chrome.tabs[loadFunction](
    tab,
    fileObject,
    (function _setupNextCallback (newFile, newIndex) {
      return function _callNextSyncLoading () {
        if (index + 1 < files.length) {
          syncLoading(files, tab, newIndex, callback);
        } else {
          callback(files);
        }
      };
    }(fileObject, index+1))
  );
}

var KEYS = {
  CANCEL: 3,
  HELP: 6,
  BACK_SPACE: 8,
  TAB: 9,
  CLEAR: 12,
  RETURN: 13,
  ENTER: 13,
  SHIFT: 16,
  CONTROL: 17,
  ALT: 18,
  PAUSE: 19,
  CAPS_LOCK: 20,
  ESCAPE: 27,
  SPACE: 32,
  PAGE_UP: 33,
  PAGE_DOWN: 34,
  END: 35,
  HOME: 36,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  PRINTSCREEN: 44,
  INSERT: 45,
  DELETE: 46,
  0: 48,
  1: 49,
  2: 50,
  3: 51,
  4: 52,
  5: 53,
  6: 54,
  7: 55,
  8: 56,
  9: 57,
  SEMICOLON: 59,
  EQUALS: 61,
  A: 65,
  B: 66,
  C: 67,
  D: 68,
  E: 69,
  F: 70,
  G: 71,
  H: 72,
  I: 73,
  J: 74,
  K: 75,
  L: 76,
  M: 77,
  N: 78,
  O: 79,
  P: 80,
  Q: 81,
  R: 82,
  S: 83,
  T: 84,
  U: 85,
  V: 86,
  W: 87,
  X: 88,
  Y: 89,
  Z: 90,
  COMMAND: 91,
  CONTEXT_MENU: 93,
  NUMPAD0: 96,
  NUMPAD1: 97,
  NUMPAD2: 98,
  NUMPAD3: 99,
  NUMPAD4: 100,
  NUMPAD5: 101,
  NUMPAD6: 102,
  NUMPAD7: 103,
  NUMPAD8: 104,
  NUMPAD9: 105,
  MULTIPLY: 106,
  ADD: 107,
  SEPARATOR: 108,
  SUBTRACT: 109,
  DECIMAL: 110,
  DIVIDE: 111,
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
  F12: 123,
  F13: 124,
  F14: 125,
  F15: 126,
  F16: 127,
  F17: 128,
  F18: 129,
  F19: 130,
  F20: 131,
  F21: 132,
  F22: 133,
  F23: 134,
  F24: 135,
  NUM_LOCK: 144,
  SCROLL_LOCK: 145,
  COMMA: 188,
  PERIOD: 190,
  SLASH: 191,
  BACK_QUOTE: 192,
  OPEN_BRACKET: 219,
  BACK_SLASH: 220,
  CLOSE_BRACKET: 221,
  QUOTE: 222,
  META: 224
};

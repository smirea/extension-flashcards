
var start = 1;
var end = 15;
var dir = 'txt/';

var fs = require('fs');

var converter = require('./kana-converter.js');

var cards = [];

function init () {
  for (var lesson=start; lesson<=end; ++lesson) {
    var file = dir + lesson + '.txt';
    var str = fs.readFileSync(file);
    str = str.toString().trim();
    str = str.replace(/^\s+$/gm, '');

    var arr = str.split('\n\n');
    arr = arr.map(function (s) { return s.trim().replace('\n', '').replace(/\s+/g, ' '); });

    // Concatenate non caps words on multiple lines into 1 line.
    var tmp = [arr[0]];
    for (var i=1; i<arr.length; ++i) {
      if (/^[^a-zA-Z]*[A-Z]/.test(arr[i])) {
        tmp.push(arr[i]);
        continue;
      }
      tmp[tmp.length - 1] += ' ' + arr[i];
    }
    arr = tmp;

    if (arr.length % 4 !== 0) {
      console.warn(str);
      console.warn(arr);
      console.warn(' [ERROR] %s not a multiple of 4 in %s', arr.length, file);
      return;
    }

    var p1 = []; // en / jp
    var p2 = []; // story / phrase
    for (var j=0; j<arr.length; j+=32) {
      var slice = arr.slice(j, j + 32);
      p1 = p1.concat(slice.slice(0, slice.length / 2));
      p2 = p2.concat(slice.slice(slice.length / 2));
    }

    if (p1.length !== p2.length) {
      console.warn(' [ERROR] Parts of different length: %s !== %s', p1.length, p2.length);
      return;
    }

    for (var j=0; j<p1.length; j+=4) {
      if (p1.length - j >= 4) {
        cards.push(flashcard(lesson, p1[j], p1[j + 1], p2[j + 2], p2[j + 3]));
        cards.push(flashcard(lesson, p1[j + 2], p1[j + 3], p2[j], p2[j + 1]));
        continue;
      }
      cards.push(flashcard(lesson, p1[j], p1[j + 1], p2[j], p2[j + 1]));
    }
  }

  fs.writeFileSync('flashcards.json', JSON.stringify(cards, null, 2));
}

var htmlDecode = (function () {
  var kana = JSON.parse(fs.readFileSync('kana.json'));
  var htmlToKana = {};
  kana.forEach(function (obj) { htmlToKana[obj.html] = obj.char; });

  return function (str) {
    return str.replace(/&#[0-9]+;/g, function (match) {
      if (!(match in htmlToKana)) {
        throw new Error('The sequence `' + match + '` was not found in the conversion table');
      }
      return htmlToKana[match];
    });
  }
})();

function flashcard (lesson, en, rom, story, phrase) {
  return {
    category: 'JTA - Lesson ' + lesson,
    English: en,
    Romaji: rom,
    Hiragana: htmlDecode(converter.getHiragana(rom)),
    Katakana: htmlDecode(converter.getKatakana(rom)),
    story: story,
    phrase: phrase,
  };
}

init();

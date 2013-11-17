
var start = 1;
var end = 15;
var dir = 'txt/';

var fs = require('fs');

var cards = [];

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

function flashcard (lesson, en, jp, story, phrase) {
  return {
    category: 'JTA - Lesson ' + lesson,
    English: en,
    Japanese: jp,
    story: story,
    phrase: phrase,
  };
}

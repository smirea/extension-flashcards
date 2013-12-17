// Scraping from: http://www.japaneseverbconjugator.com/JVerbList.asp?myOrder=Japanese
//
// Requires jQuery

var pages = $('#StripedTable1 tr').slice(1).map(function () {
  return {
    verb: $(this).find('a').eq(0).html().trim(),
    japanese: $(this).find('td').eq(0).text().trim().split('\n')[1],
    translation: $(this).children().eq(1)[0].textContent,
    url: 'http://www.japaneseverbconjugator.com/' + $(this).find('a').eq(0).attr('href'),
  };
}).get();

$.fn.tt = function () { return this.text().trim(); };
function ss (str) { return str.replace(/\s\s+/g, '\n').split('\n'); }

var max_connections = 8;
var cur_connections = 0;
var result = [];

for (var i=0; i<max_connections; ++i) {
  getPage(i);
}

function getPage (worker_no) {
  if (pages.length <= 0) {
    console.warn('[Worker %s] DONE', worker_no);
    if (--max_connections <= 0) {
      console.log('');
      console.warn('ALL DONE');
      downloadFile('japanese-verb-conjugations.json', JSON.stringify(result, null, 2));
    }
    return;
  }

  var info = pages.pop();
  console.info('[Worker %s] Fetching: %s', worker_no, info.verb);
  $.get(info.url, function (data) {
    info.tenses = {};
    parsePage($(document.createElement('div')).append(data), info);
    result.push(info);
    getPage(worker_no);
  });
}

function parsePage ($container, info) {
  $container.find('#StripedTable1 thead tr').each(function () {
    var ch = $(this).children();
    info[ch.eq(0).tt()] = ch.eq(1).tt();
  });

  var tr = $container.find('#StripedTable1 tbody tr').slice(1);
  for (var i=0; i<tr.length; i+=2) {
    var plain_ch = tr.eq(i).find('td').slice(2);
    var polite_ch = tr.eq(i + 1).find('td').slice(1);
    info.tenses[tr.eq(i).find('td').eq(0).tt()] = {
      plain: {
        positive: ss(plain_ch.eq(0).tt()),
        negative: ss(plain_ch.eq(1).tt()),
      },
      polite: {
        positive: ss(polite_ch.eq(0).tt()),
        negative: ss(polite_ch.eq(1).tt()),
      },
    };
  }
}

function downloadFile (name, text, mimeType) {
  var blob = new Blob([text], {type: mimeType || 'text/plain'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.setAttribute('download', name);
  a.setAttribute('href', url);
  a.innerHTML = 'download me';
  document.documentElement.appendChild(a);
  a.click();
  a.parentNode.removeChild(a);
}
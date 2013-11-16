
// Press this to reveal a pannel.
var hotkey = KEYS.N;
// How long to display the notification.
// If it is a falsy value, it will not disappear automatically.
var time = 30;
var displayOrder = 'English Japanese story phrase'.split(' ');
var revealOrder = 'English story phrase Japanese'.split(' ');

var revealIndex = 0;
var $wrapper = $();
var stoppetProgressBar = false;

$(init);

function init () {
  getNewFlashcard();
}

function getNewFlashcard () {
  port.post('getFlashcard', {callback:showFlashcard});
}

function showFlashcard (card) {
  revealIndex = 1;
  stoppetProgressBar = !time || time <= 0;

  $wrapper.remove();
  $wrapper = jqElement('div');
  var get = function (name) {
    var disp = displayOrder.indexOf(name) > -1;
    return jqElement('div').
            addClass('jfc-' + name).
            addClass(disp ? 'jfc-element' : '').
            html( (disp ? '<span class="jfc-name">' + name + '</span>' : '') +
                  (card[name] !== undefined ? card[name] : '') );
  };

  if (time) {
    jqElement('div').
      addClass('jfc-progressBar').
      appendTo($wrapper).
      append(
        jqElement('div').addClass('jfc-progress').animate({
          width: '100%'
        }, time * 1000, 'linear', function () {
          $wrapper.find('.jfc-close')[0].click();
        })
      );
  }

  for (var i=0; i<displayOrder.length; ++i) {
    $wrapper.append(get(displayOrder[i]));
  }

  for (var key in card) {
    if (displayOrder.indexOf(key) > -1) { continue; }
    $wrapper.append(get(key));
  }

  // Highlight connectors in phrase.
  var phrase = $wrapper.find('.jfc-phrase').html();
  var connectors = phrase.match(/([A-Z]+\s*)+/g).sort(function (a, b) {
    return a.length < b.length;
  }).slice(0, 2);
  for (var i=0; i<connectors.length; ++i) {
    phrase = phrase.replace(
      new RegExp(connectors[i], 'gi'),
      '<span class="jfc-connector">' + connectors[i] + '</span>'
    );
  }
  $wrapper.find('.jfc-phrase').html(phrase);

  // Close button.
  jqElement('a').
    attr('href', 'javascript:void(0)').
    addClass('jfc-close').
    appendTo($wrapper).
    html('').
    on('click', function _close (event) {
      event.preventDefault();
      event.stopPropagation();
      $wrapper.data('closing', true).fadeOut('normal', $wrapper.remove.bind($wrapper));
    });

  // Only show the first element.
  $wrapper.find('.jfc-element').hide().filter('.jfc-' + revealOrder[0]).show();

  // Show.
  $wrapper.
    addClass('jfc-flashcard').
    appendTo(document.documentElement).
    hide().
    fadeIn('normal');

  addEvents();

  return $wrapper;
}

function showNextHint (noClose) {
  if (!stoppetProgressBar) {
    $wrapper.find('.jfc-progress').stop();
    $wrapper.find('.jfc-progressBar').fadeOut('slow');
    stoppetProgressBar = true;
    return;
  }

  if (!noClose && revealIndex >= revealOrder.length) {
    $wrapper.find('.jfc-close').click();
    return;
  }

  $wrapper.find('.jfc-' + revealOrder[revealIndex]).slideDown();
  ++revealIndex;
}

function addEvents () {
  $(document).off('keydown.jfc').on('keydown.jfc', function (event) {
    var $target = $(event.target);

    if (event.keyCode != hotkey || $target.is('input') || $target.is('textarea')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (!$wrapper.is(':visible') || $wrapper.data('hiding')) {
      getNewFlashcard();
      return;
    }

    showNextHint();
  });

  $wrapper.on('mouseenter.jfc', function (event) { $wrapper.addClass('jfc-over'); });
  $wrapper.on('mouseleave.jfc', function (event) { $wrapper.removeClass('jfc-over'); });
  $wrapper.on('click.jfc', function (event) {
    event.preventDefault();
    event.stopPropagation();
    showNextHint(true);
  });
}


// Press this to reveal a pannel.
var hotkey = KEYS.N;

var revealIndex = 0;
var $wrapper = $();
var stoppetProgressBar = false;

var options = null;

$(init);

function init () {
  getOptions(getNewFlashcard);
}

function getOptions (callback) {
  port.post('getOptions', {
    callback: function (opt) {
      options = opt;
      console.log(JSON.stringify(options, null, 2));
      (callback || function () {})(opt);
    }
  });
}

function getNewFlashcard () {
  port.post('getFlashcard', {callback:showFlashcard});
}

function showFlashcard (card) {
  revealIndex = 1;
  stoppetProgressBar = !options.progressTime || options.progressTime <= 0;

  $wrapper.remove();
  $wrapper = jqElement('div');
  var get = function (name) {
    var disp = options.layout.indexOf(name) > -1;
    return jqElement('div').
            addClass('jfc-' + name).
            addClass(disp ? 'jfc-element' : '').
            html( (disp ? '<span class="jfc-name">' + name + '</span>' : '') +
                  (card[name] !== undefined ? card[name] : '') );
  };

  // Add progressbar
  if (!stoppetProgressBar) {
    jqElement('div').
      addClass('jfc-progressBar').
      appendTo($wrapper).
      append(
        jqElement('div').addClass('jfc-progress').animate({
          width: '100%'
        }, options.progressTime * 1000, 'linear', function () {
          $wrapper.find('.jfc-close')[0].click();
        })
      );

    if (options.progressHoverHide) {
      $wrapper.one('mouseenter', function (event) {
        if (stoppetProgressBar) { return; }
        showNextHint(true);
      });
    }
  }

  for (var i=0; i<options.layout.length; ++i) {
    $wrapper.append(get(options.layout[i]));
  }

  for (var key in card) {
    if (options.layout.indexOf(key) > -1) { continue; }
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
  $wrapper.find('.jfc-element').hide().filter('.jfc-' + options.displayOrder[0]).show();

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

  if (!noClose && revealIndex >= options.displayOrder.length) {
    $wrapper.find('.jfc-close').click();
    return;
  }

  $wrapper.find('.jfc-' + options.displayOrder[revealIndex]).slideDown();
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

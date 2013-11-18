
// Don't cache more than this number of cards in the deck.
var MAX_DECK_SIZE = 69;

// If a port disconnects, how many times to retry reconnecting.
var MAX_RETRIES = 10;

// Timeout between every retry.
var RETRY_TIMEOUT = 1 * 1000;

// Press this to reveal a panel.
var hotkey = KEYS.N;

// Which of the log functions to use. Default = ALL
// 1 - error, 2 - warn, 3 - info, 4 - log
var logLevel = 4;

var logger = {
  error:  logLevel && logLevel >= 1 ? console.error.bind(console) : function () {},
  warn:   logLevel && logLevel >= 2 ? console.warn.bind(console) : function () {},
  info:   logLevel && logLevel >= 3 ? console.info.bind(console) : function () {},
  log:    logLevel && logLevel >= 4 ? console.log.bind(console) : function () {},
};

var port = null;

var revealIndex = 0;
var $wrapper = $();
var stoppetProgressBar = false;

var options = null;
// While cards in the deck, use the deck.
var deck = [];

$(init);

function init () {
  clear();
  initPort();
  getOptions();
}

function getOptions (callback) {
  port.post('getOptions', {
    callback: function (opt) {
      options = opt;
      (callback || function () {})(opt);
    }
  });
}

function getFlashcardSet () {
  port.post('getFlashcardSet');
}

function showFlashcard (card) {
  revealIndex = 1;
  stoppetProgressBar = options.progressDisabled || !options.progressTime || options.progressTime <= 0;

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
  var $name = $wrapper.find('.jfc-phrase .jfc-name').remove();
  var phrase = $wrapper.find('.jfc-phrase').html();
  var connectors = phrase.match(/([A-Z]+,?\s*)+/g).sort(function (a, b) {
    return a.length < b.length;
  }).slice(0, 2);
  for (var i=0; i<connectors.length; ++i) {
    phrase = phrase.replace(
      new RegExp(connectors[i], 'gi'),
      '<span class="jfc-connector">' + connectors[i] + '</span>'
    );
  }
  $wrapper.find('.jfc-phrase').html(phrase).prepend($name);

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
      if (deck.length > 0) {
        showFlashcard(deck.pop());
      }
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
      getFlashcardSet();
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

function clear () {
  console.log(window.jfc_init, window.jfc_unbind);
  if (window.jfc_init && window.jfc_unbind) { window.jfc_unbind(); }
  $('.jfc-flashcard').each(function () {
    $(this).find('.jfc-close')[0].click();
    $(this).remove();
  });
}

function initPort (retryCount) {
  // To initiate a retry sequence, start from retryCount = 1;
  retryCount = retryCount || 0;

  var handlers = {
    refreshOptions: function _refreshOptions (message) {
      getOptions();
    },

    cardDeck: function _flashcard (message) {
      var max = Math.max(0, MAX_DECK_SIZE - deck.length);
      deck = (message.cards || []).slice(0, max).concat(deck);
      showFlashcard(deck.pop());
    },

    // Utils.
    echo : function _echoClient (message) {
      logger.log('[PORT]', message.content);
    }
  };

  if (retryCount > 0) {
    if (retryCount > MAX_RETRIES) {
      logger.warn('[PORT] Failed to connect, giving up.');
    } else {
      logger.info('[PORT] Attempting reconnection %s/%s', retryCount, MAX_RETRIES);
    }
  }

  try {
    port = new PortWrapper(chrome.extension.connect(), {
      logLevel: logLevel
    });

    port.addHandlers(handlers);

    port.disconnect(function _onDisconnect (event) {
      logger.warn('[PORT] disconnected');
      initPort(1);
    });

    if (retryCount > 0) {
      logger.info('[PORT] Reconnection Succeeded!');
    }
  } catch (ex) {
    initPort(retryCount + 1);
  }
}

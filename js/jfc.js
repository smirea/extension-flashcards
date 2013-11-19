
// Don't cache more than this number of cards in the deck.
var MAX_DECK_SIZE = 69;

// Press this to reveal a panel.
var hotkeys = {
  // Shows next hint, clears the flashcard and retries new flashcard from cache or a new set.
  next: KEYS.N,
  // Clears the whole set of flashcards.
  clear: KEYS.I,
};

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
      // Only show elements that are in the layout;
      options.displayOrder = options.displayOrder.filter(function (d) {
        return options.layout.indexOf(d) > -1;
      });
      (callback || function () {})(opt);
    }
  });
}

function getFlashcardSet () {
  port.post('getFlashcardSet');
}

function showFlashcard (card) {
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
        jqElement('div').data('target', $wrapper).addClass('jfc-progress').animate({
          width: '100%'
        }, options.progressTime * 1000, 'linear', function () {
          var $target = $(this).data('target');
          if (!$target || !$target.is(':visible')) {
            return;
          }
          $target.find('.jfc-close')[0].click();
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
    if (!(options.layout[i] in card)) { continue; }
    $wrapper.append(get(options.layout[i]));
  }

  // // Add remaining keys.
  // for (var key in card) {
  //   if (options.layout.indexOf(key) > -1) { continue; }
  //   $wrapper.append(get(key));
  // }

  // Highlight connectors in phrase.
  if ('phrase' in card) {
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
  }

  // Close button.
  jqElement('a').
    attr('href', 'javascript:void(0)').
    addClass('jfc-close').
    appendTo($wrapper).
    html('').
    on('click', function _close (event) {
      event.preventDefault();
      event.stopPropagation();
      $wrapper.remove();
      if (deck.length > 0) {
        showFlashcard(deck.pop());
      }
    });

  // Show.
  $wrapper.
    addClass('jfc-flashcard').
    appendTo(document.documentElement).
    hide().
    fadeIn('normal');

  addEvents();

  // Only show the first element.
  revealIndex = 0;
  $wrapper.find('.jfc-element').hide();
  var $next = getNextHint();
  if (!$next) { throw new Error('No first element?!'); }
  $next.show();

  return $wrapper;
}

function showNextHint (noClose) {
  if (!stoppetProgressBar) {
    $wrapper.find('.jfc-progress').stop();
    $wrapper.find('.jfc-progressBar').fadeOut();
    stoppetProgressBar = true;
    return;
  }

  if (!noClose && revealIndex >= options.displayOrder.length) {
    $wrapper.find('.jfc-close').click();
    return;
  }

  var $next = getNextHint();
  if (!$next || $next.length == 0) {
    $wrapper.find('.jfc-close').click();
    return;
  }
  $next.slideDown();
}

/**
 * Returns the next hint that needs to be displayed or null if all of them are done.
 * @return {jQuery}
 */
function getNextHint () {
  while (revealIndex < options.displayOrder.length) {
    var $next = $wrapper.find('.jfc-' + options.displayOrder[revealIndex]);
    ++revealIndex;

    if ($next && $next.length > 0) { return $next; }
  }

  return null;
}

function addEvents () {
  $(document).off('keydown.jfc').on('keydown.jfc', function (event) {
    var $target = $(event.target);

    if ($target.is('input') || $target.is('textarea') ||
        $target.parents().add($target).is('[contenteditable="true"]')) {
      return;
    }

    switch (event.keyCode) {
      case hotkeys.next:
        if (!$wrapper.is(':visible')) {
          getFlashcardSet();
          return;
        }

        showNextHint();
        break;
      case hotkeys.clear:
        if (!$wrapper.is(':visible')) {
          return;
        }
        clear();
        break;
      default: return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();


  });

  $wrapper.on('mouseenter.jfc', function (event) { $wrapper.addClass('jfc-over'); });
  $wrapper.on('mouseleave.jfc', function (event) { $wrapper.removeClass('jfc-over'); });
  $wrapper.on('click.jfc', function (event) {
    event.preventDefault();
    event.stopPropagation();
    showNextHint(true);
  });
}

/**
 * Unbinds global hotkeys and removes all flashcards.
 * @return {[type]} [description]
 */
function clear () {
  if (window.jfc_init && window.jfc_unbind) { window.jfc_unbind(); }
  deck = [];
  $('.jfc-flashcard').each(function () {
    $(this).find('.jfc-close')[0].click();
    $(this).remove();
  });
}

function initPort (retryCount) {
  // If a port disconnects, how many times to retry reconnecting.
  var MAX_RETRIES = 10;

  // Timeout between every retry.
  var RETRY_TIMEOUT = 1 * 1000;

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
      console.warn('[PORT] Failed to connect, giving up.');
      return;
    } else {
      console.info('[PORT] Attempting reconnection %s/%s', retryCount, MAX_RETRIES);
    }
  }

  var retry = function (val) {
    retryCount = val || retryCount || 0;
    ++retryCount;
    return setTimeout(initPort.bind(null, retryCount), RETRY_TIMEOUT);
  }

  try {
    var tmp = chrome.runtime.connect({name:'content-script'});
    port = new PortWrapper(tmp);

    if (retryCount > 0) {
      console.info('[PORT] Reconnection Succeeded!');
    }

    port.addHandlers(handlers);

    port.disconnect(function _onDisconnect (event) {
      console.warn('[PORT] disconnected');
      retry(0);
    });
  } catch (ex) {
    retry();
  }
}

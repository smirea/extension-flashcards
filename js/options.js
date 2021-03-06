
var port = null;
var cards = ls.get('flashcards');

var $main;
var options = ls.get('options', {});

initPort();

$(function _init_options () {
  $main = $('#main');
  set_layout();
  add_events();
});

function add_events () {
  $(document).on('change', 'input, textarea, select', function (event) {
    if (!this.name) { return; }
    if (!$(this).hasClass('auto-complete')) { return; }

    if (this.type == 'checkbox') {
      setOption(this.name, this.checked);
      return;
    }

    setOption(this.name, $(this).val());
  });

  $('.sortable').on('sortupdate', function (event, ui) {
    var order = $(this).find('li').map(function () { return $(this).attr('value'); }).get();
    setOption($(this).attr('name'), order);
  });
}

function set_layout () {
  var card = cards[Math.floor(Math.random () * cards.length)];
  var exclude = ('category').split(' ');

  jqElement('a').
    attr({
      href: 'javascript:void(0)',
    }).
    addClass('show-cards').
    html('Click me to show some cards!').
    on('click', function () {
      port.post('getFlashcardSet');
      window.close();
    }).
    appendTo($main);

  addOption(
    'General',
    'A general set of options.',
    $().add(createCheckbox(
      'enabled',
      'Enable this extension - aka show cards once in a while.'
    )).add(createCheckbox(
      'disableGlobalHotkeys',
      'Disable global hotkeys (NOT RECOMMENDED, requires restart)'
    )).add(createSlider(
      'minDelay',
      'Minimum delay (in minutes) between every set of flashcards. ',
      {value:20, range:'min', min:1, max:2 * 60, step:1,}
    ).append(jqElement('output').html('m'))).add(createSlider(
      'setSize',
      'Number of flashcards to show in a set (one after the other)',
      {value:3, range:'min', min:1, max:20, step:1,}
    ).append(jqElement('output').html('cards')))
  ).addClass('display-block');

  addOption(
    'Timing',
    'Configure the time flashcards are shown and how the progressbar works.',
    $().add(createCheckbox(
        'progressDisabled',
        'Disable the timer entirely. Flashcards won\'t disappear unless manually closed.'
      )).add(createCheckbox(
        'progressHoverHide',
        'Clear the progressbar/timer when you move your mouse over the flashcard.'
      )).add(createSlider(
        'progressTime',
        'Time (in seconds) it takes before the flashcard disappears.',
        {value:10, range:'min', min:1, max:120, step:1} ).append(jqElement('output').html('s'))
      )
  ).addClass('display-block');

  // Future-proofing: get all keys used in the cards, excluding the exclude.
  var keys = {};
  for (var i=0; i<cards.length; ++i) {
    Object.keys(cards[i]).forEach(function (k) { keys[k] = true; });
  }
  keys = Object.keys(keys).filter(function (k) { return exclude.indexOf(k) == -1; });

  // Create layout options.
  var layoutKeys = getOption('layout');
  addOption(
    'Layout',
    'The order of all the elements in the flash card. <br />' +
      'Drag stuff around to re-order. <br />' +
      'Drag elements from one list to the either to have then show or not on the flashcards.',
    $().
      add(createList('layout', layoutKeys, card, 'Visible Elements:').addClass('layout-connected')).
      add(createList(
        'layoutDisabled',
        keys.filter(function (k) { return layoutKeys.indexOf(k) == -1 && options.privateKeyNames.indexOf(k) == -1; }),
        card,
        'Hidden elements:'
      ).addClass('layout-connected'))
  ).find('.sortable').sortable('option', 'connectWith', '.layout-connected');

  // Create Display Order options.
  addOption(
    'Display Order',
    'The order in which each of the elements (hints) will be displayed. <br />' +
      'By default, only the first visible element in this list is shown initially. <br />' +
      'If elements are not visible (see Layout section), then they will be skipped here.',
    createList('displayOrder', keys, card)
  );

  addOption(
    'Add New Flashcards',
    'You can easily add your own flashcards by adding the JSON to the field on the right. <br />' +
      'These are saved locally and you can download them anytime. <br />' +
      'For now, the format has to be JSON. <br />' +
      'Check the <a href="https://github.com/smirea/extension-flashcards" target="_blank">' +
      'github page</a> for more info on how the simple format should look like.',
    jqElement('div').attr({id:'placeholder'})
  ).find('#placeholder').parent().addClass('add-section').html(createAddSection());

  // Create Flashcard Sets options.

  var categories = {};
  cards.forEach(function (card) {
    categories[card.category] = categories[card.category] || [];
    categories[card.category].push(card);
  });

  var $cards = $();
  for (var name in categories) {
    var $cardList = jqElement('ul').addClass('card-list');

    // Add mini-flashcards to the category.
    for (var i=0; i<categories[name].length; ++i) {
      var card = categories[name][i];
      $cardList.append(
        createSelectable(
          'li',
          createCardCheckbox(card, card.Romaji, true),
          card.Romaji,
          card.English
        )
      );
    }

    var id = 'category-' + name.replace(/\s+/g, '-');
    var $title = jqElement('label');
    var $cbx = $cardList.find('input[type="checkbox"]');

    $title.
      attr({'for':id}).
      addClass('card-list-title').
      html(name + ' <span class="title-info">(' + categories[name].length + ' cards)</span>').
      prepend(
        jqElement('input').
          attr({id:id, type:'checkbox', checked:'checked'}).
          data('target', $cbx).
          on('change', function (event) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            $(this).data('target').trigger('set-checked', [this.checked]);
          })
      );

    // Uncheck the title checkbox when all the checkboxes are not checked.
    (function ($checkboxes, $target) {
      $checkboxes.on('change', function (event) {
        for (var i=0; i<$checkboxes.length; ++i) {
          if ($checkboxes[i].checked) {
            $target[0].checked = true;
            return;
          }
        }
        $target[0].checked = false;
      });
    })($cbx, $title.find('input[type="checkbox"]'));

    $cards = $cards.add($title).add($cardList);
  }

  addOption(
    'Flashcard Sets',
    'These are all the cards that you have stored. You can check/uncheck each one to have it show or not',
    $cards.disableSelection(),
    true
  );

  addOption(
    'About', 'General information about this extension.',
    jqElement('div').append(
      'I developed this extension to better help me learn and remember the Japanese ' +
      'words used in the <a href="http://www.japanesethroughanime.com" target="_blank">' +
      'Japanese Through Anime</a> ' +
      'course taught by Ken Cannon, which is awesome and you should definitely check it out. ' +
      '<hr /> You can view the full project on my ' +
      '<a href="https://github.com/smirea/extension-flashcards" target="_blank">GitHub page</a>. ' +
      '(if you want to contribute, be my guest or send me an email)' +
      '<hr /> If you like it, please go ahead and give it a review on ' +
      '<a href="https://chrome.google.com/webstore/detail/japanese-flashcards/ncjogmjihmibakogjjahbpdpgdfdmogd" '+
      'target="_blank">its Chrome Web Store page</a>.' +
      '<hr> For bugs/inquiries either send me an email at: ' +
      '<a href="mailto:steven.mirea@gmail.com">steven.mirea@gmail.com</a> ' +
      'or even better <a href="https://github.com/smirea/extension-flashcards/issues" target="_blank"> ' +
      'post a new GitHub issue</a> and I\'ll can get back to you as soon as I can.'
    )
  );

  // Add values to all .auto-complete fields.
  $('.auto-complete').each(function () {
    if (!this.name) {
      console.warn('No name for .auto-complete ... bad idea!', this);
      return;
    }

    var $this = $(this);

    if (!(this.name in options)) {
      console.warn('No value for %s in options:', this.name, options);
      return;
    }

    if ($this.is('input[type="checkbox"]')) {
      this.checked = options[this.name];
    } else {
      $this.val(options[this.name]);
    }

    $this.trigger('change');
  });

  // Also add the exclude ones.
  for (var __id in options.exclude) {
    var cbx = $cards.find('.cardCheckbox input[type="checkbox"]#card-' + __id);
    cbx.trigger('set-checked', [false]);
  }
}

/**
 * Creates a jQuery slider
 * @param  {String} name
 * @param  {String} label
 * @param  {Object} options
 * @return {jQuery}
 */
function createSlider (name, label, options) {
  var $wrapper = jqElement('span');
  var $input = jqElement('input').attr({type:'text', name:name, readonly:true}).addClass('auto-complete');
  var $output = jqElement('output');
  var opt = $.extend({}, options, {
    slide: function (event, ui) {
      $output.html(ui.value);
      $input.val(ui.value).trigger('change');
    }
  });
  $wrapper.slider(opt);
  $output.val($wrapper.slider('value'))
  $input.
    val($wrapper.slider('value')).
    addClass('auto-complete').
    trigger('change').
    hide().
    on('change', function (event) {
      var val = $(this).val();
      if ($wrapper.slider('value') == val) { return; }
      $wrapper.slider('value', val);
      $output.html(val);
    });

  var $label = addLabel(label, $wrapper, true).append($input);
  $output.insertAfter($wrapper);
  return $label;
}

/**
 * Appends the element into a label.
 * @param {String} label
 * @param {jQuery} $elem
 * @param {Boolean} prepend
 * @return {jQUery}
 */
function addLabel (label, $elem, prepend) {
  var id = $elem.attr('id') || 'random-id-' + name + '-' + Math.floor(Math.random() * 100000);
  $elem.attr('id', id);
  return jqElement('label').
          attr({'for':id}).
          addClass('for-' + $elem[0].tagName.toLowerCase()).
          append($elem)[(prepend ? 'prepend' : 'append')](label);
}

/**
 * Creates a plain auto-complete checkbox with a label.
 * @param  {String} name
 * @param  {String} label
 * @return {jQuery}
 */
function createCheckbox (name, label) {
  return addLabel(
    label,
    jqElement('input').addClass('auto-complete').attr({type:'checkbox', name:name})
  );
}

/**
 * Creates a selectable element (checkbox-like).
 * @param  {String} tag  The wrapper container tag
 * @param  {jQUery} $content
 * @param  {String} block1
 * @param  {String} block2
 * @return {jQuery}
 */
function createSelectable (tag, $content, block1, block2) {
  tag = tag || 'span';
  return jqElement(tag).append(
    (block1 ? jqElement('span').addClass('block').html(block1) : $()),
    (block2 ? jqElement('span').addClass('block').html(block2) : $()),
    $content
  );
}

/**
 * Returns a jQuery ready checkbox button.
 * @param  {Object} card It must contain the __id property.
 * @param  {String} value
 * @param  {Boolean} checked
 * @return {jQuery}
 */
function createCardCheckbox (card, value, checked) {
  value = value || 'on';
  checked = !!checked;

  var id = 'card-' + card.__id;
  var $checkbox = jqElement('input');
  var $wrapper = jqElement('label');

  var addClass = function (checked) {
    if (checked) {
      $wrapper.addClass('checked');
    } else {
      $wrapper.removeClass('checked');
    }
  };

  $checkbox.attr({
      type: 'checkbox',
      id: id,
      value: value,
      name: 'card-' + card.__id,
    }).
    prop('checked', checked).
    on('set-checked', function (event, value) {
      this.checked = value;
      addClass(value);
      $checkbox.trigger('change');
    }).on('change', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (this.checked) {
        delete options.exclude[card.__id];
      } else {
        options.exclude[card.__id] = true;
      }
      saveOptions();
    });

  $wrapper.attr({'for':id}).
    addClass('cardCheckbox').
    append($checkbox).
    on('click', function (event) {
      addClass($checkbox[0].checked);
    });

  addClass(checked);

  return $wrapper;
}

/**
 * Creates and appends the option to the DOM.
 * @see createOption
 */
function addOption () {
  return createOption.apply(null, cloneArray(arguments)).appendTo($main);
}

/**
 * Creates an option category.
 * @param  {Strgin} title
 * @param  {String} description
 * @param  {jQuery} $content
 * @param  {Boolean} oneColumn
 * @return {jQuery}
 */
function createOption (title, description, $content, oneColumn) {
  var $title = !title ? $() : jqElement('div').addClass('title').html(title);
  var $des = !description ? $() : jqElement('div').addClass('description').html(description);

  title = title || 'random-title-' + Math.floor(Math.random() * 1000000);
  var nameClass = 'name-' + title.trim().toLowerCase().replace(/\s+/g, '-');

  return jqElement('div').addClass('option clearfix ' + nameClass).append(
    jqElement('div').addClass('details ' + (oneColumn ? 'one-column' : '')).append($title, $des),
    jqElement('div').addClass('content').append($content)
  );
}

/**
 * @param  {String} name
 * @param  {Array} keys
 * @param  {Object} map
 * @param  {String} title Optional. Header of the list.
 * @param  {Object} options Optional. Extra options to pass/overwrite to the $.sortable().
 * @return {jQuery}
 */
function createList (name, keys, map, title, options) {
  var order = getOption(name, []);
  var $wrapper = jqElement('ul').addClass('sortable').attr({name:name, id:name});

  var make = function (key) {
    return jqElement('li').
        attr({value:key}).
        addClass('jfc-' + key).
        html( '<span class="utf8-icon">⬍</span>' +
              '<span class="key">' + key + ':</span>' +
              '<span class="value">' + (key in map ? map[key] : '⌦') + '</span>' );
  }

  for (var i=0; i<order.length; ++i) { $wrapper.append(make(order[i])); }

  for (var i=0; i<keys.length; ++i) {
    if (order.indexOf(keys[i]) > -1) { continue; }
    $wrapper.append(make(keys[i]));
  }

  var opt = $.extend({
    placeholder: 'sort-placeholder',
    items: '> li',
    forcePlaceholderSize: true,
    revert: true,
  }, options);

  $wrapper.sortable(opt).disableSelection();

  if (title && title.length > 0) {
    $wrapper.prepend(jqElement('div').addClass('list-title').html(title));
  }

  return $wrapper;
}

function createAddSection () {
  var defaultCategory = 'Default';

  var $textarea = jqElement('textarea');
  var $result = jqElement('div');

  var error = function (str) { $result.append(jqElement('div').addClass('msg error').html(str)); };
  var warn = function (str) { $result.append(jqElement('div').addClass('msg warn').html(str)); };

  var makeToggle = function (title, elements) {
    var $content = jqElement('ul').addClass('target');

    for (var i=0; i<elements.length; ++i) {
      $content.append(jqElement('li').append(jqElement('pre').append(JSON5.stringify(elements[i]))));
    }

    return jqElement('div').addClass('toggle').append(
      jqElement('div').addClass('title').html(title).disableSelection().on('click', function () {
        $(this).parent().toggleClass('visible');
      }),
      $content
    );
  };

  var oldText = null;
  $textarea.on('keyup', function (event) {
    if ($textarea.val() == oldText) { return; }
    oldText = $textarea.val();

    $result.empty();

    var json;
    try { json = JSON5.parse($textarea.val()); } catch (ex) {
      error('Invalid format: ' + ex);
      return;
    }

    if (!Array.isArray(json)) {
      if (typeof json != 'object') {
        error('You must pass in an Array or an Object');
        return;
      }
      json = [json];
    }

    var newCards = {};
    for (var i=0; i<json.length; ++i) {
      var card = json[i];
      if (!('category' in card)) {
        warn('Missing category for #' + (i+1) +', set to: ' + defaultCategory);
        card.category = defaultCategory;
      }
      var categ = card.category;
      delete card.category;
      newCards[categ] = newCards[categ] || [];
      newCards[categ].push(card);
    }

    $result.append(
      jqElement('input').
        attr({type:'button', value:'Ok, cool, add these flashcards!'}).
        on('click', function (event) {
          var c = $.extend({}, newCards);
          for (var name in c) {
            for (var i=0; i<c[name].length; ++i) {
              c[name][i].category = name;
              cards.push(c[name][i]);
            }
          }
          saveFlashcards(true, cards);
          $textarea.val('');
          $result.empty();
          backgroundOptionsRefreshed();
          window.location.reload();
        })
    );

    for (var name in newCards) {
      $result.append(makeToggle(name + ': ' + newCards[name].length + ' cards', newCards[name]));
    }
  });

  return $textarea.add($result);
}

/**
 * Get an option.
 * @param  {String} name
 * @param  {Mixed} defaultValue If no such options exists, return the default value;
 * @return {Mixed}
 */
function getOption (name, defaultValue) {
  return name in options ? options[name] : defaultValue;
}

/**
 * Set an option and save the options.
 * @param {String} name
 * @param {Mixed} value
 */
function setOption (name, value) {
  options[name] = value;
  return saveOptions();
}

/**
 * Caches the options object to localStorage and notifies the background page to refresh.
 */
function saveOptions () {
  ls.set('options', options);
  backgroundOptionsRefreshed();
}

/**
 * Tells the background page that the options have been refreshed.
 */
function backgroundOptionsRefreshed () {
  port.post('refreshOptions');
}

function initPort (retryCount) {
  // If a port disconnects, how many times to retry reconnecting.
  var MAX_RETRIES = 10;

  // Timeout between every retry.
  var RETRY_TIMEOUT = 1 * 1000;

  // To initiate a retry sequence, start from retryCount = 1;
  retryCount = retryCount || 0;

  var handlers = {
    refreshOptions: function () {
      console.warn('I should not be getting this.');
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
    var tmp = chrome.runtime.connect({name:'options'});
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


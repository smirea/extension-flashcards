
var port = null;
var cards = ls.get('flashcards');

var $main;
var options = ls.get('options', {});

init_port();

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
        {value:5, range:'min', min:5, max:120, step:5} ).append(jqElement('output').html('s'))
      )
  ).addClass('display-block');

  // Future-proofing: get all keys used in the cards, excluding the exclude.
  var keys = {};
  for (var i=0; i<cards.length; ++i) {
    Object.keys(cards[i]).forEach(function (k) { keys[k] = true; });
  }
  keys = Object.keys(keys).filter(function (k) { return exclude.indexOf(k) == -1; });

  addOption(
     'Layout',
    'The order of all the elements in the flash card. <br />Drag stuff around to re-order.',
    createList('layout', keys, card)
  );

  addOption(
    'Display Order',
    'The order in which each of the elements (hints) will be displayed. <br />By default, only the first element in this list is visible initially.',
    createList('displayOrder', keys, card)
  );

  var categories = {};
  cards.forEach(function (card) {
    categories[card.category] = categories[card.category] || [];
    categories[card.category].push(card);
  });

  var $cards = $();
  for (var name in categories) {
    var $cardList = jqElement('ul').addClass('card-list');

    for (var i=0; i<categories[name].length; ++i) {
      var card = categories[name][i];
      $cardList.append(
        createSelectable(
          'li',
          createCardCheckbox(card.Japanese, name, card.Japanese, true),
          card.Japanese,
          card.English
        )
      );
    }

    var id = 'category-' + name.replace(/\s+/g, '-');
    var $title = jqElement('label').attr({'for':id}).addClass('card-list-title').html(name);
    var $cbx = $cardList.find('input[type="checkbox"]');

    $title.prepend(
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
    'Card List',
    'These are all the cards that you have stored. You can check/uncheck each one to have it show or not',
    $cards.disableSelection(),
    true
  );

  $('.sortable').sortable({
    placeholder: 'sort-placeholder',
    forcePlaceholderSize: true,
    revert: true,
  }).disableSelection().each(function () {
    $(this).css({height: $(this).height()});
  });

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
  for (var info in options.exclude) {
    var arr = info.split('|');
    var cbx = $cards.find('.cardCheckbox input[type="checkbox"][name="' + arr[1] + '"][category="' + arr[0] + '"]');
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
 * @param  {String} name
 * @param  {String} category
 * @param  {String} value
 * @param  {Boolean} checked
 * @return {jQuery}
 */
function createCardCheckbox (name, category, value, checked) {
  value = value || 'on';
  checked = !!checked;

  var id = 'random-id-' + name + '-' + Math.floor(Math.random() * 100000);
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
      type:'checkbox',
      id:id,
      value:value,
      name:name,
      category:category,
    }).
    prop('checked', checked).
    on('set-checked', function (event, value) {
      this.checked = value;
      addClass(value);
      $checkbox.trigger('change');
    }).on('change', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var id = hashFlashcard({Japanese:name, category:category});
      if (this.checked) {
        delete options.exclude[id];
      } else {
        options.exclude[id] = true;
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
  var nameClass = 'name-' + title.trim().toLowerCase().replace(/\s+/g, '-');
  return jqElement('div').addClass('option clearfix ' + nameClass).append(
    jqElement('div').addClass('details ' + (oneColumn ? 'one-column' : '')).append(
      jqElement('div').addClass('title').html(title),
      jqElement('div').addClass('description').html(description)
    ),
    jqElement('div').addClass('content').append($content)
  );
}

/**
 * @param  {String} description
 * @param  {Array} keys
 * @param  {Object} map
 * @return {jQuery}
 */
function createList (name, keys, map) {
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

  return $wrapper;
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
  port.post('refreshOptions');
}

function init_port () {
  var handlers = {
    // Utils.
    echo : function _echoClient (message) {
      console.log('[PORT]', message.content);
    }
  };

  port = new PortWrapper(chrome.extension.connect({name: 'options'}));

  port.addHandlers(handlers);

  port.disconnect(function _onDisconnect (event) {
    console.warn('[PORT] disconnected');
  });
}

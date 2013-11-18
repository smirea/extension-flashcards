/**
 * Click-to-Scrape
 * Designed and developed by Stefan Mirea
 *
 * @author Stefan Mirea <steven.mirea@gmail.com>
 */

var PortWrapper = (function () {

  var defaultOptions = {
    // Which of the log functions to use. Default = ALL
    // 1 - error, 2 - warn, 3 - info, 4 - log
    logLevel: 4,
  };

  return function PortWrapper (port, options) {
    options = options || {};

    var opt = extendObject({}, defaultOptions, options);
    var that = this;

    extendObject(that, {
      error:  opt.logLevel && opt.logLevel >= 1 ? getLogger('error') : function () {},
      warn:   opt.logLevel && opt.logLevel >= 2 ? getLogger('warn') : function () {},
      info:   opt.logLevel && opt.logLevel >= 3 ? getLogger('info') : function () {},
      log:    opt.logLevel && opt.logLevel >= 4 ? getLogger('log') : function () {},
    });

    if (!port) {
      that.warn('[PortWrapper] Invalid port', port);
      return null;
    }

    var handlers = {};
    var callbacks = {};
    var allowedPostHandlers = null;

    /**
     * Special collection of private handlers.
     * If a message's action can't be found in here,
     *    it is then tries to look for a handler in the `handlers` object
     * NOTE: the prefix `::` is reserved for the protocol handlers
     *          and WILL NOT be valid for normal handlers
     */
    var protocolHandlers = {
      '::getHandlers': function (message) {
        message.callback(Object.keys(handlers), Object.keys(protocolHandlers));
      },
      '::callback': function (message) {
        if (callbacks[message.id]) {
          callbacks[message.id].apply(that, message.arguments);
          delete callbacks[message.id];
        } else {
          that.warn('[PortWrapper.onMessage::callback] Unknown callback ' +
                      'key of `' + message.id + '`'
          );
        }
      },
    };

    var onMessageListener = function _onMessage (message) {
      if (!message.action) {
        that.warn('[PortWrapper] Message contains no action', message);
        return;
      }

      if (message['::callback']) {
        var callbackData = message['::callback'];
        delete message['::callback'];
        message.callback = function () {
          that.post('::callback', {
            id: callbackData.id,
            arguments: copyArray(arguments)
          });
        };
      }

      if(protocolHandlers[message.action]) {
        protocolHandlers[message.action].apply(that, arguments);
        return;
      }

      if (!handlers[message.action]) {
        that.warn('[PortWrapper] No handlers defined for: ', message.action);
        return;
      }

      handlers[message.action].apply(that, arguments);
    };

    extendObject(that, {
      originalPort: port,
      name: port.name,
      sender: port.sender,
      getMessageHandler: function () {
        return onMessageListener;
      },
      setMessageHandler: function (fn) {
        if (!(fn instanceof Function)) {
          that.warn('[PostWrapper.setMessageHandler] Arg not function', fn);
          return null;
        }
        that.getEvent('onMessage').removeListener(onMessageListener);
        onMessageListener = fn;
        that.getEvent('onMessage').addListener(fn);
      },
      addHandlers: function (map) {
        if (!map || map.constructor !== Object) {
          that.warn('[PortWrapper.addHandlers] Invalid argument', map);
          return null;
        }
        for (var name in map) {
          if (/^::/.test(name)) {
            that.info('[PortWrapper.addHandlers] The prefix `::` is reserved' +
                          ' for protocol communication. Rename your handler'
            );
            return null;
          }
        }
        extendObject(handlers, map);
      },
      setAllowedPostHandlers: function setAllowedPostHandlers (allowHandlers) {
        allowedPostHandlers = {};
        for (var i=0; i<allowHandlers.length; ++i) {
          allowedPostHandlers[allowHandlers[i]] = true;
        }
        that.info('[PortWrapper] Allowed post handlers:', allowHandlers);
      },
      getHandlers: function () {
        return handlers;
      },
      post: function (action, message) {
        if (typeof action !== 'string') {
          that.warn('[PortWrapper.send] Invalid action', arguments);
          return null;
        }

        if (allowedPostHandlers &&  // if using allowed post handlers
            !/^::/.test(action) &&  // if it is not a protocol message
            !allowedPostHandlers[action]  // does not have a handler
        ) {
          that.warn('[PortWrapper.send] Receiver does not have a handler for `%s`, allowed: %s ',
                    action, Object.keys(allowedPostHandlers).join(', ')
          );
          return null;
        }
        message = message ? copyObject(message) : {};
        message.action = action;
        if (message.callback) {
          var callback_id = (function _getCallbackID () {
            var id = Math.floor(Math.random() * 1000000000);
            return callbacks[id] ? _getCallbackID() : id;
          })();
          callbacks[callback_id] = message.callback;
          message['::callback'] = {
            id: callback_id
          };
          delete message.callback;
        }

        port.postMessage(message);
      },
      postMessage: function () {
        that.warn('[PortWrapper.postMessage] DEPRECATED.'+
                      ' Use .post() instead.');
        return null;
      },
      message: function () {
        that.warn('[PortWrapper.message] DEPRECATED.'+
                      ' Register handlers instead.');
        port.onMessage.addListener.apply(port.onMessage, arguments);
      },
      disconnect: function () {
        port.onDisconnect.addListener.apply(port.onDisconnect, arguments);
      },
      getEvent: function (name) {
        var events = {
          onDisconnect : port.onDisconnect,
          onMessage: port.onMessage
        };
        if (!events[name]) {
          that.warn('[PortWrapper.getEvent] Invalid event', arguments);
          return null;
        }
        return events[name];
      }
    });

    // setup custom messaging system
    that.getEvent('onMessage').addListener(onMessageListener);
    that.post('::getHandlers', {callback: function (normal, protocol) {
      that.setAllowedPostHandlers(normal);
    }});
  };

  function getLogger (type) {
    return function portLogger () {
      var args = copyArray(arguments);
      args.unshift('[PortWrapper]');
      console[type].apply(console, arguments);
    };
  }

  /**
   * Extend an object by copying the attributes of other multiple objects into it.
   * @param  {Object} obj
   * @param  {Object} attributes1, attributes2 ....
   * @return {Object} Returns back the original object with the alterations.
   */
  function extendObject (obj, attributes) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    for (var i=1; i<arguments.length; ++i) {
      for (var name in arguments[i]) {
        obj[name] = arguments[i][name];
      }
    }

    return obj;
  }

  function copyObject (obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    var result = {};
    for (var key in obj) {
      result[key] = obj[key];
    }
    return result;
  }

  function copyArray (arr) {
    if (arr === undefined || arr === null) {
      return arr;
    }
    return Array.prototype.slice.call(arr);
  }
})();

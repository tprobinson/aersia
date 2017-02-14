'use strict';
import Logger from 'js-logger';

// Need global dev variable support

// Init logger
Logger.useDefaults({
  logLevel: Logger.WARN,
  formatter: function (messages, context) {
    messages.unshift('[Aersia]');
    if (context.name) {messages.unshift('[' + context.name + ']');}
  }
});

if( this.development === 1 || this.development === '1' ) {
  Logger.get('internals').setLevel(Logger.INFO);
  Logger.get('player').setLevel(Logger.INFO);
  Logger.get('animation').setLevel(Logger.ERROR);
  Logger.get('songart').setLevel(Logger.WARNING);
} else {
  Logger.get('internals').setLevel(Logger.ERROR);
  Logger.get('player').setLevel(Logger.ERROR);
  Logger.get('animation').setLevel(Logger.ERROR);
  Logger.get('songart').setLevel(Logger.ERROR);
}

export default Logger;

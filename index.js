'use strict';

/**
 * @file
 * Gulp SASS inject module.
 *
 * Inspiration and basic parts of this code are taken from
 * https://github.com/giowe/gulp-sass-vars.
 */

const Stream = require('readable-stream');
const StreamQueue = require('streamqueue');

function getStreamFromBuffer(string) {
  const stream = new Stream.Readable();
  stream._read = function() {
    stream.push(new Buffer(string));
    stream._read = stream.push.bind(stream, null);
  };
  return stream;
}

/**
 * Check if object is empty. Object is empty if its not an object, its null
 * or is empty object.
 *
 * @param {object} obj
 * @return {boolean} true if object is empty or false if not.
 */
var isObjEmpty = function (obj) {
  return typeof obj !== 'object' || obj === null || !Object.keys(obj).length;
};

/**
 * Transform object to SASS map string representation.
 *
 * @param object mapObject
 * @return {string}
 */
var transformToSASSMap = function(mapObject) {
  var map = ['('];

  Object.keys(mapObject).map((key) => {
    // @todo - add indentitation with depth info.
    var element = key + ": ";
    if (typeof mapObject[key] == 'object') {
      element += transformToSASSMap(mapObject[key]);
    }
    else {
      element += mapObject[key];
    }
    element += ",";

    map.push(element);
  });

  map.push(')');
  return map.join('\n');
}

/**
 * Create SASS variable from name and passed value.
 *
 * @param name
 * @param value
 * @return {string}
 */
var transformToSASS = function (name, value) {
  if (typeof value === 'object') {
    value = transformToSASSMap(value);
  }
  return '$' + name + ': ' + value + ';'
};

module.exports = function (options) {
  const sassVars = [];
  var prepend;
  //var filesCount = options.files.length;

  // Construct sass vars string for injection.
  if (!isObjEmpty(options.variables)) {
    Object.keys(options.variables).map((key) => {
      var sassVar = transformToSASS(key, options.variables[key]);
      sassVars.push(sassVar);
    });
    prepend = sassVars.join('\n');
  }

  const stream = new Stream.Transform({objectMode: true});
  stream._transform = function(file, enc, cb) {
    // Check should we inject in current file.
    // @todo - for some reasons this does not work. Vars are injected properly
    // into target scss but sass compilation fails with Error: Undefined
    // variable.
    // In the same time if we inject into all files it will work???
    // So commenting this for now and we can try to figure later.
    // if (filesCount > 0) {
    //   var inject = false;
    //   for (var i = 0; i < filesCount; ++i) {
    //     if (file.path.indexOf(options.files[i]) !== -1) {
    //       inject = true;
    //       break;
    //     }
    //   }
    //   if (!inject) {
    //     return cb(null, file);
    //   }
    // }

    if (file.isNull() || sassVars.length === 0) {
      return cb(null, file);
    }

    const prependedBuffer = new Buffer(prepend);
    if (file.isStream()) {
      file.contents = new StreamQueue(getStreamFromBuffer(prependedBuffer), file.contents);
      return cb(null, file);
    }

    file.contents = Buffer.concat([prependedBuffer, file.contents],
      prependedBuffer.length + file.contents.length);
    cb(null, file);
  };

  return stream;
};

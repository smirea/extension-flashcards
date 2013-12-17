/*global module:false*/

var fs = require('fs');

module.exports = function(grunt) {

  var pkg = grunt.file.readJSON('package.json');

  var chromeExtensionExclude = [
    // Extensions:
    '*.sublime-*',
    '*.zip',

    // Folders:
    'web-store',
    'txt',

    // Individual Files:
    'Gruntfile.js',
    'package.json',
    'parse-flashcards.js',
    'japanese-verb-conjugat*.js*',
    'kana*.js*',
  ];
  var isIgnored = isIgnoredParser('.gitignore', chromeExtensionExclude);

  // Project configuration.
  grunt.initConfig({
    pkg: pkg,
    gruntfile: {
      src: 'Gruntfile.js'
    },
    zip: {
      'chrome-extension': {
        src: '**',
        dest: 'chrome-extension.zip',
        router: function (filepath) {
          if (isIgnored(filepath)) {
            // grunt.log.writeln('Excluding %s', filepath);
            return false;
          }
          // grunt.log.oklns('zip: %s', filepath);
          return filepath;
        },
      }
    },
  });

  grunt.loadNpmTasks('grunt-zip');

  // Default task.
  grunt.registerTask('default', ['zip']);

  // Helper functions

  function isIgnoredParser (file, extraRules) {
    file = file || '.gitignore';
    extraRules = extraRules || [];

    var RelPathSpec = require('pathspec').RelPathList;
    var rules = [];

    try {
      rules = fs.readFileSync(file).toString();
      rules = rules.split('\n').map(function (line) { return line.trim(); });
    } catch (ex) {
      grunt.log.writeln('No ignore file `' + file + '` found!');
    }

    rules = rules.concat(extraRules);

    if (!rules || rules.length <= 0) {
      grunt.log.writeln('No ignore rules found!');
      return function () { return true; };
    }

    var list = require('pathspec').RelPathList.parse(rules);

    return function (path) { return list.matches(path); };
  }

};
module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    nodeunit: {
      dev: [ 'tests/**/*_tests.js' ]
    },
    jslint: {
      dev: {
        src: [ 'server.js', 'lib/**/*.js' ],
        exclude: [ 'lib/**/views/*.js' ],
        directives: {
          indent: 2
        }
      }
    },
    sass: {
      options: {
        includePaths: []
      },
      dev: {
        options: {
          outputStyle: 'compressed'
        },
        files: {
          'assets/css/site.css': 'scss/site.scss',
          'assets/css/pure.css': 'scss/pure.css'
        }
      }
    },
    handlebars: {
      compile: {
        options: {
          node: true,
          namespace: 'leslie',
          processName: function (path) {
            'use strict';
            return path.replace(/\.hbs$/, '').replace(/^hbs/, 'lib');
          }
        },
        files: {
          'lib/pages/views/get.js': [ 'hbs/pages/views/get.hbs', 'hbs/partials/*.hbs' ],
          'lib/footer/views/get.js': [ 'hbs/footer/views/get.hbs', 'hbs/partials/*.hbs' ],
          'lib/header/views/get.js': [ 'hbs/header/views/get.hbs', 'hbs/partials/*.hbs' ],
          'lib/menu/views/get.js': [ 'hbs/menu/views/get.hbs', 'hbs/partials/*.hbs' ]
        }
      }
    },
    clean: {
      all: {
        src: [
          'assets/css',
          'lib/pages/views',
          'lib/menu/views',
          'lib/header/views',
          'lib/footer/views'
        ]
      }
    },
    watch: {
      test: {
        files: [ 'tests/**/*_test.js', 'lib/**/*.js' ],
        tasks: [ 'nodeunit:dev' ]
      },
      lint: {
        files: [ 'server.js', 'lib/**/*.js' ],
        tasks: [ 'jslint:dev' ]
      },
      sass: {
        files: 'scss/*.scss',
        tasks: [ 'sass:dev' ]
      },
      handlebars: {
        files: 'hbs/**/*.hbs',
        tasks: [ 'handlebars:compile' ]
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-handlebars');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-jslint');
  grunt.loadNpmTasks('grunt-sass');

  grunt.registerTask('purge', [ 'clean:all' ]);
  grunt.registerTask('dev', [ 'handlebars:compile', 'sass:dev', 'nodeunit:dev', 'jslint:dev', 'watch' ]);
  grunt.registerTask('default', [ 'purge' ]);
};

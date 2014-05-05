module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    nodeunit: {
      dev: [ 'tests/**/*_tests.js' ]
    },
    jslint: {
      dev: {
        src: [ 'server.js', 'lib/**/*.js', 'assets/scripts/site.js' ],
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
          sourceComments: 'normal'
        },
        files: {
          'assets/css/site.css': 'scss/site.scss',
          'assets/css/pure.css': 'scss/pure.css',
          'assets/css/grids-responsive-old-ie.css': 'scss/grids-responsive-old-ie.css',
          'assets/css/grids-responsive.css': 'scss/grids-responsive.css',
          'assets/themes/leather/theme.css': 'scss/themes/leather/theme.scss'
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
          'lib/dashboard/views/get.js': [ 'hbs/dashboard/views/get.hbs', 'hbs/partials/*.hbs' ],
          'lib/pages/views/get.js': [ 'hbs/pages/views/get.hbs', 'hbs/partials/*.hbs' ],
          'lib/footer/views/get.js': [ 'hbs/footer/views/get.hbs', 'hbs/partials/*.hbs' ],
          'lib/header/views/get.js': [ 'hbs/header/views/get.hbs', 'hbs/partials/*.hbs' ],
          'lib/member-menu/views/get.js': [ 'hbs/member-menu/views/get.hbs', 'hbs/partials/*.hbs' ],
          'lib/menu/views/get.js': [ 'hbs/menu/views/get.hbs', 'hbs/partials/*.hbs' ],
          'lib/discussion/views/get.js': [ 'hbs/discussion/views/get.hbs', 'hbs/partials/*.hbs' ],
          'lib/event/views/get.js': [ 'hbs/event/views/get.hbs', 'hbs/partials/*.hbs' ],
          'lib/member/views/get.js': [ 'hbs/member/views/get.hbs', 'hbs/partials/*.hbs' ],
          'lib/member/views/one.js': [ 'hbs/member/views/one.hbs', 'hbs/partials/*.hbs' ],
          'lib/newsletter/views/get.js': [ 'hbs/newsletter/views/get.hbs', 'hbs/partials/*.hbs' ],
          'lib/session/views/get.js': [ 'hbs/session/views/get.hbs', 'hbs/partials/*.hbs' ]
        }
      }
    },
    clean: {
      all: {
        src: [
          'assets/css',
          'lib/**/views'
        ]
      }
    },
    watch: {
      test: {
        files: [ 'tests/**/*_test.js', 'lib/**/*.js' ],
        tasks: [ 'nodeunit:dev' ]
      },
      lint: {
        files: [ 'server.js', 'lib/**/*.js', 'assets/scripts/site.js' ],
        tasks: [ 'jslint:dev' ]
      },
      sass: {
        files: [ 'scss/**/*.scss', 'scss/**/*.css' ],
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
  grunt.registerTask('dev', [ 'build', 'nodeunit:dev', 'jslint:dev', 'watch' ]);
  grunt.registerTask('build', [ 'handlebars:compile', 'sass:dev' ]);
  grunt.registerTask('default', [ 'purge' ]);
};

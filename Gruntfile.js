/* jshint
	maxerr:1000, eqeqeq: true, eqnull: false, unused: false, loopfunc: true
*/
/* jshint -W116 */

module.exports = function(grunt) {
  // Load NPM Tasks
  // https://github.com/shootaroo/jit-grunt
  require('jit-grunt')(grunt);

  var config = grunt.file.readJSON( 'config/'+ (grunt.option('env') || 'default') +'.json' );
  var pkg = grunt.file.readJSON( 'package.json' );
  var development = 0;

  var dirs = {
      output: "dist/",
      generated: "generated/",
  };

  grunt.template.addDelimiters('html-comments-delimiters', '<!--%', '-->');
  grunt.template.addDelimiters('php-comments-delimiters', '/*%', '*/');
  grunt.initConfig({
    // Copied from Bootstrap
    banner: '/*!\n' +
            ' * '+ pkg.friendlyname +' v'+ pkg.version +'\n' +
            ' * This file is compiled using Grunt.\n' +
            ' */\n',
    jqueryCheck: 'if (typeof jQuery === \'undefined\') { throw new Error(\'This requires jQuery\') }\n\n',

    dirs: dirs, //this is stupid.

    // == Grunt Dev Update
    // https://npmjs.org/package/grunt-dev-update
    // http://pgilad.github.io/grunt-dev-update
    devUpdate: {
      main: {
        options: {
          reportUpdated: false, // Report updated dependencies: 'false' | 'true'
          updateType   : "force" // 'force'|'report'|'prompt'
        }
      }
    },

    watch: {
	  scss: {
		files: ['scss/**/*.scss'],
		tasks: ['scss:build']
	  },
	  css: {
		files: [
            'node_modules/normalize.css/normalize.css',
            'css/topcoat-desktop-dark.css',
            'css/effeckt.css',
            'css/boilerplate.css',
            '<%= dirs.generated %>simptip.css',
            'node_modules/perfect-scrollbar/dist/css/perfect-scrollbar.css',
            'css/custom.css'
        ],
		tasks: ['css']
	  },
	  js: {
		files: ['js/modules/*.js','node_modules/desandro-classie/classie.js'],
		tasks: ['concat:js','copy:js']
	  },
	  mainjs: {
		files: [
            'js/main.js',
            'node_modules/angular/angular.js',
            'node_modules/x2js/x2js.js',
            'node_modules/perfect-scrollbar/dist/js/perfect-scrollbar.js'
        ],
		tasks: ['copy:mainjs']
	  },
	  html: {
		files: ['html/**/*.html'],
		tasks: 'template-html'
	  },
      php: {
		files: ['html/**/*.php'],
		tasks: 'template-php'
	  },
      root: {
		files: ['files/**/*.xml','files/**/*.txt','files/**/*.ico'],
		tasks: 'copy:root'
	  },
      svgs: {
		files: ['icons/*.svg'],
		tasks: ['svgstore','template:html']
	  },
      livereload: {
        options: {
          livereload: true
        },
        files: [
          'dist/**/*.html',
          'dist/assets/css/{,*/}*.css',
          'dist/assets/js/{,*/}*.js'
        ]
      }
    },

    sass: {
      build: {
        files : [
          {
            src : ['*.scss', 'effeckts/*.scss','modules/*.scss'],
            cwd : 'scss',
            dest : '<%= dirs.generated %>',
            ext : '.css',
            expand : true
          }
        ],
        options : {
          style : 'expanded'
        }
    }
    },

    template: {
        html: { files: [{ dest: '<%= dirs.output %>', src: '*.html', cwd: 'html', expand:true }],
            options: {
                delimiters: 'html-comments-delimiters',
                data: function() {
                    var svg = grunt.file.read(dirs.generated+'icons.include');

                    svg = svg.replace(new RegExp('viewBox'),'style="visibility:hidden;width:0;height:0;" viewBox');

                    return {
                        version: pkg.version,
                        friendlyname: pkg.friendlyname,
                        compiledsvg: svg
                    };
                }
            }
        },

        php: { files: [{ dest: '<%= dirs.output %>', src: '*.php', cwd: 'html', expand:true }],
            options: {
                delimiters: 'php-comments-delimiters',
                data: function() { return {
                    ldapcompiled: config.authenticate.ldapcompiled,
                    cachecompiled: config.authenticate.cachecompiled,
                    permissionscompiled: config.authenticate.permissionscompiled,
                    daemonscompiled: config.daemonscompiledUrls,
                    filescompiled: config.filescompiled,
                }; }
            }
        },

        js: { files: [{ dest: '<%= dirs.output %>assets/js', src: 'main.js', cwd: 'js', expand:true }],
            options: {
                delimiters: 'php-comments-delimiters',
                data: function() { return {
                    firstdc: config.jsCompiledDcList[0],
                    dclist: JSON.stringify(config.jsCompiledDcList).replace(new RegExp('^\\['),'').replace(new RegExp('\\]$'),''), //remove the array braces
                }; }
            }
        },
    },

    // 'html-validation': {
    //     options: {  failHard: true },
    //     files: {src: ['<%= dirs.output %>*.html'] },
    // },

    phplint: {
        files: ['<%= dirs.output %>*.php']
    },

    connect: {
      server: {
        options: {
          port: 9001,
          protocol: 'http',
          hostname: 'localhost',
          base: './dist/',  // '.' operates from the root of your Gruntfile, otherwise -> 'Users/user-name/www-directory/website-directory'
          keepalive: false, // set to false to work side by side w/watch task.
          livereload: true,
          open: true
        }
      }
    },

    copy: {
      root: {
        files: [
          { expand: true, flatten: true, cwd: './files', src: ['./**/*.xml','./**/*.txt','./**/*.ico'], dest: '<%= dirs.output %>' }
        ]
      },
      html: {
        files: [
          { expand: true, cwd: './html', src: ['./**/*.*'], dest: '<%= dirs.output %>' }
        ]
      },
      img: {
        files: [
          { expand: true, cwd: './img', src: ['./**/*.*'], dest: '<%= dirs.output %>assets/img' }
        ]
      },
      font: {
        files: [
          { expand: true, cwd: './font', src: ['./**/*.*'], dest: '<%= dirs.output %>assets/font' }
        ]
      },
      js: {
        files: [
          { expand: true, cwd: './js', src: ['*.js','!main.js','vendor/**'], dest: '<%= dirs.output %>assets/js' }
        ]
      },
      mainjs: {
        files: [
          { expand: true, flatten:true, src: [
              './js/main.js',
              'node_modules/angular/angular.js',
              'node_modules/js-cookie/src/js.cookie.js',
              'node_modules/x2js/x2js.js',
              'node_modules/perfect-scrollbar/dist/js/perfect-scrollbar.js'
          ], dest: '<%= dirs.output %>assets/js' }
        ]
      }
    },

    concat: {
      options: {
        banner: '<%= banner %>',
        stripBanners: false
      },
      js: {
        src: [
          'js/modules/noconsole.js',

          'js/modules/core.js', //must be first in Effeckt block
          'js/modules/list-items.js',
		  'js/modules/effecktModals.js',

		  'node_modules/desandro-classie/classie.js',
          'js/modules/js.cookie.js',
          'js/modules/jquery.hashchange.js',
          'js/modules/jquery.timeago.js',
          'js/modules/html5sortable.js',
          'js/modules/easytabs.js',
          'js/modules/jqueryFilterByData.js',

          //My libraries
          'js/modules/library.js',
        ],
        dest: 'js/plugins.js'
      },
      effeckt: {
        src: [
		'css/modules/buttons.css',        'css/modules/list-scroll.css',       'css/modules/positional-modals.css',
		'css/modules/captions.css',       'css/modules/modal.css',             'css/modules/tabs.css',
		'css/modules/form-elements.css',  'css/modules/modals.css',            'css/modules/tooltips.css',
		'css/modules/lazy-loading.css',   'css/modules/off-screen-nav.css',
		'css/modules/list-items.css',     'css/modules/page-transitions.css',     'css/modules/jqui-icons.css',
        ],
        dest: 'css/effeckt.css'
      },
      tidycss: {
        src: [
        '<%= dirs.generated %>tidy.css',
        '<%= dirs.generated %>simptip.css',
        'node_modules/perfect-scrollbar/dist/css/perfect-scrollbar.css',
        'css/custom.css'
        ],
        dest: '<%= dirs.generated %>tidy.concat.css'
      }
    },

    'gh-pages': {
      options: {
        base: 'dist'
      },
      io: {
        options: {
          base: 'dist',
          repo: 'git@github.com:tprobinson/tprobinson.github.io.git',
          branch: 'master'
        },
        src: ['**/*']
      }
    },

    //Deploy actions

    // https://github.com/nDmitry/grunt-autoprefixer
    autoprefixer: {
      build: {
        options: {
          browsers: ['last 2 versions', '> 1%', 'Safari >= 6']
        },
        files: [
          {
            src : ['css/effeckt.css','css/main.css','<%= dirs.generated %>simptip.css','css/topcoat-desktop-dark.css'],
            cwd : '',
            dest : '<%= dirs.output %>assets/',
            expand : true
          }
        ]
    },
    tidy: {
      options: {
        browsers: ['last 2 versions', '> 1%', 'Safari >= 6']
      },
      files: [
        {
          src : ['<%= dirs.generated %>tidy.concat.css'],
          cwd : '',
          dest : '.',
          expand : true
        }
      ]
    }
    },

    // https://github.com/addyosmani/grunt-uncss
    uncss: {
        tidy: {
            options: {
                // report: 'gzip',
                stylesheets: [
                    '../node_modules/normalize.css/normalize.css',
                    '../css/boilerplate.css',
                    '../css/topcoat-desktop-dark.css',
                    '../css/effeckt.css'
            		// '../css/modules/form-elements.css','../css/modules/modals.css','../css/modules/list-items.css', '../css/modules/jqui-icons.css',
                ],
                ignore: [
                    /topcoat-button-bar/,/topcoat-button/,/topcoat-list/,
                    /topcoat-checkbox/,/topcoat-range/,/select/,/input/,
                    /pop-in/,

                    /moveIn/, // https://github.com/giakki/uncss/issues/188

                    '.labelsmall',
                    '.effeckt-show','.effeckt-hide','.md-perspective',

                    /h\d+/
                ]
            },
            files: {
                '<%= dirs.generated %>tidy.css': ['html/index.html']
            }
        }
    },

	cssmin: {
        options: {
            report: 'gzip'
        },
		tidy: {
			files: {
				'<%= dirs.output %>assets/css/tidy.min.css': ['<%= dirs.generated %>tidy.concat.css'],
			}
		}
	},

    image: {
        img: {
            options: {
            pngquant: true,
            optipng: true,
            advpng: true,
            zopflipng: true,
            pngcrush: true,
            pngout: true,
            mozjpeg: true,
            jpegRecompress: true,
            jpegoptim: true,
            gifsicle: true,
            svgo: true
        },
        files: [{
            expand: true,
            src: ['img/**/*.*'],
            dest: '<%= dirs.output %>assets/'
        }]
        },
        root: {
            options: {
                pngquant: true,
                optipng: true,
                advpng: true,
                zopflipng: true,
                pngcrush: true,
                pngout: true,
                mozjpeg: true,
                jpegRecompress: true,
                jpegoptim: true,
                gifsicle: true,
                svgo: true
            },
            files: [{
                expand: true,
                flatten: true,
                src: ['files/**/*.svg','files/**/*.png'],
                dest: '<%= dirs.output %>'
            }]
        }
    },

    svgstore: {
        options: {
            prefix : 'icon-', // This will prefix each <g> ID
            inheritviewbox: true,
            includedemo: true,
            svg: {
                viewBox : '0 0 17 17',
                xmlns: 'http://www.w3.org/2000/svg'
            }
        },
        default : {
            files: {
                '<%= dirs.generated %>icons.include': ['icons/*.svg'],
            }
        }
    },

    uglify: {
		options: {
		  mangle: {
			except: ['jQuery', 'angular', '$'],
            screw_ie8: true,
            reserveDOMProperties: true,
            mangleProperties: true,
            nameCache: '/tmp/grunt-uglify-cache.json'
		  },
		  compress: {
			  //drop_console: true,
			  //maxLineLen: 100,
			  screw_ie8: true,
			  dead_code: true
		  }
		},
		test: {
		  files: {
			'<%= dirs.output %>assets/js/main.js': [
                'node_modules/angular/angular.js',
				'js/plugins.js',
				'js/main.js'
			]}
		}
    },
  });

  grunt.registerTask('scss', ['sass','concat:effeckt']);
  grunt.registerTask('css', ['uncss:tidy','concat:tidycss','autoprefixer:tidy','cssmin:tidy']);

grunt.registerTask('old-js', ['concat:js','copy:js','template-js']);
  grunt.registerTask('js', ['concat:js','copy:js','copy:mainjs']);
  grunt.registerTask('dev', ['connect', 'watch']);
  grunt.registerTask('watchnow', ['watch']);

  grunt.registerTask('full-deploy', ['sass','css','js','template-all','copy:root','copy:font','copy:js','image:img','image:root']);
  grunt.registerTask('full-development-deploy', ['set-development','full-deploy']);

  grunt.registerTask('template-all', ['prepare-variables','template:html']);
  grunt.registerTask('template-old', ['prepare-variables','template:html','template:php','template:js','phplint']);
  grunt.registerTask('template-php', ['prepare-variables','template:php']);
  grunt.registerTask('template-html', ['prepare-variables','template:html']);
  grunt.registerTask('template-js', ['prepare-variables','template:js']);


  grunt.registerTask('mkdir','Creates directories in the deploy dir.',function() {
      grunt.log.ok('Creating directory '+dirs.output+'config');
      grunt.file.mkdir(dirs.output+'config');
  });

  grunt.registerTask('set-development','Sets a variable',function() { development = 1; });

  grunt.registerTask('prepare-variables','Reads config vars and parses them',function() {
      //Build the string blocks


  });

};

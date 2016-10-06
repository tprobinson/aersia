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

grunt.template.addDelimiters('html-comments-delimiters', '<!--%', '-->');
grunt.template.addDelimiters('php-comments-delimiters', '/*%', '*/');
grunt.initConfig({
  config: config,
  // Copied from Bootstrap
  banner: '/*!\n' +
  ' * '+ pkg.friendlyname +' v'+ pkg.version +'\n' +
  ' * This file is compiled using Grunt.\n' +
  ' */\n',

  modernizr: {
    dist: {
      "crawl": false,
      "customTests": [],
      "dest": "<%= config.dirs.output %>assets/js/modernizr.js",
      "tests": [
        "audio",
        "cookies",
        "eventlistener",
        "forcetouch",
        "fullscreen",
        "hashchange",
        "audiopreload"
      ],
      "options": [
        "setClasses"
      ],
      "uglify": true
    }
  },


  watch: {
    scss: {
      files: ['scss/**/*.scss'],
      tasks: ['update-scss']
    },
    css: {
      files: [
        'node_modules/normalize.css/normalize.css',
        '<%= config.dirs.generated %>scss/effeckt.css',
        '<%= config.dirs.generated %>simptip.css',
        '<%= config.dirs.generated %>perfect-scrollbar.css',
        'css/*.css'
      ],
      tasks: ['update-css']
    },
    js: {
      files: [
        'node_modules/angular/angular.js',
        'node_modules/desandro-classie/classie.js',
        'node_modules/clipboard/dist/clipboard.js',
        'node_modules/jsonlylightbox/js/lightbox.js',
        'js/ofi/dist/ofi.browser.js',
        'node_modules/js-cookie/src/js.cookie.js',
        'node_modules/x2js/x2js.js',
        'node_modules/perfect-scrollbar/dist/js/perfect-scrollbar.js',
        'node_modules/js-logger/src/logger.js',
        'js/modules/*.js',
        'js/polyfills/*.js',
        '<%= config.dirs.generated %>modernizr.js',
      ],
      tasks: ['update-js']
    },
    mainjs: {
      files: [
        'config/themes/*.json',
        'js/main.js'
      ],
      tasks: ['update-mainjs']
    },
    html: {
      files: ['html/**/*.html'],
      tasks: ['update-html']
    },
    flat: {
      files: ['flat/**/*.*'],
      tasks: ['copy:flat']
    },
    icons: {
      files: ['img/icons/*.svg'],
      tasks: ['update-icons']
    },
    layouts: {
      files: ['img/layouts/*.svg'],
      tasks: ['update-layouts']
    },
    favicons: {
      files: ['img/aersia.svg','img/aersia-silhouette.svg'],
      tasks: ['update-favicons']
    },
    img: {
      files: ['img/flat/**/*.*'],
      tasks: ['update-imgflat']
    },
    livereload: {
      options: {
        livereload: true
      },
      files: [
        '<%= config.dirs.output %>**/*.html',
        '<%= config.dirs.output %>assets/css/{,*/}*.css',
        '<%= config.dirs.output %>assets/js/{,*/}*.js'
      ]
    }
  },

  sass: {
    build: {
      files : [{
        src : ['<%= config.dirs.generated %>/effeckt_importMap.scss','scss/*.scss', 'scss/effeckts/*.scss','scss/modules/*.scss'],
        // cwd : 'scss',
        dest : '<%= config.dirs.generated %>',
        ext : '.css',
        expand : true
      }],
      options : {
        style : 'expanded'
      }
    },
    ps: {
      files : {
        '<%= config.dirs.generated %>scss/perfect-scrollbar.css': 'node_modules/perfect-scrollbar/src/css/main.scss',
      },
      options: {
        style: 'compressed'
      }
    }
  },

  template: {
    html: { files: [{ dest: '<%= config.dirs.output %>', src: '*.html', cwd: 'html', expand:true }],
      options: {
        delimiters: 'html-comments-delimiters',
        data: function() {
          //Provide the generated SVGSTORE file
          var iconstring = grunt.file.read(config.dirs.generated+'icons.include');
          iconstring = iconstring.replace(new RegExp('viewBox'),'style="visibility:hidden;width:0;height:0;" viewBox');

          var layoutstring = grunt.file.read(config.dirs.generated+'layouts.include');
          layoutstring = layoutstring.replace(new RegExp('viewBox'),'style="visibility:hidden;width:0;height:0;" viewBox');

          //Provide the generated favicon markup
          var favicons = grunt.file.read(config.dirs.generated+'favicon.html');

          // Provide all required CSS dependencies
          if( config.development ) {
            cssdeps = `
    <link rel="stylesheet" href="assets/css/normalize.css">
    <link rel="stylesheet" href="assets/css/boilerplate.css">
    <link rel="stylesheet" href="assets/css/topcoat-desktop-dark.css">
    <link rel="stylesheet" href="assets/css/jqui-icons.css">
    <link rel="stylesheet" href="assets/css/effeckt.concat.css">
    <link rel="stylesheet" href="assets/css/lightbox.css">
    <link rel="stylesheet" href="assets/css/simptip.css">
    <link rel="stylesheet" href="assets/css/perfect-scrollbar.css">
    <link rel="stylesheet" href="assets/css/custom.css">
`;
          } else {
            cssdeps = `
    <link rel="stylesheet" href="assets/css/tidy.min.css">
`;
          }

          if( config.development ) {
            jsdeps = `
    <script src="assets/js/angular.js"></script>
    <script src="assets/js/plugins.js"></script>
    <script src="assets/js/main.js"></script>
`;
          } else {
            jsdeps = `
    <script src="assets/js/main.min.js"></script>
`;
          }

          return {
            version: pkg.version,
            friendlyname: pkg.friendlyname,
            compiledicons: iconstring,
            compiledlayouts: layoutstring,
            favicons: favicons,
            cssdeps: cssdeps,
            jsdeps: jsdeps,
            release: config.release,
          };
        }
      }
    },

    // php: { files: [{ dest: '<%= config.dirs.output %>', src: '*.php', cwd: 'html', expand:true }],
    //   options: {
    //     delimiters: 'php-comments-delimiters',
    //     data: function() { return {
    //
    //     }; }
    //   }
    // },

    js: { files: [{ dest: '<%= config.dirs.generated %>', src: 'js/main.js', expand:true }],
      options: {
        delimiters: 'php-comments-delimiters',
        data: function() {
          //moar stuff here
          var themestring = '';
          grunt.file.recurse(config.dirs.themes, function callback(abspath, rootdir, subdir, filename) {
            var themename = filename.replace(new RegExp('\.json'),'');
            var contents = grunt.file.read(abspath);
            themestring += '"'+themename+'": ' + contents + ',\n';
          });

          return {
            version: pkg.version,
            friendlyname: pkg.friendlyname,
            includedstyles: themestring,
          };
        }
      }
    },
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


  // 'html-validation': {
  //   options: {  failHard: true },
  //   files: {src: ['<%= config.dirs.output %>*.html'] },
  // },

  phplint: {
    files: ['<%= config.dirs.output %>*.php']
  },

  connect: {
    server: {
      options: {
        port: 9001,
        protocol: 'http',
        hostname: 'localhost',
        base: '<%= config.dirs.output %>',  // '.' operates from the root of your Gruntfile, otherwise -> 'Users/user-name/www-directory/website-directory'
        keepalive: false, // set to false to work side by side w/watch task.
        livereload: true,
        open: true
      }
    }
  },

  copy: {
    roster: {
      files: [
        { expand: true, flatten: true, src: ['<%= config.dirs.generated %>roster_new.json'], dest: '<%= config.dirs.output %>',rename: function(dest, src) {
        return dest + src.replace('roster_new','roster');
        } }
      ]
    },
    flat: {
      files: [
        { expand: true, cwd: './flat', src: ['./**/*.xml','./**/*.txt','./**/*.json'], dest: '<%= config.dirs.output %>' }
      ]
    },
    html: {
      files: [
        { expand: true, cwd: '<%= config.dirs.generated %>html', src: ['*.html'], dest: '<%= config.dirs.output %>' }
      ]
    },
    imgflat: {
      files: [
        { expand: true, cwd: '<%= config.dirs.generated %>/img', src: ['./**/*.*'], dest: '<%= config.dirs.output %>assets/img' },
      ]
    },
    js: {
      files: [
        { expand: true, flatten: true, src: ['<%= config.dirs.generated %>js/plugins.js'], dest: '<%= config.dirs.output %>assets/js/' }
      ]
    },
    mainjs: {
      files: [
        { expand: true, flatten: true, src: ['<%= config.dirs.generated %>js/main.js'], dest: '<%= config.dirs.output %>assets/js/' }
      ]
    },
    nodeModules: {
      files: [
        { expand: true, flatten:true, src: [
          'node_modules/angular/angular.js',
        ], dest: '<%= config.dirs.output %>assets/js' }
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
          '../css/jqui-icons.css',
          /*'../<%= config.dirs.generated %>effeckt.css'*/
        ],
        ignore: [
          // /topcoat-button-bar/,
          /topcoat-button/,
          // /topcoat-list/,
          /topcoat-checkbox/,
          // /topcoat-range/,
          /select/,
          /input/,
          // /pop-in/,

          // This is for modal dialogs
          // /moveIn/, // https://github.com/giakki/uncss/issues/188
          // '.md-perspective',

          // '.labelsmall',
          '.effeckt-show','.effeckt-hide',

          /h\d+/
        ]
      },
      files: {
        '<%= config.dirs.generated %>tidy.css': ['html/index.html']
      }
    }
  },

  concat: {
    options: {
      banner: '<%= banner %>',
      stripBanners: false
    },
    js: {
      src: [
        // Polyfills
        'js/polyfills/*',
        'js/modules/noconsole.js',
        'js/modules/transitionEnd.js',
        'js/ofi/dist/ofi.browser.js',
        'node_modules/x2js/x2js.js',
        'node_modules/desandro-classie/classie.js',
        'js/modules/jquery.hashchange.js',

        'node_modules/js-logger/src/logger.js',

        // Effeckt
        'js/modules/core.js', //must be first in Effeckt block
        'js/modules/tabs.js',
        // 'js/modules/list-scroll.js',

        // Utilities
        'node_modules/clipboard/dist/clipboard.js',
        'js/modules/js.cookie.js',

        // 'js/modules/jquery.timeago.js',
        'node_modules/jsonlylightbox/js/lightbox.js',
        'node_modules/perfect-scrollbar/dist/js/perfect-scrollbar.js',

        //My libraries
        'js/modules/library.js',
      ],
      dest: '<%= config.dirs.generated %>js/plugins.js'
    },
    cssdev: {
      src: [
        '<%= config.dirs.generated %>scss/modules/*',
        '<%= config.dirs.generated %>scss/effeckt.css',
      ],
      dest: '<%= config.dirs.generated %>effeckt.concat.css'
    },
    tidycss: {
      src: [
        '<%= config.dirs.generated %>tidy.css',
        '<%= config.dirs.generated %>scss/modules/*',
        '<%= config.dirs.generated %>scss/effeckt.css',
        // '<%= config.dirs.generated %>scss/simptip.css',
        'node_modules/jsonlylightbox/css/lightbox.css',

        'css/jqui-icons.css',

        '<%= config.dirs.generated %>scss/perfect-scrollbar.css',
        'css/custom.css'
      ],
      dest: '<%= config.dirs.generated %>tidy.concat.css'
    }
  },

  // https://github.com/nDmitry/grunt-autoprefixer
  autoprefixer: {
    dev: {
      options: {
        browsers: ['last 3 versions', '> 1%', 'Safari >= 6']
      },
      files: [{
        src : [
          'node_modules/normalize.css/normalize.css',
          'css/boilerplate.css',
          'css/topcoat-desktop-dark.css',
          'css/jqui-icons.css',
          '<%= config.dirs.generated %>effeckt.concat.css',
          'node_modules/jsonlylightbox/css/lightbox.css',
          // '<%= config.dirs.generated %>simptip.css',
          '<%= config.dirs.generated %>scss/perfect-scrollbar.css',
          'css/custom.css'
        ],
        cwd: '',
        dest: '<%= config.dirs.output %>assets/css',
        expand: true,
        flatten: true,
      }]
    },
    tidy: {
      options: {
        browsers: ['last 3 versions', '> 1%', 'Safari >= 6']
      },
      files: [{
        src : ['<%= config.dirs.generated %>tidy.concat.css'],
        cwd : '',
        dest : '.',
        expand : true
      }]
    }
  },


  cssmin: {
    options: {
      report: 'gzip'
    },
    tidy: {
      files: {
        '<%= config.dirs.output %>assets/css/tidy.min.css': ['<%= config.dirs.generated %>tidy.concat.css'],
      }
    }
  },

  image: {
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
    imgflat: {
      files: [{
        cwd: 'img/flat/',
        src: ['**/*.*'],
        expand: true,
        dest: '<%= config.dirs.generated %>img/'
      }]
    },
    icons: {
      files: [{
        cwd: 'img/icons/',
        src: ['**/*.*'],
        expand: true,
        dest: '<%= config.dirs.generated %>icons/'
      }]
    },
    layouts: {
      files: [{
        cwd: 'img/layouts/',
        src: ['**/*.*'],
        expand: true,
        dest: '<%= config.dirs.generated %>layouts/'
      }]
    },
    favicons: {
      files: [{
        cwd: 'img/',
        src: ['aersia.svg','aersia-silhouette.svg'],
        expand: true,
        dest: '<%= config.dirs.generated %>img/'
      }]
    }
  },

  svgstore: {
    icons: {
      options: {
        prefix : 'icon-', // This will prefix each <g> ID
        inheritviewbox: true,
        // includedemo: true,
        svg: {
          viewBox : '0 0 17 17',
          xmlns: 'http://www.w3.org/2000/svg'
        }
      },
      files: {
        '<%= config.dirs.generated %>icons.include': ['<%= config.dirs.generated %>icons/*.svg'],
      }
    },
    layouts: {
      options: {
        inheritviewbox: true,
        // includedemo: true,
        svg: {
          viewBox : '0 0 120 120',
          xmlns: 'http://www.w3.org/2000/svg'
        }
      },
      files: {
        '<%= config.dirs.generated %>layouts.include': ['<%= config.dirs.generated %>layouts/*.svg'],
      }
    }
  },

  sass_globbing: {
    effeckt: {
      files: {
        '<%= config.dirs.generated %>effeckt_importMap.scss': 'scss/modules/**/*.scss',
      }
    }
  },

  uglify: {
    options: {
      report: 'gzip',
      mangle: {
        // except: ['jQuery', 'angular', '$', 'Ps', 'Logger', 'Cookies'],
        maxLineLen: 100,
        screw_ie8: true,
        reserveDOMProperties: true,
        mangleProperties: true,
        nameCache: '<%= config.dirs.generated %>grunt-uglify-cache.json',

        sourceMap: true,
        sourceMapName: '<%= config.dirs.generated %>sourceMap.map',
        toplevel: true,
      },
      compress: {
        //drop_console: true,
        screw_ie8: true,
        dead_code: true,

        unsafe: true,
        unsafe_comps: true,
        conditionals: true,
        comparisons: true,
        evaluate: true,
        booleans: true,
        loops: true,
        unused: true,
        if_return: true,
        join_vars: true,
        cascade: true,
        collapse_vars: true,
        passes: 3,
      }
    },
    all: {
      files: {
        '<%= config.dirs.output %>assets/js/main.min.js': [
          'node_modules/angular/angular.js',
          '<%= config.dirs.generated %>js/plugins.js',
          '<%= config.dirs.generated %>js/main.js',
        ]
      }
    }
  },

  shell: {
    ps: {
      command: 'cd node_modules/perfect-scrollbar && node_modules/.bin/gulp js'
    },
    logger: {
      command: 'cd node_modules/js-logger && node_modules/.bin/gulp'
    }
  },

	realFavicon: {
		favicons: {
			src: '<%= config.dirs.generated %>img/aersia.svg',
			dest: '<%= config.dirs.output %>',
			options: {
				iconsPath: '/',
				html: [ '<%= config.dirs.generated %>favicon.html' ],
				design: {
					ios: {
						pictureAspect: 'backgroundAndMargin',
						backgroundColor: '#ff9148',
						margin: '11%',
						appName: 'Aersia Player'
					},
					desktopBrowser: {},
					windows: {
						masterPicture: {
							type: 'inline',
							content: '<%= config.dirs.generated %>img/aersia-silhouette.svg',
						},
						pictureAspect: 'whiteSilhouette',
						backgroundColor: '#da532c',
						onConflict: 'override',
						appName: 'Aersia Player'
					},
					androidChrome: {
						pictureAspect: 'noChange',
						themeColor: '#ffffff',
						manifest: {
							name: 'Aersia Player',
							display: 'browser',
							orientation: 'notSet',
							onConflict: 'override',
							declared: true
						}
					},
					safariPinnedTab: {
						masterPicture: {
							type: 'inline',
							content: '<%= config.dirs.generated %>img/aersia-silhouette.svg',
						},
						pictureAspect: 'silhouette',
						themeColor: '#183C63'
					}
				},
				settings: {
					compression: 2,
					scalingAlgorithm: 'Mitchell',
					errorOnImageTooSmall: false
				}
			}
		}
	},

  jsonmin: {
    roster: {
      options: {
        stripWhitespace: true,
        stripComments: true,
      },
      files: {
        '<%= config.dirs.output %>roster.json': 'bin/roster.json',
      },
    }
  }

});

grunt.registerTask('js', ['concat:js','copy:js','copy:nodeModules','template:js']);
grunt.registerTask('dev', ['connect', 'watch']);
grunt.registerTask('watchnow', ['watch']);

grunt.registerTask('full-deploy', 'Deploys the entire app', function() { list = [
  [
      // Build node-modules
      'shell:ps','shell:logger',

      // Compile SCSS files
      'sass_globbing:effeckt','sass-glob-prepare','sass', // these feed into CSS

      // Compile CSS files
      'uncss:tidy','concat:tidycss','autoprefixer:tidy','cssmin:tidy', // ends up as tidy.min.css

      // Put together the JS files
      'modernizr', // goes in as its own file
      'concat:js','copy:js','copy:nodeModules', //ends up as plugins.js
      'template:js','uglify:all', // ends up as main.js

      // Prepare static resources
      'image:icons','svgstore:icons', // img/icons
      'image:layouts','svgstore:layouts', // img/layouts
      'image:favicons','realFavicon', // img/aersia.svg and silhouette

      'image:imgflat','copy:imgflat', //img/flat

      // Prepare HTML -- this happens last so we can read dirs for deps
      'template:html',

      // Copy the roster, minified
      'jsonmin:roster',

      // Copy all unprocessed files over
      'copy:flat',
  ], [
    // Build node-modules
    'shell:ps','shell:logger',

    // Compile SCSS files
    'sass_globbing:effeckt','sass-glob-prepare','sass', // these feed into CSS

    // Compile CSS files
    'autoprefixer:dev', // Dumps all the CSS files into the directory

    // Put together the JS files
    'modernizr', // goes in as its own file
    'concat:js','copy:js','copy:nodeModules', //ends up as plugins.js
    'template:js','copy:mainjs', // ends up as main.js

    // Prepare static resources
    'image:icons','svgstore:icons', // img/icons
    'image:layouts','svgstore:layouts', // img/layouts
    'image:favicons','realFavicon', // img/aersia.svg and silhouette

    'image:imgflat','copy:imgflat', //img/flat

    // Prepare HTML -- this happens last so we can read dirs for deps
    'template:html',

    // Copy the roster
    'copy:roster',

    // Copy all unprocessed files over
    'copy:flat',
  ]];
  grunt.task.run(list[config.development]);
});

// Tasks to completely update one resource
grunt.registerTask('update-scss',['sass_globbing:effeckt','sass-glob-prepare','sass','update-css']);
grunt.registerTask('update-css','updates CSS', function() { list = [
    ['uncss:tidy','concat:tidycss','autoprefixer:tidy','cssmin:tidy'],
    ['concat:cssdev','autoprefixer:dev'],
  ];
  grunt.task.run(list[config.development]);
});

grunt.registerTask('update-html',['template:html']);

grunt.registerTask('update-js',['concat:js','copy:js','copy:nodeModules']);

grunt.registerTask('update-mainjs','Updates the main JS file', function() { list = [
    ['template:js','uglify:all'],
    ['template:js','copy:mainjs'],
  ];
  grunt.task.run(list[config.development]);
});

grunt.registerTask('update-imgflat',['image:imgflat','copy:imgflat']);
grunt.registerTask('update-icons',['image:icons','svgstore:icons','template:html']);
grunt.registerTask('update-layouts',['image:layouts','svgstore:layouts','template:html']);
grunt.registerTask('update-favicons',['image:favicons','realFavicon']);

grunt.registerTask('sass-glob-prepare','Prepares a file to import Effeckt files', function() {
  grunt.file.write(config.dirs.generated+'main.scss',
    "@import \"_variables\";\n" +
    "@import \"_global\";\n" +
    "@import \"../"+config.dirs.generated+"effeckt_importMap.scss\";\n"
  );
});
// grunt.registerTask('mkdir','Creates directories in the deploy dir.',function() {
//   grunt.log.ok('Creating directory '+config.dirs.output+'config');
//   grunt.file.mkdir(config.dirs.output+'config');
// });

};

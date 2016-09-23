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
var development = 1;
var dirs = {
    output: "dist/",
    generated: "generated/",
    themes: "config/themes/",
};

grunt.template.addDelimiters('html-comments-delimiters', '<!--%', '-->');
grunt.template.addDelimiters('php-comments-delimiters', '/*%', '*/');
grunt.initConfig({
  // Copied from Bootstrap
  banner: '/*!\n' +
  ' * '+ pkg.friendlyname +' v'+ pkg.version +'\n' +
  ' * This file is compiled using Grunt.\n' +
  ' */\n',

  dirs: dirs, //this is stupid and I am probably doing something wrong

  modernizr: {
    dist: {
      "crawl": false,
      "customTests": [],
      "dest": "<%= dirs.output %>assets/js/modernizr.js",
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
        '<%= dirs.generated %>effeckt.css',
        '<%= dirs.generated %>simptip.css',
        '<%= dirs.generated %>perfect-scrollbar.css',
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
        '<%= dirs.generated %>modernizr.js',
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
        'dist/**/*.html',
        'dist/assets/css/{,*/}*.css',
        'dist/assets/js/{,*/}*.js'
      ]
    }
  },

  sass: {
    build: {
      files : [{
        src : ['*.scss', 'effeckts/*.scss','modules/*.scss'],
        cwd : 'scss',
        dest : '<%= dirs.generated %>scss/',
        ext : '.css',
        expand : true
      }],
      options : {
        style : 'expanded'
      }
    },
    ps: {
      files : {
        '<%= dirs.generated %>scss/perfect-scrollbar.css': 'node_modules/perfect-scrollbar/src/css/main.scss',
      },
      options: {
        style: 'compressed'
      }
    }
  },

  template: {
    html: { files: [{ dest: '<%= dirs.output %>', src: '*.html', cwd: 'html', expand:true }],
      options: {
        delimiters: 'html-comments-delimiters',
        data: function() {
          //Provide the generated SVGSTORE file
          var iconstring = grunt.file.read(dirs.generated+'icons.include');
          iconstring = iconstring.replace(new RegExp('viewBox'),'style="visibility:hidden;width:0;height:0;" viewBox');

          var layoutstring = grunt.file.read(dirs.generated+'layouts.include');
          layoutstring = layoutstring.replace(new RegExp('viewBox'),'style="visibility:hidden;width:0;height:0;" viewBox');

          //Provide the generated favicon markup
          var favicons = grunt.file.read(dirs.generated+'favicon.html');

          // Provide all required CSS dependencies
          if( development ) {
            cssdeps = `
    <link rel="stylesheet" href="assets/css/normalize.css">
    <link rel="stylesheet" href="assets/css/boilerplate.css">
    <link rel="stylesheet" href="assets/css/topcoat-desktop-dark.css">
    <link rel="stylesheet" href="assets/css/jqui-icons.css">
    <link rel="stylesheet" href="assets/css/effeckt.css">
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

          if( development ) {
            jsdeps = `
    <script src="assets/js/angular.js"></script>
    <script src="assets/js/plugins.js"></script>
    <script src="assets/js/main.js"></script>
`;
          } else {
            jsdeps = `
    <script src="assets/js/main.js"></script>
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
          };
        }
      }
    },

    // php: { files: [{ dest: '<%= dirs.output %>', src: '*.php', cwd: 'html', expand:true }],
    //   options: {
    //     delimiters: 'php-comments-delimiters',
    //     data: function() { return {
    //
    //     }; }
    //   }
    // },

    js: { files: [{ dest: '<%= dirs.generated %>', src: 'js/main.js', expand:true }],
      options: {
        delimiters: 'php-comments-delimiters',
        data: function() {
          //moar stuff here
          var themestring = '';
          grunt.file.recurse(dirs.themes, function callback(abspath, rootdir, subdir, filename) {
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
  //   files: {src: ['<%= dirs.output %>*.html'] },
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
    flat: {
      files: [
        { expand: true, cwd: './flat', src: ['./**/*.xml','./**/*.txt'], dest: '<%= dirs.output %>' }
      ]
    },
    html: {
      files: [
        { expand: true, cwd: '<%= dirs.generated %>html', src: ['*.html'], dest: '<%= dirs.output %>' }
      ]
    },
    imgflat: {
      files: [
        { expand: true, cwd: '<%= dirs.generated %>/img', src: ['./**/*.*'], dest: '<%= dirs.output %>assets/img' },
      ]
    },
    js: {
      files: [
        { expand: true, flatten: true, src: ['<%= dirs.generated %>plugins.js'], dest: '<%= dirs.output %>assets/js/' }
      ]
    },
    mainjs: {
      files: [
        { expand: true, flatten: true, src: ['<%= dirs.generated %>js/main.js'], dest: '<%= dirs.output %>assets/js/' }
      ]
    },
    nodeModules: {
      files: [
        { expand: true, flatten:true, src: [
          'node_modules/angular/angular.js',
        ], dest: '<%= dirs.output %>assets/js' }
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
          /*'../<%= dirs.generated %>effeckt.css'*/
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
        '<%= dirs.generated %>tidy.css': ['html/index.html']
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
      dest: '<%= dirs.generated %>plugins.js'
    },
    tidycss: {
      src: [
        '<%= dirs.generated %>tidy.css',
        '<%= dirs.generated %>scss/effeckt.css',
        // '<%= dirs.generated %>scss/simptip.css',
        'node_modules/jsonlylightbox/css/lightbox.css',

        'css/jqui-icons.css',

        '<%= dirs.generated %>scss/perfect-scrollbar.css',
        'css/custom.css'
      ],
      dest: '<%= dirs.generated %>tidy.concat.css'
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
          '<%= dirs.generated %>effeckt.css',
          'node_modules/jsonlylightbox/css/lightbox.css',
          // '<%= dirs.generated %>simptip.css',
          '<%= dirs.generated %>perfect-scrollbar.css',
          'css/custom.css'
        ],
        cwd: '',
        dest: '<%= dirs.output %>assets/css',
        expand: true,
        flatten: true,
      }]
    },
    tidy: {
      options: {
        browsers: ['last 3 versions', '> 1%', 'Safari >= 6']
      },
      files: [{
        src : ['<%= dirs.generated %>tidy.concat.css'],
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
        '<%= dirs.output %>assets/css/tidy.min.css': ['<%= dirs.generated %>tidy.concat.css'],
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
        dest: '<%= dirs.generated %>img/'
      }]
    },
    icons: {
      files: [{
        cwd: 'img/icons/',
        src: ['**/*.*'],
        expand: true,
        dest: '<%= dirs.generated %>icons/'
      }]
    },
    layouts: {
      files: [{
        cwd: 'img/layouts/',
        src: ['**/*.*'],
        expand: true,
        dest: '<%= dirs.generated %>layouts/'
      }]
    },
    favicons: {
      files: [{
        cwd: 'img/',
        src: ['aersia.svg','aersia-silhouette.svg'],
        expand: true,
        dest: '<%= dirs.generated %>img/'
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
        '<%= dirs.generated %>icons.include': ['<%= dirs.generated %>icons/*.svg'],
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
        '<%= dirs.generated %>layouts.include': ['<%= dirs.generated %>layouts/*.svg'],
      }
    }
  },

  sass_globbing: {
    effeckt: {
      files: {
        '<%= dirs.generated %>effeckt_importMap.scss': 'scss/modules/**/*.scss',
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
        nameCache: '<%= dirs.generated %>grunt-uglify-cache.json',

        sourceMap: true,
        sourceMapName: '<%= dirs.generated %>sourceMap.map',
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
        '<%= dirs.output %>assets/js/main.min.js': [
          'node_modules/angular/angular.js',
          '<%= dirs.generated %>plugins.js',
          '<%= dirs.generated %>main.templated.js',
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
			src: '<%= dirs.generated %>img/aersia.svg',
			dest: '<%= dirs.output %>',
			options: {
				iconsPath: '/',
				html: [ '<%= dirs.generated %>favicon.html' ],
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
							content: '<%= dirs.generated %>img/aersia-silhouette.svg',
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
							content: '<%= dirs.generated %>img/aersia-silhouette.svg',
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
	}

});

grunt.registerTask('js', ['concat:js','copy:js','copy:nodeModules','template:js']);
grunt.registerTask('dev', ['connect', 'watch']);
grunt.registerTask('watchnow', ['watch']);

grunt.registerTask('full-deploy', [
    // Build node-modules
    'shell:ps','shell:logger',

    // Compile SCSS files
    'sass_globbing:effeckt','sass', // these feed into CSS

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
    // Copy all unprocessed files over
    'copy:flat',
]);

grunt.registerTask('full-prod-deploy', [
    'set-prod',
    // Build node-modules
    'shell:ps','shell:logger',

    // Compile SCSS files
    'sass_globbing:effeckt','sass', // these feed into CSS

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
    // Copy all unprocessed files over
    'copy:flat',
]);

// Tasks to completely update one resource
grunt.registerTask('update-scss',['sass_globbing:effeckt','sass','update-css']);
grunt.registerTask('update-css',['uncss:tidy','concat:tidycss','autoprefixer:tidy','cssmin:tidy']);

grunt.registerTask('update-html',['template:html']);

grunt.registerTask('update-js',['concat:js','copy:js','copy:nodeModules']);
grunt.registerTask('update-mainjs',['template:js','copy:mainjs',]);

grunt.registerTask('update-imgflat',['image:imgflat','copy:imgflat']);
grunt.registerTask('update-icons',['image:icons','svgstore:icons','template:html']);
grunt.registerTask('update-layouts',['image:layouts','svgstore:layouts','template:html']);
grunt.registerTask('update-favicons',['image:favicons','realFavicon']);

// grunt.registerTask('mkdir','Creates directories in the deploy dir.',function() {
//   grunt.log.ok('Creating directory '+dirs.output+'config');
//   grunt.file.mkdir(dirs.output+'config');
// });

grunt.registerTask('set-prod','sets var',function() { development = 0; });

};

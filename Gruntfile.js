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
        themes: "themes/",
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
                tasks: ['scss']
            },
            css: {
                files: [
                    'node_modules/normalize.css/normalize.css',
                    'css/topcoat-desktop-dark.css',
                    '<%= dirs.generated %>effeckt.css',
                    'css/boilerplate.css',
                    '<%= dirs.generated %>simptip.css',
                    '<%= dirs.generated %>perfect-scrollbar.css',
                    'css/custom.css'
                ],
                tasks: ['css']
            },
            js: {
                files: [
                  'node_modules/desandro-classie/classie.js',
                  'node_modules/clipboard/dist/clipboard.js',
                  'js/modules/*.js',
                ],
                tasks: ['concat:js','copy:js']
            },
            mainjs: {
                files: [
                    'themes/*.json',
                    'js/main.js'
                ],
                tasks: ['template:js']
            },
            nodeModules: {
                files: [
                    'node_modules/jsonlylightbox/js/lightbox.js',
                    'js/ofi/dist/ofi.browser.js',
                    'node_modules/angular/angular.js',
                    'node_modules/x2js/x2js.js',
                    'node_modules/perfect-scrollbar/dist/js/perfect-scrollbar.js',
                    'node_modules/js-logger/src/logger.js'
                ],
                tasks: ['copy:nodeModules']
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
            icons: {
                files: ['svg/icons/*.svg'],
                tasks: ['svgstore:icons','template:html']
            },
            layouts: {
                files: ['svg/layouts/*.svg'],
                tasks: ['svgstore:layouts','template:html']
            },
            img: {
                files: ['img/**/*.*'],
                tasks: ['image:img']
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
                    dest : '<%= dirs.generated %>',
                    ext : '.css',
                    expand : true
                }],
                options : {
                    style : 'expanded'
                }
            },
            ps: {
                files : {
                    '<%= dirs.generated %>perfect-scrollbar.css': 'node_modules/perfect-scrollbar/src/css/main.scss',
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
                    var favicon = grunt.file.read(dirs.generated+'favicon.html');

                    return {
                        version: pkg.version,
                        friendlyname: pkg.friendlyname,
                        compiledicons: iconstring,
                        compiledlayouts: layoutstring,
                        favicons: favicon,
                    };
                }
            }
        },

        php: { files: [{ dest: '<%= dirs.output %>', src: '*.php', cwd: 'html', expand:true }],
        options: {
            delimiters: 'php-comments-delimiters',
            data: function() { return {

            }; }
        }
    },

    js: { files: [{ dest: '<%= dirs.output %>assets/js', src: 'main.js', cwd: 'js', expand:true }],
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
            { expand: true, cwd: './img', src: ['./**/*.*'], dest: '<%= dirs.output %>assets/img' },
        ]
    },
    font: {
        files: [
            { expand: true, cwd: './font', src: ['./**/*.*'], dest: '<%= dirs.output %>assets/font' }
        ]
    },
    js: {
        files: [
            { expand: true, flatten: true, src: ['<%= dirs.generated %>plugins.js'], dest: '<%= dirs.output %>assets/js/' }
        ]
    },
    nodeModules: {
        files: [
            { expand: true, flatten:true, src: [
                'node_modules/jsonlylightbox/js/lightbox.js',
                'js/ofi/dist/ofi.browser.js',
                'node_modules/angular/angular.js',
                'node_modules/js-cookie/src/js.cookie.js',
                'node_modules/x2js/x2js.js',
                'node_modules/perfect-scrollbar/dist/js/perfect-scrollbar.js',
                'node_modules/js-logger/src/logger.js'
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
            'js/modules/transitionEnd.js',

            'js/modules/core.js', //must be first in Effeckt block
            'js/modules/tabs.js',
            'js/modules/list-scroll.js',

            'node_modules/desandro-classie/classie.js',
            'node_modules/clipboard/dist/clipboard.js',
            'js/modules/js.cookie.js',
            'js/modules/jquery.hashchange.js',
            'js/modules/jquery.timeago.js',

            //My libraries
            'js/modules/library.js',
        ],
        dest: '<%= dirs.generated %>plugins.js'
    },
    tidycss: {
        src: [
            '<%= dirs.generated %>tidy.css',
            '<%= dirs.generated %>effeckt.css',
            '<%= dirs.generated %>simptip.css',
            'node_modules/jsonlylightbox/css/lightbox.css',

            '<%= dirs.generated %>perfect-scrollbar.css',
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
            browsers: ['last 3 versions', '> 1%', 'Safari >= 6']
        },
        files: [
            {
                src : ['<%= dirs.generated %>effeckt.css','css/main.css','<%= dirs.generated %>simptip.css','<%= dirs.generated %>perfect-scrollbar.css','css/topcoat-desktop-dark.css'],
                cwd : '',
                dest : '<%= dirs.output %>assets/',
                expand : true
            },

        ]
    },
    tidy: {
        options: {
            browsers: ['last 3 versions', '> 1%', 'Safari >= 6']
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
                '../css/jqui-icons.css',
                /*'../<%= dirs.generated %>effeckt.css'*/
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
            '<%= dirs.generated %>icons.include': ['svg/icons/*.svg'],
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
            '<%= dirs.generated %>layouts.include': ['svg/layouts/*.svg'],
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
                '<%= dirs.generated %>plugins.js',
                'js/main.js'
            ]}
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
			src: 'img/aersia.svg',
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
							content: 'img/aersia-silhouette.svg',
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
							content: 'img/aersia-silhouette.svg',
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

grunt.registerTask('scss', ['sass_globbing:effeckt','sass']);
grunt.registerTask('css', ['uncss:tidy','concat:tidycss','autoprefixer:tidy','cssmin:tidy']);

grunt.registerTask('js', ['concat:js','copy:js','copy:nodeModules','template-js']);
grunt.registerTask('dev', ['connect', 'watch']);
grunt.registerTask('watchnow', ['watch']);

grunt.registerTask('full-deploy', [
    // Build node-modules
    'shell:ps','shell:logger',

    // Compile CSS files
    'scss','css',

    // Put together the JS files
    'js','modernizr',

    // Prepare static resources
    'svgstore:icons','svgstore:layouts','realFavicon','copy:root','copy:font','image:img',

    // Template files
    'template:html'
]);

grunt.registerTask('full-development-deploy', ['set-development','full-deploy']);

grunt.registerTask('template-all', ['prepare-variables','template:html','template:js']);
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

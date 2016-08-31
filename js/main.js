/////
// /*%= friendlyname */ v/*%= version */
//
//To do tags:
//	CSS: Ongoing changes to the CSS.
//	REWORK: Changes to do in the future.
//	MOREFILE: Move this out into a compiled library file in the future
//	FUTURE: Stuff to do much later.
/////
//"use strict";
/* jshint
	maxerr:1000, eqeqeq: true, eqnull: false, unused: false, loopfunc: true
*/
/* jshint -W116 */
(function() {

	//Initialize Angular app
	var app = angular.module("aersia", [ ]);

	app.controller("aersiaController", ['$scope','$http', function($scope,$http) {
		this.friendlyname = "/*%= friendlyname */";
		this.version = "/*%= version */";

		/////
		// Library initializations

		// Create the lightbox
		this.lightbox = new Lightbox();
		this.lightbox.load({
			'preload': false,
			'controls': false,
			'nextOnClick': false
		});

		// Initialize the share button
		var clipboard = new Clipboard(document.getElementById('copyBtn'), {
			text: function(btn) {
				this.success("Share link copied to clipboard.");

				return window.location.href + '#' + encodeURIComponent( this.selectedPlaylist + '|' + this.curSong );
			}.bind(this)
		});

		//Init logger
		Logger.useDefaults({
		    logLevel: Logger.WARN,
		    formatter: function (messages, context) {
		        messages.unshift('[Aersia]');
		        if (context.name) messages.unshift('[' + context.name + ']');
		    }
		});
		Logger.get('internals').setLevel(Logger.ERROR);
		Logger.get('player').setLevel(Logger.ERROR);
		Logger.get('animation').setLevel(Logger.ERROR);
		Logger.get('songart').setLevel(Logger.ERROR);

		//js-cookie variables
		this.cookieName = "aersia";
		this.cookieConfig = { };

		//Initialize variables
		this.songs = [];
		this.noShuffles = {};
		this.curSong = 0;
		this.autoplay = true;
		this.playing = false;
		this.playtries = 0;
		this.prevVolume = 0;
		this.history = [];
		this.historyPosition = 0;
		this.preferredFormats = [ "opus","ogg","m4a","mp3" ];

		// UI variables
		this.lastTimeText = '';
		this.lastLoadText = '';
		this.fullyLoaded = 0;
		this.optionsBoxShown = false;

		this.songArt = {
			placeholder: true,
			placeholdersrc: 'assets/img/placeholder.png',

			rotating: false,
			curArt: false,
			nextArt: false,

			timer: false,
			period: 10000,
		};

		this.selectedLayout = "Classic";

		this.layouts = {
			"Classic": {
				"class": "layout-classic",
				"href": "layout-classic",
				"features": ["controls","timeline","timeTextUpdate","progressUpdate","playlist","animations","options","songImg"]
			},
			"Touch": {
				"class": "layout-touch",
				"href": "layout-touch",
				"features": ["controls","timeline","timeTextUpdate","progressUpdate","playlist","animations","options","songImg"]
			},
			"Streambox": {
				"class": "layout-streambox",
				"href": "layout-streambox",
				"features": ["timeTextUpdate", "progressUpdate", "streambox","options","songImg"]
			},
			"Streambar": {
				"class": "layout-streambar",
				"href": "layout-streambar",
				"features": ["controls","timeTextUpdate","progressUpdate","options"]
			},
		};

		//Playlists
		this.lastPlaylist = "";
		this.selectedPlaylist = "VIP";
		this.playlists = {
			"VIP": {
				"url": "/roster.json",
				//"url": "http://vip.aersia.net/roster.xml",
				"longName": "Vidya Intarweb Playlist",
			},
			"VIP - Source": {
				"url": "http://vip.aersia.net/roster-source.xml",
				"longName": "Vidya Intarweb Playlist - Source Edition",
			},
			"VIP - Exiled": {
				"url": "http://vip.aersia.net/roster-exiled.xml",
				"longName": "Vidya Intarweb Playlist - Exiled Edition",
			},
			"VIP - Mellow": {
				"url": "http://vip.aersia.net/roster-mellow.xml",
				"longName": "Vidya Intarweb Playlist - Mellow Edition",
			},
			"WAP": {
				"url": "http://wap.aersia.net/roster.xml",
				"longName": "Weeaboo Anime Playlist",
			}
		};

		// Create a bogus link to download stuff with
		this.download = document.head.appendChild(document.createElement('a'));
		this.download.style = "display:none;visibility:hidden;";
		this.download.download = "aersiaStyle.json";

		// Create a bogus file input to upload stuff with
		this.upload = document.head.appendChild(document.createElement('input'));
		this.upload.style = "display:none;visibility:hidden;";
		this.upload.type = "file";
		this.styleReader = new FileReader();

		//Grab DOM elements
		this.player = document.getElementsByTagName("audio")[0];
		this.playlist = document.getElementById("playlist");

		this.tabs = document.getElementsByClassName("effeckt-tabs")[0];
		this.optionsbox = document.getElementsByClassName("optionsbox")[0];
		this.layoutbox = document.getElementById("layoutbox");

		this.streambox = document.getElementById("streambox");

		this.mainControls = document.getElementById("mainControls");
		this.playpause = document.getElementById("playpause");
		this.timeText = document.getElementById("timeText");
		this.timeline = document.getElementById("timeline");
		this.timebox = document.getElementById("timebox");
		this.controlsInfoBox = document.getElementById("controlsInfoBox");
		this.loadBar = document.getElementById("loadBar");
		this.playedBar = document.getElementById("playedBar");
		this.playhead = document.getElementById("playhead");
		this.loadPct = document.getElementById("loadPct");
		this.volumeBar = document.getElementById("volumeBar");

		this.messagebox = document.getElementById("messagebox");

		this.toggleShuffleBtn = document.getElementById("toggleShuffle");

		this.loadglobal = document.getElementById("loadglobal");

		this.songUI = {
			'Streambox': {
				'title': document.getElementById("sboxSongTitle"),
				'creator': document.getElementById("sboxSongCreator"),
				'img': document.getElementById("sboxSongImg"),
			},
			'Streambar': {
				'title': document.getElementById("controlsSongTitle"),
				'creator': document.getElementById("controlsSongCreator"),
			},
			'default': {
				'title': document.getElementById("oboxSongTitle"),
				'creator': document.getElementById("oboxSongCreator"),
				'img': document.getElementById("oboxSongImg"),
			}
		};

		this.hookSongArtElement = function(el) {
			addEvent(el, window.transitionEnd, function() {
				if( classie.hasClass(el,"fadeout") )
				{
					if( ! this.songArt.rotating )
					{
						// If the rotation was cancelled for any reason, break out.
						return;
					}

					// Grab the art in question
					if( this.curSong == null || this.songArt.nextArt === false ||
						this.songs[this.curSong] == null || this.songs[this.curSong].art == null ||
						this.songs[this.curSong].art[this.songArt.nextArt] == null
					)
					{
						Logger.get("songart").error("Faded out, but "+this.curSong+" + "+this.songArt.nextArt+" did not point to valid art!");
						return;
					}

					Logger.get("songart").debug("Faded out, switched song art.");
					this.songArt.placeholder = false;
					el.src = 'http://mobygames.com'+this.songs[this.curSong].art[this.songArt.nextArt].thumbnail;

					// Pick next art, wrap index if necessary.
					this.songArt.curArt = this.songArt.nextArt;
					this.songArt.nextArt++;
					if( this.songArt.nextArt > this.songs[this.curSong].art.length - 1 )
					{ this.songArt.nextArt = 0; }
				}
			}.bind(this));

			// Fade back in whenever the image finishes loading.
			addEvent(el,"load", function() {
				Logger.get("songart").debug("Song art loaded, fading in.");

				// Trigger the object-fit polyfill
				objectFitImages(el);

				classie.removeClass(el,"fadeout");
			}.bind(this) );

			addEvent(el,"error", function() {
				Logger.get('songart').error("Unable to load song art, setting placeholder.");
				this.stopSongArt();
			}.bind(this) );

			// Trigger the object-fit polyfill for the first time
			objectFitImages(el);

			// Load the image lightbox on click.
			addEvent(el,'click',function(){
				if( this.songArt.placeholder === true )
				{ return;	}

				if(
					this.curSong == null || this.songArt.curArt === false ||
					this.songs[this.curSong] == null || this.songs[this.curSong].art == null ||
					this.songs[this.curSong].art[this.songArt.curArt] == null
				)
				{ return; }

				Logger.get("songart").debug("Opened full art Lightbox");

				this.lightbox.open('http://mobygames.com'+this.songs[this.curSong].art[this.songArt.curArt].fullsize);
			}.bind(this));

		}.bind(this);

		// Hook any layouts that have the songImg
		Object.keys(this.songUI).forEach(function(val) {
			if( this.songUI[val].img != null )
			{ this.hookSongArtElement( this.songUI[val].img ); }
		}.bind(this));


		/////
		//Styles and Presets
		this.selectedPreset = "Aersia";
		this.currentStyles = {};
		this.styleNodes = {};

		// Presets. This could be loaded from XHR later.
		this.presetStyles = {
			"Aersia": {
				"focus": "#FF9148", // Orange
				"background": "#183C63", // Lighter, main blue
				"contrast": "#003366", // Dark, bordery color
				"active": "#4687ef", // Bright, activey blue
				"scrollbar": "#7f6157", // Dull orange, the back of the scrollbar
				"loadbar": "#635d62", // Dull purple, for things like timeline bg
				"controlsout": {"0%": "#c0ccd9", "100%": "#000c19"}, // The border around the controls
				"controlsin": {"0%": "#3D6389", "100%": "#072d53"}, // The inside of the controls
			},
			//Styles from JSON files
/*%= includedstyles */
		};

		// CSS definitions of where all the colors go
		this.styleCssText = {
			"focus": [
				"g, rect, path { fill: ","; }\n"+
				".controls-container, .playlist-container, .optionsbox, #streambox { color: ","; }\n"+
				"#playedBar, #playhead,	.active-song, .ps-theme-vip>.ps-scrollbar-y-rail>.ps-scrollbar-y, .ps-theme-vip>.ps-scrollbar-x-rail>.ps-scrollbar-x { background-color: ","; }\n"+
				"#volumeBar { border-color: transparent "," transparent transparent; }"
			],
			"background": [
				".playlist-container, .optionsbox { background-color:","; }"
			],
			"contrast": [
				".playlist>li:hover, .active-song { color: ","; }\n"+
				".optionsbox, .sep, .playlist>li, section, .ps-theme-vip>.ps-scrollbar-y-rail, .ps-theme-vip>.ps-scrollbar-x-rail { border-color: ","; }\n"
			],
			"active": [
				".playlist>li:hover, .ps-theme-vip:hover>.ps-scrollbar-y-rail:hover>.ps-scrollbar-y, .ps-theme-vip.ps-in-scrolling>.ps-scrollbar-y-rail>.ps-scrollbar-y, .ps-theme-vip:hover>.ps-scrollbar-x-rail:hover>.ps-scrollbar-x, .ps-theme-vip.ps-in-scrolling>.ps-scrollbar-x-rail:hover>.ps-scrollbar-x { background-color: ","; }"
			],
			"scrollbar": [
				".ps-theme-vip>.ps-scrollbar-x-rail, .ps-theme-vip>.ps-scrollbar-y-rail { background-color: ","!important; }"
			], //  .ps-theme-vip.ps-in-scrolling>.ps-scrollbar-x-rail, .ps-theme-vip.ps-in-scrolling>.ps-scrollbar-y-rail, .ps-theme-vip:hover>.ps-scrollbar-y-rail:hover, .ps-theme-vip:hover>.ps-scrollbar-x-rail:hover
			"loadbar": [
				"#loadBar { background-color: ","; }"
			],
		};


		this.styleCssGradientText = {
			"controlsout": ".controls-container, .effeckt-tabs",
			"controlsin": ".controls-container>div, .effeckt-tabs>li, #streambox",
		};

		//Give each style its own stylesheet node.
		Object.keys(this.styleCssText).forEach(function(val) {
			this.styleNodes[val] = document.head.appendChild(document.createElement('style'));
		}.bind(this));

		Object.keys(this.styleCssGradientText).forEach(function(val) {
			this.styleNodes[val] = document.head.appendChild(document.createElement('style'));
		}.bind(this));


		// Add a box for each layout in the layoutsbox.
		Object.keys(this.layouts).forEach(function(key) {
			var container = document.createElement("div");
			classie.addClass(container,"vbox");
			classie.addClass(container,"centertext");

			var div = document.createElement("div");
			container.appendChild(div);

			//Why do I need a namespace for this, what is even the difference in the markup??
			var svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
			svg.setAttribute("height","120px");
			svg.setAttribute("width","120px");
			div.appendChild(svg);

			//Why do I need a namespace for this, what is even the difference in the markup??
			var use = document.createElementNS("http://www.w3.org/2000/svg","use");
			use.setAttributeNS('http://www.w3.org/1999/xlink', 'href',"#"+this.layouts[key].href);
			svg.appendChild(use);

			var name = document.createElement("div");
			name.innerHTML = key;
			container.appendChild(name);

			this.layoutbox.appendChild(container);
			container.onclick = function() {
				this.switchLayout(key);
			}.bind(this);
		}.bind(this));

		/////
		// Initalize scrollbar
		Ps.initialize(this.playlist, {
			theme: 'vip',
			minScrollbarLength: 20
		});

		//Bind it to update when window resizes.
		addEvent(window,"resize", function() {
			Ps.update(this.playlist);
		}.bind(this));

		/////
		// Bind to check the hash when it updates
		window.onhashchange = function() {
			var hash = this.decodeHash();
			if( hash[0] !== false ) {
				this.loadPlaylist(hash[1]);
			} else {
				this.playSong(hash[1]);
			}

			// Consume the hash so it won't screw up reloads.
			window.location.hash = '';

		}.bind(this);

		/////
		// Mbox functions
		this.closembox = function () { classie.addClass(this.messagebox,"hidden"); }.bind(this);
		this.internalerror = function (str) { this.error("Internal error: "+str+" Please report this along with a screenshot to the webmaster."); }.bind(this);
		this.success = function (str) { this._mbox_manip('mboxsuccess',str); }.bind(this);
		this.error = function (str) { this._mbox_manip('mboxerror',str); }.bind(this);
		this.info = function (str) { this._mbox_manip('mboxinfo',str); }.bind(this);
		this._mbox_manip = function (destclass,str) {
			classie.removeClass(this.messagebox,"hidden");
			classie.removeClass(this.messagebox,"mboxerror");
			classie.removeClass(this.messagebox,"mboxsuccess");
			classie.removeClass(this.messagebox,"mboxinfo");

			classie.addClass(this.messagebox,destclass);

			this.messagebox.children[0].innerHTML = str;
		}.bind(this);

		this.mboxclosebutton = document.getElementById('mboxclose');
		addEvent(this.mboxclosebutton,"click",this.closembox);


		/////
		// To enable layouts to swap functions on and off, here is an object of status and hooks.
		this.features = {
			"controls": {
				"enable": function() {
					classie.removeClass(this.mainControls,"hidden");
				},
				"disable": function() {
					classie.addClass(this.mainControls,"hidden");
				},
			},
			"timeline": {
				"enable": function() {
					classie.removeClass(this.timebox,"hidden");
					classie.addClass(this.controlsInfoBox,"hidden");

					this.timeText = document.getElementById("timeProgText");
					this.loadPct = document.getElementById("timeLoadPct");

					addEvent(this.player,"timeupdate", this.timelineUpdate);
					this.timelineUpdate();

					this.updateCurSongInfo();
				},
				"disable": function() {
					classie.addClass(this.timebox,"hidden");
					classie.removeClass(this.controlsInfoBox,"hidden");

					this.timeText = document.getElementById("controlsProgText");
					this.loadPct = document.getElementById("controlsLoadPct");

					removeEvent(this.player,"timeupdate", this.timelineUpdate);

					this.updateCurSongInfo();
				},
			},
			"playlist": {
				"enable": function() {
					classie.removeClass(this.playlist,"hidden");
				},
				"disable": function() {
					//here's where I would prevent a new playlist from loading up while this is disabled.
					classie.addClass(this.playlist,"hidden");
				},
			},
			"options": {
				"enable": function() {
					classie.removeClass(this.tabs,"hidden");
				},
				"disable": function() {
					classie.addClass(this.tabs,"hidden");
					this.toggleOptionsBox(false);
				},
			},
			"streambox": {
				"enable": function() {
					classie.removeClass(this.streambox,"hidden");
				},
				"disable": function() {
					classie.addClass(this.streambox,"hidden");
				},
			},
			"timeTextUpdate": {
				"enable": function() {
					addEvent(this.player,"timeupdate", this.timeTextUpdate);
					this.timeTextUpdate();
				},
				"disable": function() {
					removeEvent(this.player,"timeupdate", this.timeTextUpdate);
				},
			},
			"progressUpdate": {
				"enable": function() {
					addEvent(this.player,"timeupdate",this.progressUpdate); // not progress, it doesn't fire reliably
					this.progressUpdate();
				},
				"disable": function() {
					removeEvent(this.player,"timeupdate",this.progressUpdate);
				},
			},

			"animations": {
				"enable": function() {
					// this.animationsEnabled = true;
				},
				"disable": function() {
					// this.animationsEnabled = false;
				},
			},

			"songImg": {
				"enable": function() {
					// this.animationsEnabled = true;
					this.updateCurSongInfo();
				},
				"disable": function() {
					// this.animationsEnabled = false;
				},
			},

		};

		// Forces a feature on or off regardless. This is only set by the user.
		this.overrideFeatures = {};

		this.enableFeature = function(feature) {
			if( this.features[feature] != null && this.features[feature].enabled !== true )
			{
				if( this.features[feature].enable != null )
				{ this.features[feature].enable.call(this); }

				this.features[feature].enabled = true;
				Logger.get("internals").info(feature+" enabled.");
			}
		}.bind(this);

		this.disableFeature = function(feature) {
			if( this.features[feature] != null && this.features[feature].enabled !== false )
			{
				if( this.features[feature].disable != null )
				{ this.features[feature].disable.call(this); }

				this.features[feature].enabled = false;
				Logger.get("internals").info(feature+" disabled.");
			}
		}.bind(this);

		this.toggleFeature = function(feature) {
			if( this.features[feature] != null )
			{
				if(  this.features[feature].enabled != null && this.features[feature].enabled )
				{
					this.disableFeature(feature);
				} else {
					this.enableFeature(feature);
				}
			}
		}.bind(this);


		/////
		//Hook audio player

		//This will be called whenever a song ends.
		addEvent(this.player, "ended", function() {
			if( this.autoplay )
			{ this.shuffleSong(); }
		}.bind(this));

		// This will be called if the player breaks for any reason
		addEvent(this.player, "error", function(ev) {
			// Just retry. If this is called twice without a full playthrough, it will just stop.
			this.playSong(this.curSong,true);
		}.bind(this));

		//This will be called every time a new song loads, and when the song is seeked and begins playing?
		// addEvent(this.player,"canplaythrough", function () {
		// 	Logger.get("internals").info('canplaythrough');
		// }.bind(this));

		//Makes timeline clickable
		this.seekBar = function(e,amt) {

			//Respond to either click or direct invocation
			if( e !== '' )
			{ amt = clickPercent(e,this.timeline); }

			Logger.get("player").debug('Timeline seek: '+amt);
			this.player.currentTime = this.player.duration * amt;
			this.timeUpdate(e);

		}.bind(this);
		addEvent(this.timeline,"click", this.seekBar);

		//This will be called as downloading progresses.
		this.progressUpdate = function(e,amt) {
			var newText = '';

			//Respond to either click or direct invocation.
			if( e !== '' )
			{
				var bufend = 0;
				if( this.player.buffered.length > 0 ) { bufend = this.player.buffered.end(0); }
				if( bufend === this.player.duration )
				{
					if( this.fullyLoaded === 0 )
					{
						amt = 100; // skip rounding
						newText = "100%"; // show this for one tick.
						this.fullyLoaded = 1;
					}
					else
					{
						//We are fully loaded. Show a timestamp instead.
						newText = this.timeFormat(this.player.duration);
					}
				}
				else // get normal percentage
				{
					amt = 100 * (bufend / this.player.duration);
					newText = Math.round(amt) + '%';
				}
			}
			else // use direct input
			{
				newText = Math.round(amt) + '%';
			}

			Logger.get("player").debug('Progress update: '+amt);

			//Don't update the progress if it will look the same.
			if( this.lastLoadText !== newText )
			{
				//Change loadPct text and store value
				this.loadPct.textContent = newText;
				this.lastLoadText = newText;

				//Move loadBar in timeline
				this.loadBar.style.right = (100 - amt) + '%'; // inverse percentage
			}

		}.bind(this);

		//This will be called as the song progresses.
		this.timeTextUpdate = function(e,amt) {
			if( e != null && e !== '' )
			{ amt = this.player.currentTime / this.player.duration; }

			//Don't update the time if it will look the same.
			var newTime = this.timeFormat(this.player.currentTime);
			if( this.lastTimeText !== newTime )
			{ this.timeText.textContent = newTime; this.lastTimeText = newTime; }
		}.bind(this);

		this.timelineUpdate = function(e,amt) {

			if( e != null && e !== '' )
			{ amt = this.player.currentTime / this.player.duration; }

			Logger.get("player").debug('Time update: '+amt);

			// //Move the playhead
			// this.playhead.style.left = amt + "%";
			//
			// //Move the playedBar in the timeline
			// this.playedBar.style.right = amt + "%";

			//REWORK: somehow we need to cache the boundingrect, but for some reason if I don't use it every frame it gets off by a lot.
			//This pixel-perfect version is just to achieve that one-pixel offset effect in the original .swf
			//Move the playhead
			var rect = this.timeline.getBoundingClientRect();
			var clickpx = (rect.right - rect.left) * amt;
			this.playhead.style.left = clickpx + "px";

			//Move the playedBar in the timeline
			this.playedBar.style.right = (((rect.right - rect.left) - clickpx) + 1) + "px";

		}.bind(this);



		//////////////////////
		// Player functions //
		//////////////////////

		/////
		// Playlist Management
		this.loadPlaylist = function(start) {

			if( this.selectedPlaylist == null || this.selectedPlaylist == "" ) { return; }
			if( this.playlists[this.selectedPlaylist] == null ) { Logger.get("player").error("Playlist "+this.selectedPlaylist+" is invalid."); return; }

			if( this.selectedPlaylist !== this.lastPlaylist )
			{
				// Loading a new playlist
				this.showLoading();

				//Stop the song.
				this.pause();
				this.resetControls();

				$http.get(this.playlists[this.selectedPlaylist].url)
					.then(function(res) {
						// Prepare the playlist for use
						var playlist = res.data;

						//Convert it from XML to JSON if necessary
						if( /.xml$/.test(this.playlists[this.selectedPlaylist].url) )
						{
							var x2js = new X2JS();
							playlist = x2js.xml2js(playlist).playlist.trackList.track;
						}

						// Give each song an index -- this is necessary so Angular can track the objects.
						// I really want this bit of code to die.
						for ( var i=0; i<playlist.length; i++ ) {
							playlist[i].index = i;
						}

						//Set the song list
						this.songs = playlist;

						this.lastPlaylist = this.selectedPlaylist;

						// Update the window's title.
						document.title = this.playlists[this.selectedPlaylist].longName + ' - ' + this.friendlyname + ' v' + this.version;

						// Hide loading, in a little while.
						window.setTimeout(this.hideLoading,1000);

						// If we're allowed, start playing.
						if( this.autoplay )
						{
							// If we're supposed to start somewhere, do that. Otherwise, shuffle.
							if( start != null && start !== false )
							{ window.setTimeout(function() { this.playSong(start); }.bind(this),500); }
							else
							{ window.setTimeout(this.shuffleSong,500); }
							// But give Angular's list a little time to update, since it's stupid.
						}
					}.bind(this),

					function(res) {
						//If the request fails for some reason
						this.error("The playlist was not able to be loaded. Please try again or reload the page.");

					}.bind(this)
				);
			}
			else if( start != null && start !== false )
			{
				// Starting a song on this playlist without loading.

				if( this.songs[start] == null ) { Logger.get("player").error("Requested song "+start+" is invalid."); return; }

				this.playSong(start);
			}
		}.bind(this);

		// Wrapper that updates cookie
		this.changePlaylist = function() {
			this.loadPlaylist();
			this.setCookie();
		}.bind(this);

		// Keeps a list of previously played songs, up to 100.
		this.historyTrack = function(idx) {
			if( this.historyPosition < 0 && this.history[(this.history.length-1) + this.historyPosition] !== idx )
			{
				//I think this wipes too many things?
				//We're backed up in the queue, but we're being asked to play a different song. Wipe out the queue so we can store the new one.
				Logger.get("internals").info("History undo stack burst: "+this.history+" @ "+this.historyPosition);
				while( this.historyPosition < 0 ) { this.history.pop(); this.historyPosition++; }
				Logger.get("internals").info("History undo stack end: "+this.history+" @ "+this.historyPosition);
			}

			if( this.historyPosition === 0 )
			{
				// Cut the history list down if it's at capacity
				while( this.history.length > 99 ) { this.history.shift(); }
				this.history.push(idx);
				Logger.get("internals").debug("History queue: "+this.history+" @ "+this.historyPosition);
			}
		}.bind(this);

		// retry overrides attempting to play the same song.
		this.playSong = function(index,retry) {
			if( index == null || index === false ) { return; }
			index = parseInt(index);
			if( index === this.curSong && ( retry == null || retry === false )) { return; }

			if( retry == null ) { retry = false; }

			// Error handling
			if( retry && this.playtries > 0 ) {
				// If we've already retried for any reason, don't try again.
				Logger.get("player").error("Cannot play song: "+this.songs[index].title);
				return;
			} else if ( retry ) {
				// If this is our first retry, let's keep track of that.
				this.playtries = 1;
			} else {
				// If we're being asked to play a song and this isn't a retry, let's reset our tries counter.
				this.playtries = 0;
			}

			//Stop and unregister the old song.
			this.pause();
			this.player.src = '';
			if( this.curSong != null && this.playlist.children[this.curSong] != null )
			{ classie.removeClass(this.playlist.children[this.curSong],'active-song'); }

			//log
			if( retry )
			{ Logger.get("player").error("Retrying song: "+this.songs[index].title); }
			else
			{ Logger.get("player").info("Playing song: "+this.songs[index].title); }

			// Set the interface for the new song
			this.curSong = index;
			this.updateCurSongInfo();

			this.fullyLoaded = 0;

			// If this is a retry, we've already done this stuff and don't want to do it again.
			if( ! retry )
			{
				// Set the shuffle control to reflect the disabled state
				if( this.noShuffles[this.selectedPlaylist] != null && this.noShuffles[this.selectedPlaylist].indexOf(this.curSong) > -1 )
				{ classie.addClass(this.toggleShuffleBtn, "toggled"); }
				else
				{ classie.removeClass(this.toggleShuffleBtn, "toggled"); }

				// Highlight the active song
				if( this.curSong != null && this.playlist.children[this.curSong] != null )
				{ classie.addClass(this.playlist.children[this.curSong],'active-song'); }

				// Put this song in history
				this.historyTrack(this.curSong);
			}

			// Play
			if( this.songs[this.curSong].formats != null )
			{
				var selFormat = '';
				try {
					this.preferredFormats.forEach(function(format) {
						if( this.songs[this.curSong].formats[format] != null )
						{ selFormat = format; throw BreakException; }
					});
				} catch(e) { // alert for now, use a message box later
					if (e!==BreakException) throw e;
				}

				if( selFormat === '' )
				{
					Logger.get("player").error("Unable to use any of the provided file formats. Trying location.");
					this.player.src = this.songs[this.curSong].location;
				}
				else {
					Logger.get("player").debug("Selected format "+selFormat);
					this.player.src = this.songs[this.curSong].formats[format];
				}

			}
			else {
				this.player.src = this.songs[this.curSong].location;
			}

			this.play();

			//Trigger the playlist to scroll.
			this.scrollToSong(index);

		}.bind(this);

		this.shuffleSong = function() {

			//Generate a list of indexes we're allowed to play.

			// Make sure this list is defined first.
			if( this.noShuffles[this.selectedPlaylist] == null )
			{ this.noShuffles[this.selectedPlaylist] = []; }

			var list = [];
			for ( var i=0; i<this.songs.length; i++ ) {
				if
				(
					// Ensure we don't play the same song again and
					i !== this.curSong &&

					// it's not in our list of things not to shuffle
					this.noShuffles[this.selectedPlaylist].indexOf(i) === -1
				)
				{
					list.push(i);
				}
			}

			var selected = Math.floor(Math.random() * list.length);

			//Start our random song.
			this.playSong( list[selected] );
		}.bind(this);

		// Forbids or allows a song to be played.
		this.toggleShuffle = function() {
			//If we haven't blocked anything on this playlist yet, give it the structure.
			if( this.noShuffles[this.selectedPlaylist] == null ) { this.noShuffles[this.selectedPlaylist] = []; }

			var pos = this.noShuffles[this.selectedPlaylist].indexOf(this.curSong);
			if( pos === -1 )
			{
				Logger.get("player").info("Disabled shuffle for "+this.curSong);
				this.noShuffles[this.selectedPlaylist].push(this.curSong);
				classie.addClass(this.toggleShuffleBtn,"toggled");
			} else {
				Logger.get("player").info("Enabled shuffle for "+this.curSong);
				this.noShuffles[this.selectedPlaylist].splice(pos,1);
				classie.removeClass(this.toggleShuffleBtn,"toggled");
			}

			this.setCookie();
		}.bind(this);

		// Not used. Should remove.
		this.isCurrentSong = function(index) {
			return index === this.curSong;
		}.bind(this);


		/////
		// Rating functions

		this.rateUp = function() {
			Logger.get("player").info("RateUp");
		};

		this.rateDown = function() {
			Logger.get("player").info("RateDown");
		};

		/////
		// HTML5 audio player control functions, in button order, then helper function order.
		// Assistance from: http://www.alexkatz.me/html5-audio/building-a-custom-html5-audio-player-with-javascript/

		this.play = function() {
			//Reset the readouts
			this.resetControls();

			this.player.play();

			this.playing = true;

			classie.addClass(this.playpause,"toggled");
		}.bind(this);

		this.pause = function() {
			this.player.pause();
			this.playing = false;
			classie.removeClass(this.playpause,"toggled");
		}.bind(this);

		this.togglePlay = function(bool) {
			if( bool !== null ) { bool = !this.playing; }

			if( bool ) { this.play(); }
			else { this.pause(); }
		}.bind(this);

		// Traverses the history queue, or just plays a new song.
		this.seek = function(amt) {
			// var index = this.curSong + amt;
			// if( index >= 0 && index <= this.songs.length )
			// { this.playSong(index); }
			if( amt < 0 )
			{
				if( (this.history.length-1) >= 0 -(this.historyPosition + amt)  )
				{
					this.historyPosition += amt;
					Logger.get("internals").debug("History rewind: "+this.history+" @ "+this.historyPosition);
					this.playSong( // Play the song...
						this.history[ // at history position...
							(this.history.length-1) + this.historyPosition // offset by the end of the history queue.
						]
					);
				}
			}
			else {
				if( this.historyPosition === 0 )
				{
					this.shuffleSong();
				}
				else {
					this.historyPosition += amt;
					this.playSong( // Play the song...
						this.history[ // at history position...
							(this.history.length-1) + this.historyPosition // offset by the end of the history queue.
						]
					);
				}
			}
		}.bind(this);

		this.toggleOptionsBox = function(bool) {
			if( bool == null ) { bool = !this.optionsBoxShown; }
			this.optionsBoxShown = bool;

			// Update the song info before we show the box, just in case
			this.updateCurSongInfo();

			// Toggle hidden class.
			if( this.optionsBoxShown ) { classie.removeClass(this.optionsbox,"hidden"); } else { classie.addClass(this.optionsbox,"hidden"); }

			//Trigger the scrollbar to fix itself.
			Ps.update(this.playlist);
		}.bind(this);

		this.toggleFullscreen = function() {
			toggleFullScreen();
		}.bind(this);

		this.toggleMute = function() {
			//Toggle
			var vol = this.player.volume;
			this.volume('',this.prevVolume);
			this.prevVolume = vol;
		}.bind(this);

		this.volume = function(e,amt) {
			//Respond to either click or direct invocation
			if( e !== '' ) { amt = clickPercent(e,this.volumeBar); }

			amt = Math.pow(amt,2); //Human perception of volume is inverse-square.
			Logger.get("player").info("Volume change: "+amt);
			this.player.volume = amt;
		}.bind(this);

		this.timeFormat = function(sec) {
			var min = Math.floor(sec/60);
			sec = Math.floor(sec % 60);
			return zeroPad(min,2)+':'+zeroPad(sec,2);
		}.bind(this);


		/////
		// UI Functions
		this.resetControls = function() {
			this.timelineUpdate('',0);
			this.timeTextUpdate('',0);
			this.progressUpdate('',0);
		}.bind(this);

		this.toggleScrollSmooth = function() {
			this.features.animations.enabled  = !this.features.animations.enabled; // Angular changes the model before the change
			this.toggleFeature("animations");
			this.setCookie();
		}.bind(this);

		this.scrollToSong = function(index) {

			// this function is called when the layout is set, which happens before the songs are even loaded once.
			if( this.songs.length === 0 )
			{ return; }

			//Get the elements' height, since this could change.
			var height = this.playlist.firstElementChild.offsetHeight;

			var targetY = height * index;

			// If this element would be closer to the end of the list than the viewport allows, just scroll to the bottom to avoid overflowing.
			// The browser should realistically stop this, but every 'set' seems to move a pixel beyond the limit, and the smooth animation sets rapidly, causing a big overflow.
			if( (height * this.songs.length) - targetY < this.playlist.offsetHeight )
			{ targetY = (height * this.songs.length) - this.playlist.offsetHeight; }

			Logger.get("animation").debug('Scroll event: '+this.playlist.scrollTop + ' by interval '+ height +' to '+targetY);

			if( this.features.animations.enabled )
			{
				//Make the playlist scroll to the currently playing song.
				scrollToSmooth(this.playlist, targetY, 600);
			}
			else
			{
				this.playlist.scrollTop = height * index;
			}
		}.bind(this);

		this.setLayout = function(l) {
			this.selectedLayout = l;

			// Remove all the layouts
			Object.keys(this.layouts).forEach(function(layout) { classie.removeClass(document.documentElement,this.layouts[layout].class); }.bind(this));

			// Add the one we want.
			classie.addClass(document.documentElement,this.layouts[this.selectedLayout].class);


			// Enable all features of our layout, and disable everything else.
			Object.keys(this.features).forEach(function(feature) {
				if(
					this.layouts[this.selectedLayout].features.indexOf(feature) > -1 && // layout is supposed to have it on
					( this.overrideFeatures[feature] == null || this.overrideFeatures[feature] === true ) // and it's not forced off
				)
				{
					this.enableFeature(feature);
				} else {
					this.disableFeature(feature);
				}
			}.bind(this));

			// Trigger the playlist to scroll in case the layout is messed up
			this.scrollToSong(this.curSong);

			if( this.features.options.enabled )
			{
				// Open the optionsbox if it's hidden, re-adjust the tab, and set the optionsbox back the way it was.
				// This is done because the tab height will probably have changed when the layout changes.
				var orig = this.optionsBoxShown;
				this.toggleOptionsBox(true);

				var tab = document.getElementsByClassName("effeckt-tab active")[0];
				if( tab != null )
				{
					window.setTimeout( function() {
						Tabs.showTab(tab);
						this.toggleOptionsBox(orig);
					}.bind(this), 500 );
				}
			}

		}.bind(this);

		// Wrapper that updates cookie
		this.switchLayout = function(l) {
			this.setLayout(l);
			this.setCookie();
		}.bind(this);

		this.styleSet = function(type) {
			//Recompile the selected style's node
			this.styleNodes[type].innerHTML = this.styleCssText[type].join(this.currentStyles[type]);
		}.bind(this);

		//Wrapper that updates cookie
		this.changeStyle = function(type) {
			this.styleSet(type);
			this.setCookie();
		}.bind(this);

		this.gradientSet = function(type) {
			//This is really bad. Maybe find a library for this later.
			var begin = this.currentStyles[type]["0%"];
			var end = this.currentStyles[type]["100%"];
			this.styleNodes[type].innerHTML = this.styleCssGradientText[type] + " { \n"+
			"background: "+begin+";\n"+ //Old browsers
			"background: -moz-linear-gradient(top, "+begin+" 0%, "+end+" 100%);\n"+ // FF3.6-15
			"background: -webkit-linear-gradient(top, "+begin+" 0%, "+end+" 100%);\n"+ // Chrome10-25,Safari5.1-6
			"background: linear-gradient(to bottom, "+begin+" 0%, "+end+" 100%);\n"+ // W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+
			"filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='"+begin+"', endColorstr='"+end+"',GradientType=0 );\n"+ // IE6-9
			"}";
		}.bind(this);

		//Wrapper that updates cookie
		this.changeGradient = function(type) {
			this.gradientSet(type);
			this.setCookie();
		}.bind(this);

		this.loadPreset = function() {
			if( this.presetStyles[this.selectedPreset] != null )
			{
				Logger.get("internals").info("Setting preset to "+this.selectedPreset);
				this.currentStyles = this.presetStyles[this.selectedPreset];
				this.reloadStyle();
				this.setCookie();
			}
		}.bind(this);

		//Wrapper that calls them all
		this.reloadStyle = function() {
			Object.keys(this.styleCssText).forEach(function(val) { this.styleSet(val); }.bind(this));
			Object.keys(this.styleCssGradientText).forEach(function(val) { this.gradientSet(val); }.bind(this));
		}.bind(this);

		/////
		// Export and import styles

		this.exportStyles = function() {
			this.triggerDownload(this.currentStyles);
		}.bind(this);

		//This function is called when the FileReader loads, which is called when the file input changes, which is called when user picks file.
		this.importStyles = function(event) {
			Logger.get('internals').info('FileReader loaded file.');
			var result;

			try { result = JSON.parse(event.target.result); }
			catch ( e ) { alert("File does not contain a valid style structure."); }

			if( result != null )
			{
				// Check that all the right things are defined
				try {
					Object.keys(this.currentStyles).forEach(function(key) {
						Logger.get('internals').debug(key);
						if( result[key] == null ) { throw BreakException; }
					}.bind(this));

					this.currentStyles = result;
					this.reloadStyle();
					Logger.get('internals').info('Style imported successfully.');
					this.setCookie();
				} catch(e) { // alert for now, use a message box later
					if (e!==BreakException) throw e;
					alert("Imported style was not formatted correctly.");
				}
			}
		}.bind(this);

		this.upload.onchange = function() {
			Logger.get('internals').info('File input changed.');
			this.styleReader.readAsText(this.upload.files[0]);
		}.bind(this);

		this.styleReader.onload = this.importStyles;


		/////
		// Cookie functions

		this.getCookie = function() {
			var cookie = Cookies.getJSON(this.cookieName);
			if( cookie == null ) {
				// First launch, if this is a touch device, put it into touch mode by default.
				if( isMobile.any() ) { this.switchLayout("Touch"); }
				return 1;
			}

			// Directly mapped properties
			['autoplay','selectedLayout','currentStyles','selectedPreset','selectedPlaylist','noShuffles']
			.forEach(function(val) {
				if( cookie[val] != null && this[val] != null )
				{ this[val] = cookie[val]; }
			}.bind(this));

			// Unpacked properties
			if( cookie.lastVolume != null ) { this.player.volume = cookie.lastVolume; }

			if( cookie.features != null && cookie.features.animations != null && cookie.features.animations.enabled != null )
			{ this.overrideFeatures.animations = cookie.features.animations.enabled; }

			// Triggers
			if( cookie.currentStyles != null ) { this.reloadStyle(); }

			Logger.get("internals").info("Cookie read.");
		}.bind(this);

		this.setCookie = function() {
			Cookies.set(this.cookieName, {
				"autoplay": this.autoplay,
				"features": { "animations": { "enabled": this.features.animations.enabled } },
				"selectedLayout": this.selectedLayout,
				"currentStyles": this.currentStyles,
				"lastVolume": this.player.volume,
				"selectedPreset": this.selectedPreset,
				"selectedPlaylist": this.selectedPlaylist,
				"noShuffles": this.noShuffles,
			}, this.cookieConfig);
			Logger.get("internals").info("Cookie written.");
		}.bind(this);


		/////
		// File downloading and uploading

		this.triggerDownload = function(data) {
			if( typeof data === "object" )
			{ data = JSON.stringify(data,null,'\t'); }

			this.download.href = 'data:application/octet-stream;charset=utf-16le;base64,' + btoa(data);
			this.download.dispatchEvent(new MouseEvent('click'));
			Logger.get('internals').info('File download triggered.');
		}.bind(this);

		this.triggerLinkDownload = function(uri) {
			this.download.href = uri;
			this.download.dispatchEvent(new MouseEvent('click'));
			Logger.get('internals').info('Link download triggered.');
		}.bind(this);

		this.triggerUpload = function() {
			this.upload.dispatchEvent(new MouseEvent('click'));
		}.bind(this);

		// Reads the sharing links
		this.decodeHash = function() {
			var newPlaylist = false;
			var newSong = false;
			if( window.location.hash != null && window.location.hash !== '#' )
			{
				var bits = decodeURIComponent(window.location.hash).substr(1);
				bits = bits.split('|');
				if( this.playlists[bits[0]] != null )
				{
					newPlaylist = bits[0];

					if( bits[1] != null )
					{ newSong = bits[1]; }
				}
			}
			Logger.get("internals").info("Hash decoded: "+newPlaylist+", "+newSong);
			return [newPlaylist,newSong];
		}.bind(this);

		this.updateCurSongInfo = function() {
			// Update the song panel
			if( this.curSong != null && this.songs[this.curSong] != null && (
				 ( (this.selectedLayout === "Classic" || this.selectedLayout === "Touch") && this.optionsBoxShown ) || // In Classic or Touch interface, don't update unless it's visible.
				 ( this.selectedLayout === "Streambox" || this.selectedLayout === "Streambar" )	//In Streambox or Streambar, update.
			 )
			 ){
				this.getUIElement('title').innerHTML = this.songs[this.curSong].title;
				this.getUIElement('creator').innerHTML = this.songs[this.curSong].creator;
				// this.curSongRating.innerHTML = "0"; //this.songs[this.curSong].rating;

				if( this.songs[this.curSong].art != null && this.songs[this.curSong].art.length > 0 )
				{
					this.setSongArt();
				} else {
					this.stopSongArt();
				}

			}
		};

		// Function to get the right elements from the current layouts
		this.getUIElement = function(type) {
			if( this.songUI[this.selectedLayout] != null && this.songUI[this.selectedLayout][type] != null )
			{
				return this.songUI[this.selectedLayout][type];
			} else {
				return this.songUI.default[type];
			}
		}.bind(this);

		// Function to control the song rotation
		this.setSongArt = function() {
			this.stopSongArt();

			this.rotateSongArt();
		}.bind(this);

		// Function to do the actual rotation
		this.rotateSongArt = function() {
			if( this.songArt.rotating === true )
			{
				// We don't need to do anything but trigger the next fade.
				classie.addClass(this.getUIElement('img'),"fadeout");
			}
			else {

				// Set up the cover art rotator. If it's set to placeholder, we'll stomp it immediately.
				if( this.songArt.placeholder === true )
				{
					Logger.get("songart").debug("Stomping song art");
					// Set these variables since we've already done the first rotation.
					this.songArt.placeholder = false;
					this.songArt.curArt = 0;
					this.songArt.nextArt = 1;
					this.getUIElement('img').src = 'http://mobygames.com'+this.songs[this.curSong].art[0].thumbnail;
				}
				else {
					// Fade out. The rest will be triggered automatically.
					Logger.get("songart").debug("Fading out song art.");
					classie.addClass(this.getUIElement('img'),"fadeout");
				}

				if( this.songs[this.curSong].art.length > 1 )
				{
					this.songArt.rotating = true;
					this.songArt.timer = window.setTimeout(this.rotateSongArt, this.songArt.rotateperiod);
				}
			}
		}.bind(this);

		this.stopSongArt = function() {
			// Stop the timer, reset attributes, and show the placeholder.
			window.clearTimeout(this.songArt.timer);
			this.songArt.timer = false;
			this.songArt.rotating = false;
			this.songArt.curArt = false;
			this.songArt.nextArt = 0;
			this.songArt.placeholder = true;
			this.getUIElement('img').src = this.songArt.placeholdersrc;
		}.bind(this);

		/////
		// Loading spinner
		this.showLoading = function() {
			classie.removeClass(this.loadglobal,"hidden");
		}.bind(this);

		this.hideLoading = function() {
			classie.addClass(this.loadglobal,"hidden");
		}.bind(this);


		/////
		// Initialization

		this.init = function() {

			// Assign the default preset to the "current style";
			this.currentStyles = this.presetStyles[this.selectedPreset];

			// Get any stored values that will override our defaults.
			this.getCookie();

			// Enable features in our currently selected layout
			this.setLayout(this.selectedLayout);

			// Detect browser support for file formats and remove any formats that are not supported
			var formats = [];
			this.preferredFormats.forEach(function(format) {
				if( Modernizr.audio[format] != null && Modernizr.audio[format] !== "" )
				{ formats.push(format); }
			}.bind(this));
			this.preferredFormats = formats;

			// Check the window location for a share link. This overrides our starting playlist and song.
			var hash = this.decodeHash();
			if( hash[0] !== false ) { this.selectedPlaylist = hash[0]; }

			//Load up our playlist, this is async and will start playing automatically.
			this.loadPlaylist(hash[1]);

		}.bind(this);

		this.init();

	}]);

})();

// Animation functions
function scrollToSmooth(el,targetScroll,duration) {
    // const   scrollHeight = window.scrollY,
	var		beginScroll = el.scrollTop,
			beginTime = Date.now();

	Logger.get('animation').info('Beginning animation: '+beginTime+' '+beginScroll+' to '+targetScroll);
    requestAnimationFrame(step);
    function step () {
        setTimeout(function() {
					//Get our time diff to scale against.
					var now = Date.now();

					if ( now <= beginTime + duration) {
						//Queue the next frame ahead of time
						requestAnimationFrame(step);

						//This is probably overcomplicated, but this gets the amount we need to add to the initial scroll for our time
		        var mod = easeInOut( now, beginTime,duration, beginScroll,targetScroll );

						Logger.get("animation").debug('anim: '+ (now-beginTime) +' + '+mod);

						//Set the scroll absolutely
						if( beginScroll < targetScroll ) { el.scrollTop = beginScroll + mod; }
						else { el.scrollTop = beginScroll - mod; }

		      } else {
						//Final frame, don't schedule another.
						Logger.get("animation").debug('Ending animation: end:'+ (now > (beginTime + duration))+' s:'+el.scrollTop);

						el.scrollTop = targetScroll;
		      }
		  	}, 15 );
		}
}

function easeInOut(now, beginX,targetX, beginY,targetY ) {
	return ( -1 * Math.pow(((now - beginX) / targetX) - 1,2) + 1 )	// y = -x^2 + 1
	* (Math.abs(targetY-beginY));						// scaled up to the amount that we need to move.
}

function addEvent(object, type, callback) {
    if (object == null || typeof(object) == 'undefined') return;
    if (object.addEventListener) {
        object.addEventListener(type, callback, false);
    } else if (object.attachEvent) {
        object.attachEvent("on" + type, callback);
    } else {
        object["on"+type] = callback;
    }
}

function removeEvent(object, type, callback) {
    if (object == null || typeof(object) == 'undefined') return;
    if (object.removeEventListener) {
        object.removeEventListener(type, callback, false);
    } else if (object.detachEvent) {
        object.detachEvent("on" + type, callback);
    } else {
        object["on"+type] = null;
    }
}

// returns click as decimal (.77) of the total object's width
function clickPercent(e,obj) {
	return (e.pageX - obj.getBoundingClientRect().left) / obj.offsetWidth;
}

//https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
function toggleFullScreen() {
  if (!document.fullscreenElement &&    // alternative standard method
      !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {  // current working methods
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

//coderjoe: http://stackoverflow.com/questions/1267283/how-can-i-create-a-zerofilled-value-using-javascript
function zeroPad (num, numZeros) {
	if( num === 0 ) { return zeroPadNonLog(num,numZeros); }
    var an = Math.abs (num);
    var digitCount = 1 + Math.floor (Math.log (an) / Math.LN10);
    if (digitCount >= numZeros) {
        return num;
    }
    var zeroString = Math.pow (10, numZeros - digitCount).toString ().substr (1);
    return num < 0 ? '-' + zeroString + an : zeroString + an;
}
function zeroPadNonLog(num, numZeros) {
    var n = Math.abs(num);
    var zeros = Math.max(0, numZeros - Math.floor(n).toString().length );
    var zeroString = Math.pow(10,zeros).toString().substr(1);
    if( num < 0 ) {
        zeroString = '-' + zeroString;
    }

    return zeroString+n;
}

//Test for SVG support and polyfill if no. https://css-tricks.com/svg-sprites-use-better-icon-fonts/
/MSIE|Trident/.test(navigator.userAgent) && document.addEventListener('DOMContentLoaded', function () {
  [].forEach.call(document.querySelectorAll('svg'), function (svg) {
	var use = svg.querySelector('use');

	if (use) {
	  var object = document.createElement('object');
	  object.data = use.getAttribute('xlink:href');
	  object.className = svg.getAttribute('class');
	  svg.parentNode.replaceChild(object, svg);
	}
  });
});

//
// function easeOutBounce(t, b, c, d) {
//     if ((t/=d) < (1/2.75)) {
// 		return c*(7.5625*t*t) + b;
// 	} else if (t < (2/2.75)) {
// 		return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
// 	} else if (t < (2.5/2.75)) {
// 		return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
// 	} else {
// 		return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
// 	}
// }


// http://stackoverflow.com/questions/12606245/detect-if-browser-is-running-on-an-android-or-ios-device
var isMobile = {
    Windows: function() {
        return /IEMobile/i.test(navigator.userAgent);
    },
    Android: function() {
        return /Android/i.test(navigator.userAgent);
    },
    BlackBerry: function() {
        return /BlackBerry/i.test(navigator.userAgent);
    },
    iOS: function() {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Windows());
    }
};

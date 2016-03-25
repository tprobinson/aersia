/////
//Vidya Intarweb Playlist
//Version 0.0.1
//Last updated Feb 22, 2016
//
//To do:
//
//  everything
//
//Future:
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
	var app = angular.module("vip", [ ]);

	app.controller("vipController", ['$scope','$http', function($scope,$http) {

		// Create x2js instance with default config
		var x2js = new X2JS();

		//Initialize variables
		this.songs = '';
		this.curSong = '';
		this.autoplay = true;
		this.playing = 0;
		this.prevVolume = 0;

		// UI variables
		this.lastTimeText = '';
		this.lastLoadText = '';
		this.fullyLoaded = 0;
		this.optionsBoxShown = false;
		this.animationsEnabled = true;
		this.touchLayoutEnabled = false;

		//js-cookie variables
		this.cookieName = "vip";
		this.cookieConfig = { };

		//Playlists
		this.selectedPlaylist = "VIP";
		this.playlists = {
			"VIP": {
				"url": "http://vip.aersia.net/roster.xml",
				"longName": "Vidya Intarweb Playlist",
			},
			"WAP": {
				"url": "http://wap.aersia.net/roster.xml",
				"longName": "Weeaboo Anime Playlist",
			}
		};

		//Grab DOM elements
		this.player = document.getElementsByTagName("audio")[0];
		this.playlist = document.getElementById("playlist");

		this.playpause = document.getElementById("playpause");
		this.timeText = document.getElementById("timeText");
		this.timeline = document.getElementById("timeline");
		this.loadBar = document.getElementById("loadBar");
		this.playedBar = document.getElementById("playedBar");
		this.playhead = document.getElementById("playhead");
		this.loadPct = document.getElementById("loadPct");
		this.volumeBar = document.getElementById("volumeBar");

		/////
		//Styles and Presets

		this.selectedPreset = "Default";

		// Presets. This could be loaded from XHR later.
		this.presetStyles = {
			"Default": {
				"focus": "#FF9148", // Orange
				"background": "#183C63", // Lighter, main blue
				"contrast": "#003366", // Dark, bordery color
				"active": "#4687ef", // Bright, activey blue
				"scrollbar": "#7f6157", // Dull orange, the back of the scrollbar
				"loadbar": "#635d62", // Dull purple, for things like timeline bg
				"controlsout": {"0%": "#c0ccd9", "100%": "#000c19"}, // The border around the controls
				"controlsin": {"0%": "#3D6389", "100%": "#072d53"}, // The inside of the controls
			},
			"Cherry": {
				"focus": "#FF9999", // Orange
				"background": "#440000", // Lighter, main blue
				"contrast": "#660000", // Dark, bordery color
				"active": "#FF9999", // Bright, activey blue
				"scrollbar": "#340505", // Dull orange, the back of the scrollbar
				"loadbar": "#340505", // Dull purple, for things like timeline bg
				"controlsout": {"0%": "#d9c0c6", "100%": "#19000a"}, // The border around the controls
				"controlsin": {"0%": "#d4223a", "100%": "#530615"}, // The inside of the controls
			}
		};

		//Currently set styles
		this.currentStyles = {
			"focus": "#FF9148", // Orange
			"background": "#183C63", // Lighter, main blue
			"contrast": "#003366", // Dark, bordery color
			"active": "#4687ef", // Bright, activey blue
			"scrollbar": "#7f6157", // Dull orange, the back of the scrollbar
			"loadbar": "#635d62", // Dull purple, for things like timeline bg
			"controlsout": {"0%": "#c0ccd9", "100%": "#000c19"}, // The border around the controls
			"controlsin": {"0%": "#3D6389", "100%": "#072d53"}, // The inside of the controls
		};

		// CSS definitions of where all the colors go
		this.styleCssText = {
			"focus": [
				"g, path { fill: ","; }\n"+
				".controls-container, .playlist-container, .optionsbox { color: ","; }\n"+
				"#playedBar, #playhead, .active-song { background-color: ","; }\n"+
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
				".playlist>li:hover { background-color: ","; }"
			],
			"scrollbar": [
				".ps-theme-vip.ps-active-x>.ps-scrollbar-x-rail, .ps-theme-vip.ps-active-y>.ps-scrollbar-y-rail { background-color: ","; }"
			],
			"loadbar": [
				"#loadBar { background-color: ","; }"
			],
		};

		this.styleCssGradientText = {
			"controlsout": ".controls-container",
			"controlsin": ".controls-container>div",
		};

		this.styleNodes = {};

		//Give each style its own stylesheet node.
		Object.keys(this.styleCssText).forEach(function(val) {
			this.styleNodes[val] = document.head.appendChild(document.createElement('style'));
		}.bind(this));

		Object.keys(this.styleCssGradientText).forEach(function(val) {
			this.styleNodes[val] = document.head.appendChild(document.createElement('style'));
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
		//Check if the body has the touch class as given by Modernizr

		if( hasClass(document.body,'touch') ) { this.touchLayoutEnabled = true; }


		/////
		//Hook audio player

		//This will be called whenever a song ends.
		addEvent(this.player,"ended", function() {
			if( this.autoplay )
			{ this.shuffleSong(); }
		}.bind(this));

		//This will be called every time a new song loads, and when the song is seeked and begins playing?
		// addEvent(this.player,"canplaythrough", function () {
		// 	console.log('canplaythrough');
		// }.bind(this));

		//Makes timeline clickable
		this.seekBar = function(e,amt) {

			//Respond to either click or direct invocation
			if( e !== '' )
			{ amt = clickPercent(e,this.timeline); }

			// console.log('Timeline seek: '+amt);
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

			// console.log('Progress update: '+amt);

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
		addEvent(this.player,"timeupdate",this.progressUpdate); // not progress, it doesn't fire reliably

		//This will be called as the song progresses.
		this.timeUpdate = function(e,amt) {

			if( e != null && e !== '' )
			// { amt = 100 * (this.player.currentTime / this.player.duration); }
			{ amt = this.player.currentTime / this.player.duration; }

			// console.log('Time update: '+amt);

			// //Move the playhead
			// this.playhead.style.left = amt + "%";
			//
			// //Move the playedBar in the timeline
			// this.playedBar.style.right = amt + "%";

			//This pixel-perfect version is just to achieve that one-pixel offset effect in the original .swf
			//Move the playhead
			var rect = this.timeline.getBoundingClientRect();
			var clickpx = (rect.right - rect.left) * amt;
			this.playhead.style.left = clickpx + "px";

			//Move the playedBar in the timeline
			this.playedBar.style.right = (((rect.right - rect.left) - clickpx) + 1) + "px";

			//Don't update the time if it will look the same.
			var newTime = this.timeFormat(this.player.currentTime);
			if( this.lastTimeText !== newTime )
			{ this.timeText.textContent = newTime; this.lastTimeText = newTime; }

		}.bind(this);
		addEvent(this.player,"timeupdate", this.timeUpdate);

		/////
		// Player functions
		this.loadPlaylist = function() {
			if( this.selectedPlaylist != null && this.selectedPlaylist != "" && this.playlists[this.selectedPlaylist] != null )
			{
				//Stop the song.
				this.pause();
				this.resetControls();

				$http.get(this.playlists[this.selectedPlaylist].url)
					.then(function(res) {
						// Prepare the playlist for use

						//Convert it from XML to JSON
						var playlist = x2js.xml2js(res.data).playlist.trackList.track;

						//Give the song list an index for each song.
						playlist.forEach(function(curValue,index,array) { curValue.index = index; });

						//Set the song list
						this.songs = playlist;

						// Give Angular's list a little time to update, since it's stupid.
						window.setTimeout(function(){
							// Then start playing, if we should do that.
							if( this.autoplay )
							{ this.shuffleSong(); }
						}.bind(this),500);
				}.bind(this));
			}
		}.bind(this);

		// Wrapper that updates cookie
		this.changePlaylist = function() {
			this.loadPlaylist();
			this.setCookie();
		}.bind(this);


		this.playSong = function(song) {

			//Stop and unregister the old song.
			this.pause();
			this.player.src = '';
			if( this.curSong != null && this.curSong !== '' && this.playlist.children[this.curSong.index] != null )
			{ removeClass(this.playlist.children[this.curSong.index],'active-song'); }
			this.curSong = '';

			//log
			console.log("Playing song: "+song.title);

			//Start the new song.
			this.fullyLoaded = 0;
			this.curSong = song;
			addClass(this.playlist.children[this.curSong.index],'active-song');
			this.player.src = song.location;
			this.play();

			//Trigger the playlist to scroll.
			this.scrollToSong(song);

		}.bind(this);

		this.shuffleSong = function() {
			//Start a random song.
			this.playSong(this.songs[Math.floor(Math.random() * this.songs.length)]);
		}.bind(this);

		this.isCurrentSong = function(song) {
			return song.index === this.curSong.index;
		}.bind(this);

		/////
		// HTML5 audio player control functions, in button order, then helper function order.
		// Assistance from: http://www.alexkatz.me/html5-audio/building-a-custom-html5-audio-player-with-javascript/

		this.togglePlay = function(bool) {
			if( bool !== null ) { bool = !this.playing; }

			if( bool ) { this.play(); }
			else { this.pause(); }
		}.bind(this);

		this.play = function() {
			//Reset the readouts
			this.resetControls();

			this.player.play();
			this.playing = 1;

			addClass(this.playpause,"controlsPlaying");
		}.bind(this);

		this.pause = function() {
			this.player.pause();
			this.playing = 0;
			removeClass(this.playpause,"controlsPlaying");
		}.bind(this);

		this.seek = function(amt) {
			var index = this.curSong.index + amt;
			if( index >= 0 && index <= this.songs.length )
			{ this.playSong(this.songs[index]); }
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
			console.log("Volume change: "+amt);
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
			this.timeUpdate('',0);
			this.progressUpdate('',0);
		}.bind(this);

		this.scrollToSong = function(song) {

			//Get the elements' height, since this could change.
			var height = this.playlist.firstElementChild.offsetHeight;

			//console.log('Scroll event: '+this.playlist.scrollTop + ' by interval '+ height +' to '+height*this.curSong.index);

			if( this.animationsEnabled )
			{
				//Make the playlist scroll to the currently playing song.
				scrollToSmooth(this.playlist,height * this.curSong.index, 600);
			}
			else
			{
				this.playlist.scrollTop = height*this.curSong.index;
				// Ps.update(this.playlist); // update the scrollbar
			}
		}.bind(this);

		this.toggleOptionsBox = function() {
			this.optionsBoxShown = !this.optionsBoxShown;
		}.bind(this);

		this.toggleTouchLayout = function() {
			toggleClass(document.body,'touch');

			//Trigger the playlist to scroll in case the layout is messed up
			this.scrollToSong(this.curSong);
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
				console.log("Setting preset to "+this.selectedPreset);
				this.currentStyles = this.presetStyles[this.selectedPreset];
				this.reloadStyle();
			}
		}.bind(this);

		//Wrapper that calls them all
		this.reloadStyle = function() {
			Object.keys(this.styleCssText).forEach(function(val) { this.changeStyle(val); }.bind(this));
			Object.keys(this.styleCssGradientText).forEach(function(val) { this.changeGradient(val); }.bind(this));
		}.bind(this);


		/////
		// Cookie functions

		this.getCookie = function() {
			var cookie = Cookies.getJSON(this.cookieName);
			if( cookie == null ) { return 1; }

			// Directly mapped properties
			['autoplay','animationsEnabled','touchLayoutEnabled','currentStyles','selectedPreset','selectedPlaylist']
			.forEach(function(val) {
				if( cookie[val] != null && this[val] != null )
				{ this[val] = cookie[val]; }
			}.bind(this));

			// Unpacked properties
			if( cookie.lastVolume != null ) { this.player.volume = cookie.lastVolume; }

			// Triggers
			if( cookie.currentStyles != null ) { this.reloadStyle(); }
		}.bind(this);

		this.setCookie = function() {
			Cookies.set(this.cookieName, {
				"autoplay": this.autoplay,
				"animationsEnabled": this.animationsEnabled,
				"touchLayoutEnabled": this.touchLayoutEnabled,
				"currentStyles": this.currentStyles,
				"lastVolume": this.player.volume,
				"selectedPreset": this.selectedPreset,
				"selectedPlaylist": this.selectedPlaylist,
			}, this.cookieConfig);
		}.bind(this);

		/////
		// Initialization

		this.init = function() {

			// Get any stored values that will influence our starting parameters.
			this.getCookie();

			//Load up our playlist, this is async and will start playing automatically.
			this.loadPlaylist();

		}.bind(this);

		this.init();

	}]);

})();

// Animation functions
function scrollToSmooth(el,targetScroll,duration) {
    // const   scrollHeight = window.scrollY,
	var		beginScroll = el.scrollTop,
			beginTime = Date.now();

	// console.log('Beginning animation: '+beginTime+' '+beginScroll+' to '+targetScroll);
    requestAnimationFrame(step);
    function step () {
        setTimeout(function() {
			//Get our time diff to scale against.
			var now = Date.now();

            // if ( el.scrollTop < targetScroll && now <= beginTime + duration) {
			if ( now <= beginTime + duration) {
				//Queue the next frame ahead of time
				requestAnimationFrame(step);

				//This is probably overcomplicated, but this gets the amount we need to add to the initial scroll for our time
                var mod =

					//Sin easeIn
					// Math.sin (
					// 	(2 * Math.PI) + 						//beginning at 2Pi to ease in.
					// 	(
					// 		Math.PI/2 							//ending at 3/2Pi
					// 		* ((now - beginTime) / duration)	// multiplied by delta to get where we are on curve
					// 	)
					// ) * (Math.abs(targetScroll-beginScroll));	// scaled up to the amount that we need to move.

					//Exponential easeIn
					(-1 * Math.pow(((now - beginTime) / duration) - 1,2) + 1)	// y = -x^2 + 1
					* (Math.abs(targetScroll-beginScroll));						// scaled up to the amount that we need to move.


				//  console.log('anim: '+ (now-beginTime) +' + '+mod);

				//Set the scroll
				if( beginScroll < targetScroll ) { el.scrollTop = beginScroll + mod; }
				else { el.scrollTop = beginScroll - mod; }

            } else {
				//Final frame, don't schedule another.
				// console.log('Ending animation: d:'+deadlock+' end:'+ (now > (beginTime + duration))+' s:'+el.scrollTop);
            	el.scrollTop = targetScroll;
            }
        }, 15 );
    }
}

// function testEase(begin,duration,end) {
// 	var now = begin;
// 	var done = 0;
// 	var i = 0;
// 	while ( !done ) {
// 		i++;
// 		if (i > 1000 ) { done = 1;}
//
// 		var pct = (now-begin) / (end-begin);
//
// 		var mod =
// 			pct *
// 			//the cosine curve scaled by how far we are.
// 			((Math.cos (
// 				Math.PI + //beginning at Pi to ease in
// 				(Math.PI * Math.abs(pct))
// 			) + 1 ) / 2)
// 		;
// 		var delta =
// 		now += mod;
// 			console.log('pct: '+pct+', now: '+now+', mod: '+mod);
// 			if( now  >= end ) { done = 1; }
// 	}
// }

//Class manipulation convenience functions
function hasClass(el, className) {
  if (el.classList)
    return el.classList.contains(className);
  else
    return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));
}

function addClass(el, className) {
  if (el.classList)
    el.classList.add(className);
  else if (!hasClass(el, className)) el.className += " " + className;
}

function removeClass(el, className) {
  if (el.classList)
    el.classList.remove(className);
  else if (hasClass(el, className)) {
    var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
    el.className=el.className.replace(reg, ' ');
  }
}

function toggleClass(el, className) {
	if( hasClass(el,className) ) {
		removeClass(el,className);
	} else {
		addClass(el,className);
	}
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

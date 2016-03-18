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
		this.lastTimeText = '';
		this.lastLoadText = '';
		this.fullyLoaded = 0;
		this.optionsBoxShown = false;
		this.animationsEnabled = true;
		this.touchLayoutEnabled = false;


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

		this.styleSheet = document.createElement('style');
		document.head.appendChild(this.styleSheet);
		this.styles = {
			"focus": { // Orange: #FF9148
				"default": "#FF9148",
				"set": "#FF9148",
				"cssText": [
					"g, path { fill: ","; transition: fill 0.5s ease; }\n"+
					".controls-container, .playlist-container { color: ","; transition: color 0.5s ease; }\n"+
					"#playedBar, #playhead, .active-song { background-color: ","; transition: background-color 0.5s ease; }\n"+
					"#volumeBar { border-color: transparent "," transparent transparent; transition: border-color 0.5s ease; }"
				]
			},
			"background": { // Lighter, main blue: #183C63
				"default": "#183C63",
				"set": "#183C63",
				"cssText": [
					".playlist-container { background-color: ##COLOR##; transition: background-color 0.5s ease; }"
				]
			},
			"contrast": { // Dark, bordery color: #036
				"default": "#003366",
				"set": "#003366",
				"cssText": [
					".playlist>li:hover, .active-song { color: ","; }\n"+
					".playlist>li { border-bottom: 1px solid ","; transition: border-color 0.5s ease; }"
				]

			},
			"active": { // Bright, activey blue: #4687ef
				"default": "#4687ef",
				"set": "#4687ef",
				"cssText": [
					".playlist>li:hover { background-color: ","; }"
				]
			},
			"scrollbar": { // Dull orange, the back of the scrollbar: #7f6157
				"default": "#7f6157",
				"set": "#7f6157",
				"cssText": [

				]
			},
			"loadbar": { // Dull purple, for things like timeline bg: #635d62
				"default": "#635d62",
				"set": "#635d62",
				"cssText": [
					"#loadBar { background-color: ","; transition: background-color 0.5s ease; }"
				]
			}
		};

		//Initalize scrollbar
		Ps.initialize(this.playlist, {
			theme: 'vip',
			minScrollbarLength: 20
		});

		//Bind it to update when window resizes.
		addEvent(window,"resize", function() {
			Ps.update(this.playlist);
		}.bind(this));

		//Check if the body has the touch class as given by Modernizr
		if( hasClass(document.body,'touch') ) { this.touchLayoutEnabled = true; }

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

			if( e !== null )
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

		//Other functions
		this.playSong = function(song) {

			//Stop and unregister the old song.
			this.pause();
			this.player.src = '';
			if( this.curSong !== null && this.curSong !== '' )
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

		this.init = function() {

			//Give the song list an index for each song.
			this.songs.forEach(function(curValue,index,array) { curValue.index = index; });

			//Assign it to the GUI list.
			$scope.songs = this.songs;

			//Make the scrollbar init happen soon
			window.setTimeout(function(){
				if( this.autoplay )
				{ this.shuffleSong(); }
			}.bind(this),1000); // scrollbar initialization

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

		/////
		// Audio player control functions, in button order, then helper function order.
		// Assistance from: http://www.alexkatz.me/html5-audio/building-a-custom-html5-audio-player-with-javascript/

		this.togglePlay = function(bool) {
			if( bool !== null ) { bool = !this.playing; }

			if( bool ) { this.play(); }
			else { this.pause(); }
		}.bind(this);

		this.play = function() {
			//Reset the readouts
			this.timeUpdate('',0);
			this.progressUpdate('',0);

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

		this.styleSet = function() {
			var string = '';
			angular.forEach(this.styles, function(k,type) {
				if( this.styles[type].set !== null && this.styles[type].cssText !== null )
				{
					string += this.styles[type].cssText.join(this.styles[type].set);
				}
			}.bind(this));

			this.styleSheet.innerHTML = ''; // dumps memory of this object
			this.styleSheet.innerHTML = string;
		}.bind(this);

		/////
		// Get our list of songs and initialize.
		$http.get('roster.xml')
			.then(function(res) {
				$scope.vipCtrl.songs = x2js.xml2js(res.data).playlist.trackList.track;
				$scope.vipCtrl.init();
		});
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
	console.log(el);
	console.log(className);
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

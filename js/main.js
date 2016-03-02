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
		this.autoplay = 1;
		this.playing = 0;
		this.prevVolume = 0;

		//Grab DOM elements
		this.player = document.getElementsByTagName("audio")[0];
		this.playlist = document.getElementById("playlist");

		this.time = document.getElementById("time");
		this.timeline = document.getElementById("timeline");
		this.loadPct = document.getElementById("loadPct");
		this.volumeBar = document.getElementById("volumeBar");

		//Initalize scrollbar
		Ps.initialize(this.playlist, {
			theme: 'vip',
			minScrollbarLength: 20
		}); //create scrollbar
		// Ps.update(this.playlist); // update the scrollbar
		// bind it to update whenever the window resizes.
		addEvent(window,"resize",function() {
				Ps.update(this.playlist);
			}.bind(this)
		);

		//Hook audio player
		//This will be called whenever a song ends.
		this.player.onended = function() {
			if( this.autoplay )
			{ this.shuffleSong(); }
		}.bind(this);

		//This will be called every time a new song loads.
		this.player.canplaythrough = function () {
			//Update the song's metadata and use that for our seek bar.
			this.curSong.duration = this.player.duration; // ,aybe don't do this

		};

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
			this.curSong = song;
			addClass(this.playlist.children[this.curSong.index],'active-song');
			this.player.src = song.location;
			this.play();

			//Trigger the playlist to scroll.
			this.scrollToSong(song);
		};

		this.updateSongMetadata = function(song) {

		}.bind(this);

		this.shuffleSong = function() {
			//Start a random song.
			this.playSong(this.songs[Math.floor(Math.random() * this.songs.length)]);
		};

		this.isCurrentSong = function(song) {
			return song.index === this.curSong.index;
		};

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
		};

		this.scrollToSong = function(song) {

			//Get the elements' height, since this could change.
			var height = this.playlist.firstElementChild.offsetHeight;

			console.log(this.playlist.scrollTop + ' by interval '+ height +' to '+height*this.curSong.index);

			//Make the playlist scroll to the currently playing song.
			this.playlist.scrollTo(0,height*this.curSong.index);
			Ps.update(this.playlist); // update the scrollbar

		}.bind(this);




		//
		//
		// function moveplayhead(e) {
		// 	var newMargLeft = e.pageX - timeline.offsetLeft;
		//
		// 	if (newMargLeft = 0 amp;amp; newMargLeft = timelineWidth) {
		// 		playhead.style.marginLeft = newMargLeft + "px";
		// 	}
		// 	if (newMargLeft  0) {
		// 		playhead.style.marginLeft = "0px";
		// 	}
		// 	if (newMargLeft  timelineWidth) {
		// 		playhead.style.marginLeft = timelineWidth + "px";
		// 	}
		// }
		/////
		// Audio player control functions, in button order, then helper function order.
		// Assistance from: http://www.alexkatz.me/html5-audio/building-a-custom-html5-audio-player-with-javascript/

		this.togglePlay = function(bool) {
			if( bool !== null ) { bool = !this.playing; }

			if( bool ) { this.play(); }
			else { this.pause(); }
		};

		this.play = function() {
			this.player.play();
			this.playing = 1;
		};

		this.pause = function() {
			this.player.pause();
			this.playing = 0;
		};

		this.seek = function(amt) {
			var index = this.curSong.index + amt;
			if( index >= 0 && index <= this.songs.length )
			{ this.playSong(this.songs[index]); }
		};

		this.seekBar = function(e,amt) {
			var pct = 0;

			//Respond to either click or direct invocation
			if( e !== '' ) { pct = clickPercent(e,this.timeline); }
			else { pct = amt; }

			//move playhead//Makes timeline clickable
			timeline.addEventListener("click", function (event) {
				moveplayhead(event);
				music.currentTime = duration * clickPercent(event);
			}, false);
			this.player.currentTime = this.song.duration * clickPercent(e,this.timeline);
		};

		this.toggleFullscreen = function() {
			document.body.requestFullscreen();
		};

		this.volumeMute = function() {
			//Toggle
			var vol = this.player.volume;
			this.volume('',this.prevVolume);
			this.prevVolume = vol;
		};

		this.volume = function(e,amt) {
			//Respond to either click or direct invocation
			if( e === '' ) { this.player.volume = amt; }
			else
			{ this.player.volume = clickPercent(e,this.volumeBar); }
		};

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

// Adapted from http://stackoverflow.com/questions/21474678/scrolltop-animation-without-jquery
function scrollToSmooth(scrollLocation,scrollDuration) {
    // const   scrollHeight = window.scrollY,
	var		scrollHeight = window.scrollY,
            scrollStep = Math.PI / ( scrollDuration / 15 ),
            cosParameter = scrollHeight / 2;
    var     scrollCount = 0,
            scrollMargin;
    requestAnimationFrame(step);
    function step () {
        setTimeout(function() {
            if ( window.scrollY != scrollLocation ) {
                    requestAnimationFrame(step);
                scrollCount = scrollCount + 1;
                scrollMargin = cosParameter - cosParameter * Math.cos( scrollCount * scrollStep );
                window.scrollTo( 0, ( scrollHeight - scrollMargin ) );
            }
        }, 15 );
    }
}

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
	return (e.pageX - obj.offsetLeft) / obj.offsetWidth;
}


});

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

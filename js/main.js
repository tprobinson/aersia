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

	//Helper functions



	//Initialize Angular app
	var app = angular.module("vip", [ ]);



	app.controller("vipController", function($scope,$http) {
		/////
		//Init XML2JSON
		// Create x2js instance with default config
		var x2js = new X2JS();

		this.songs = '';
		this.curSong = '';
		this.autoplay = 1;

		this.player = document.getElementsByTagName("audio")[0];
		this.playlist = document.getElementById("playlist");
		Ps.initialize(this.playlist, { theme: 'vip'}); //create scrollbar
		Ps.update(this.playlist); // update the scrollbar



		this.player.onended = function() {
			//Playing finished, shuffle if we autoplay.
			if( this.autoplay )
			{ this.shuffleSong(); }
		}.bind(this);

		this.playSong = function(song) {

			//Stop and unregister the old song.
			this.player.pause();
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
			this.player.play();

			//Trigger the playlist to scroll.
			this.scrollToSong(song);

		};

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

		/////
		// Get our list of songs.
		$http.get('roster.xml')
			.then(function(res) {
				$scope.vipCtrl.songs = x2js.xml2js(res.data).playlist.trackList.track;
				$scope.vipCtrl.init();
			});
	});

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

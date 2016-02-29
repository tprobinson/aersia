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

	var autoplay = 1;

	app.controller("vipController", function($scope,$http) {
		/////
		//Init XML2JSON
		// Create x2js instance with default config
		var x2js = new X2JS();

		this.songs = '';
		this.curSong = '';

		this.player = document.getElementsByTagName("audio")[0];

		this.player.addEventListener('ended', function() {
			//Playing finished, shuffle if we autoplay.
			if( autoplay )
			{ this.shuffleSong(); }
		});

		this.playSong = function(song) {

			//Stop and unregister the old song.
			this.player.pause();
			this.player.src = '';
			this.curSong = '';

			//log
			console.log("Playing song: "+song.title);

			//Start the new song.
			this.curSong = song;
			this.player.src = song.location;
			this.player.play();
		};

		this.shuffleSong = function() {
			this.playSong(this.songs[Math.floor(Math.random() * this.songs.length)]);
		};

		this.isCurrentSong = function(song) {
			return song === this.curSong;
		};

		this.init = function() {
			console.log(this.songs);
			$scope.songs = this.songs;
			if( autoplay )
			{ this.shuffleSong(); }
		};


		/////
		//Get our list of songs
		// var vip = this; //preserve our this, since xhr needs this.
		//
		// var xhr = new XMLHttpRequest();
		// xhr.open('GET', 'roster.xml', true);
		// xhr.responseType = 'document';
		// xhr.onload = function(e) {
		// 	if (xhr.readyState === xhr.DONE) {
		//         if (xhr.status === 200) {
		// 			if( this.responseXML === null ) { throw new Error("Error in getting song list."); }
		// 			vip.songs = x2js.dom2js(this.responseXML).playlist.trackList.track;
		// 			vip.init();
		//         }
		//     }
		//
		// };
		//
		// xhr.send();
		$http.get('roster.xml')
			.then(function(res) {
				$scope.songs = x2js.dom2js(this.responseXML).playlist.trackList.track;
			});
	});

})();

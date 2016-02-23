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

	var autoplay = 0;

	var list = [
		{
			creator: "Persona 3",
			title: "Crombie the Zombie - When the Moon's Reaching Out Stars (Dual Version)",
			location: "http://vip.aersia.net/mu/persona3-crombie-whenthemoonsreachingoutstars(dual).m4a"
		},
		{
			creator: "Persona 3",
			title: "Tetsuya Kobayashi - Battle for Everyone's Souls",
			location: "http://vip.aersia.net/mu/persona3-tetsuyakobayashi-battleforeveryonessouls.m4a"
		},
	];

	app.controller("vipController", function() {

		//Get our list of songs
		// var xhr = new XMLHttpRequest();


		this.songs = list;
	});



	app.controller("playController", function() {
		this.curSong = null;

		if( autoplay )
		{
			this.curSong = list[0];
		}

		this.selectSong = function(song) {
			this.curSong = song;
			playSong(this.curSong);
		};

		this.isCurrentSong = function(song) {
			return song === this.curSong;
		};

		this.playSong = function(song) {
			console.log("Playing song: "+song);
		};

		this.log = function(logged) {
			console.log(logged);
		};

	});




})();

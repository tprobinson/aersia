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

$(window).load(function(){
	//Init global UI
	ui.init();

	/////
	//Login

	//Check for session cookie
	var needInput = 0;
	try
	{
		sessiondata = Cookies.getJSON(ui.config.cookieName);
		if( sessiondata == null || sessiondata.token == null )
		{ needInput = 1; }
	}
	catch (e) //the cookie is corrupted somehow and will be removed in loginModal
	{ needInput = 1; }

	//Determine what function is needed to login.
	var func = ui.loginModal.bind(ui);
	var args;
	if( ! needInput )
	{
		func = ui.login.bind(ui);
		args = { user: sessiondata.uid, pass: '', session: sessiondata.token };
	}

	//When login is complete
	func(args)
	.done(function() {
		//this would probably show the list of tabs and such
		if( ! ui.initAuthenticated() )
		{ throw 'up'; }

		ui.closembox(); // remove any "login failed" messages.

		//Set tab as selected
		if( window.location.hash !== '' ) // if I don't check this, it will load 'ui' as the tab.
		{
			ui.currentTab = window['ui'+window.location.hash.replace(/#?tab-/,'')];
		}

		if( ui.currentTab == null )
		//{ ui.internalerror('Could not switch to tab ui'+window.location.hash.replace(/#?tab-/,'')+'.'); }
		{
			window.location.hash='';
			ui.currentTab=ui503;
		}

		//Init that tab
		ui.currentTab.init();
	});
});

//Globals
//Configuration for dynamic UI elements.
var ui = {
	//Common jQuery objects
	$: {
		loading: $(".loading"),
		progress: $(".progress"),
		mbox: $("#messagebox"),
		tabs: $(".nav-tabs"),
		logintext: $("#logintext"),
		statusbox: $(".statusbox"),

		dcbtn: $(), //dynamically loaded
		logout: $(),
		commit: $("#commit"),
		cancel: $("#cancel"),
		togglesimple: $(".togglesimple"),
	},

	Modals: null,

	/////
	//Tab hooks
	currentTab: null,

	/////
	//Configuration
	config: {
		hiddenClass: "hidden",
		selectedDC: "DC1",
		DCs: ['DC1','DC2','DC3','DC4','DC5'],

		tabConfig: {
			'503': { name: '503 Filters' },
			'restarts': { name: 'Rolling Restarts', wip: true },
			'migrations': { name: 'Migrations', wip: true },
			'registrations': { name: 'Registrations', wip: true },
			'lff': { name: 'Large File Filter', wip: true },
			'logout': { name: 'Log Out', visibleOverride: true },
		},

		panelContext: $("#tab-panels"),

		cookieName: "console-data",
		cookieConfig: { domain: window.location.hostname, path: window.location.pathname, expires: 7, secure: true },

		prettyPrint: 1,
		//byteLimit: 8192,
		byteLimit: 4096, //This should be 8192, but until I test a LOT more, I don't know how much headers account for or if they do at all.
		inDevelopment: 0,

		statusPingRate: 60000
	},

	req_template: {
		url:"router.php",
		type:"POST",
		data: {},
		//contentType:"application/json; charset=utf-8",			//NET
		crossDomain: true,
		//processData: false, // I could use this if router.php didn't need to parse it
		xhrFields: { withCredentials: true },
		dataType:"json",
	},

	inited: 0,
	init: function() {
		if( this.inited ){ return; }

		//Init other libraries
		this.Modals = Modals.init();

		//Global UI
		//Load any dynamic UI elements

		//Create the button bar and populate the status box
		for( var i=0; i < this.config.DCs.length; i++ )
		{
			/////
			//Based on this HTML:
			//<div class="topcoat-button-bar__item">
			//<button class="topcoat-button-bar__button--large" data-dc="1" >DC1</button>
			//</div>
			/////
			var $ctn = $("<div>").appendTo("#dcbtn-bar")
				.addClass("topcoat-button-bar__item");

			var $btn = $("<button>").appendTo($ctn)
				.addClass("topcoat-button-bar__button--large dcbtn")
				.data("dc", this.config.DCs[i] )
				.text( this.config.DCs[i] )
				.click(this,function(e) {
					//Close the message box
					e.data.closembox();

					if( e.data.currentTab != null && e.data.currentTab.hook_dcbtn != null )
					{
						var $me = $(this);

						//REWORK: this should wait for the tab's hook to return true before setting the config and the button styling.

						//Set this button to be Call-To-Action
						e.data.$.dcbtn.toggleClass('topcoat-button--large--cta',false);
						$me.toggleClass('topcoat-button--large--cta',true);

						//Set global config's selected DC
						e.data.config.selectedDC = $me.data("dc");

						//Signal tab to change DC
						e.data.currentTab.hook_dcbtn(e.data, e.data.config.selectedDC);
					}
				})
			;

			if(this.config.selectedDC == this.config.DCs[i] )
			{ $btn.toggleClass('topcoat-button--large--cta',true); }

			//fixes a topcoat style that I really should fix myself.
			if( this.config.DCs[i] === "DC3" )
			{ $btn.addClass("btnmiddle"); }

			//add to the list of buttons
			this.$.dcbtn = this.$.dcbtn.add($btn);

			//Create a container for the status bar
			var $status = $("<div>")
				.addClass("indicator")
				.data("dc",this.config.DCs[i])
				.append($("<figure>"))
			;

			var $label = $("<span>")
				.text(this.config.DCs[i])
				.prependTo($status)
			;

			this.$.statusbox.append($status);
		}

		window.setTimeout(this.statusCheck.bind(this),0);

		/////
		//Hook global UI elements

		//Close message box when clicked
		this.$.mbox.children(".closebutton")
			.click( function() { this.closembox(); }.bind(this) )
		;

		//Signal tab when certain global buttons are pressed.
		this.$.togglesimple.click( function(){ this.tab_dispatch('hook_togglesimple');}.bind(this) );
		this.$.commit.click( function(){ this.tab_dispatch('hook_commit');}.bind(this) );
		this.$.cancel.click( function(){ this.tab_dispatch('hook_cancel');}.bind(this) );

		//Display a box if it's in dev.
		if( this.config.inDevelopment )
		{ this.info("This page is currently being worked on; it may break or change functionality without warning. Please refresh this page every few minutes until this warning does not appear."); }

		this.inited = 1;
		return 1;
	},

	initedAuthenticated: 0,
	initAuthenticated: function() {
		if( this.inited === 0 ){ return 0; }
		if( this.initedAuthenticated ){ return; }

		//Populate the tab list by checking the user's permissions
		var user = Cookies.getJSON(this.config.cookieName);

		var $tablist = this.$.tabs.children('ul');
		$tablist.html(''); // Clean out dummy tab

		for( var tabname in this.config.tabConfig )
		{
			if( this.config.tabConfig.hasOwnProperty(tabname) ) //avoid catching inherited
			{

				if(
					//The override property exists and forces this, or
					( this.config.tabConfig[tabname].visibleOverride != null || this.config.tabConfig[tabname].visibleOverride ===true ) ||

					//The override property doesn't exist or allows this to occur (not false), and
					( this.config.tabConfig[tabname].visibleOverride == null || this.config.tabConfig[tabname].visibleOverride !== false ) &&

					//The user has permissions to show this tab
					( user.perms.indexOf(tabname) > -1 || user.perms.indexOf('super') > -1 )
				)
				{
					//Create a tab button for the user to click.
					var $btn = $('<li>').append(
						$('<a>')
						.attr( 'href','#tab-'+tabname )
						.text( this.config.tabConfig[tabname].name )
					);

					//Make it cordoned if it's wip.
					if( this.config.tabConfig[tabname].wip != null && this.config.tabConfig[tabname].wip === true )
					{ $btn.addClass('cordon'); }

					//Put it on the list.
					$tablist.append($btn);
				}
				else
				{
					//Remove the tab from the HTML, as it gets in the way otherwise
					console.log("Removing tab "+tabname);
					this.config.panelContext.children('[id="tab-'+tabname+'"]').remove();
				}
			}
		}

		//Update the $ object with the logout tab.
		this.$.logout = $tablist.find('a[href="#tab-logout"]');

		//Attach click hooks to the tabs
		this.$.tabs.easytabs({
			panelContext: this.config.panelContext,
			animate: true,
			animationSpeed: "fast"
		})
		.on('easytabs:before', function(e,clicked,targetPanel,settings) {

			var tabname = targetPanel[0].id.replace(/#?tab-/,'');

			//Find if we have data for that tab
			var varname = 'ui'+tabname;
			if( window['ui'+tabname] == null )
			{
				this.internalerror('Could not switch to tab '+targetPanel+'.');
				return false;
			}

			//Find if the user has permissions for that tab
			//I know checking the cookie for this is not great
			//but as every call is authenticated, it doesn't really matter if they see the tab, it won't load right.
			var user = Cookies.getJSON(this.config.cookieName);
			if( user.perms.indexOf(tabname) === -1 && user.perms.indexOf('super') === -1 )
			{
				this.error("You do not have permissions for the selected tab.");
				return false;
			}

			return true;

		}.bind(this))
		.on('easytabs:midTransition', function(e,clicked,targetPanel,settings) {

			this.currentTab = window['ui'+targetPanel[0].id.replace(/#?tab-/,'')];
			this.currentTab.init();

		}.bind(this))
		;

		//Bind logout button
		this.$.logout.click( function() {
			//Open the cookie and remove the session token and perms.
			user = Cookies.getJSON(this.config.cookieName);
			user.token = undefined;
			user.perms = undefined;
			Cookies.set(this.config.cookieName, user, this.config.cookieConfig);

			//Cookies.remove(this.config.cookieName, this.config.cookieConfig);
			window.location.hash = ''; // override easytabs' behavior
			location.reload();
		}.bind(this));

		this.initedAuthenticated = 1;
		return 1;
	},

	tab_dispatch: function(hook) {
		if ( this.currentTab != null && this.currentTab[hook] != null )
		{ this.currentTab[hook](this); return 1; }
		else { return 0; }
	},

	loginModal: function( args ) {
		if( args == null ){ args = {}; }

		//Display a modal and retrieve user/pw
		var prefill_username = '';

		if( args.prefill_username == null )
		{
			//Grab username from cookie if it exists.
			sessiondata = Cookies.getJSON(this.config.cookieName);
			if( sessiondata != null && sessiondata.uid != null )
			{ prefill_username = sessiondata.uid; }
		}
		else //or if there's an explicit override, use that.
		{ prefill_username = args.prefill_username; }

		//Now remove the cookie, since we have to auth again.
		Cookies.remove(ui.config.cookieName, ui.config.cookieConfig);

		//Prepare a Promise object.
		var promise;
		if( args.parentPromise == null )
		{ promise = $.Deferred(); }
		else
		{ promise = args.parentPromise; }

		Modals.openModal({
			parentPromise: promise,
			content: {
				header: 'Login',
				confirm: 'Go',
				hideNo: true,
				//REWORK: use a multiline please
				body: '<form><div class="hbox"><div class="vbox margins-lr"><span class="labelsmall">Username: </span><input type="text" class="centertext" id="loginusername" value="'+prefill_username+'"></div><div class="vbox margins-lr"><span class="labelsmall">Password: </span><input type="password" class="centertext" id="loginpassword"></div></div></form>'
			},
			yes: function(innerPromise) {
				//If the user hits "Go"
				user = $('#loginusername').val();

				//Try again if the username is blank.
				if( user == null || user === '' )
				{
					this.error("Username cannot be empty.");
					return innerPromise.progress();
				}

				this.login({ user: user, pass: $('#loginpassword').val() })
					.done( innerPromise.resolve )
					.fail( innerPromise.progress )
				;
			}.bind(this),
			no: function(innerPromise) {
				innerPromise.progress(); // progress makes it do nothing, as in, a 'retry'.
			}.bind(this)
		});

		return promise.promise();
	},


	login: function (args) {
		//Prepare a Promise object.
		var promise = $.Deferred();

		//Try authentication
		$.post( window.location.origin+window.location.pathname+"authenticate.php",args)
		.fail(function(data) { //if the script failed, e.g. code 500
			this.internalerror("Code "+data.status+" ("+data.statusText+"), response: "+data.responseText+".");
			return promise.reject();
		}.bind(this))
		.done(function(data) { //This isn't necessarily a success, this just means HTTP 200.
			//Error checking

			//If the script returns something incomprehensible
			try { user = JSON.parse(data); }
			catch (e)
			{
				this.internalerror("Invalid JSON from authenticate.php.");
				console.log(data);
				throw e;
			}

			//If the JSON is valid but doesn't contain what we expect
			if(
				user.success 	== null &&
				user.tokenvalid == null &&
				user.expired    == null &&
				user.error 		== null
			)
			{
				this.internalerror(user.message);
				return promise.reject();
			}

			//If the user's session has expired.
			if( user.expired )
			{
				this.loginModal({parentPromise: promise})
					.done(function() {
						return promise.resolve();
					}.bind(this))
					.fail(function(data) {
						this.internalerror("Unable to re-login").
						console.log('user:');
						console.log(user);
						console.log('data:');
						console.log(data);
						throw 'up';
					}.bind(this))
				;
				return promise.promise();
			}

			//If the script worked, but there was a rational error
			if( user.error )
			{
				this.error(user.message);
				return promise.progress();
			}

			//Otherwise there was a real success. Store the cookie based on information that comes back.

			//It won't send back the token if we authed using one. So let's preserve that.
			var cookie = Cookies.getJSON(ui.config.cookieName);
			if( cookie != null )
			{ user.token = cookie.token; }

			Cookies.set(this.config.cookieName, user, this.config.cookieConfig);

			//Some validation.
			if( user.perms.length === 0 )
			{
				this.internalerror("User authenticated, but permissions blank.");
				promise.reject();
				throw 'up';
			}

			//display message
			this.$.logintext.text("Welcome, "+user.cn+".");

			promise.resolve();
		}.bind(this))
		;

		return promise.promise();
	},

	statusCheck: function() {
		//Send out pings for each DC
		for( var i=0; i < this.config.DCs.length; i++ )
		{
			var DCname = this.config.DCs[i];
			//Preserve the loop's variable using the async request in a IIFE closure
			(function (DCname) {
				this.request({dc: DCname, method: "/status"})
					.done(function(data) {
						var $el = this.$.statusbox.children().filterByData('dc',DCname);

						if( data.alive == 1 )
						{
							if( data.development == 1 )
							{ $el.toggleClass("status-good status-bad",false).toggleClass("status-dev",true); return; }

							$el.toggleClass("status-dev status-bad",false).toggleClass("status-good",true); return;
						}

						$el.toggleClass("status-good status-dev",false).toggleClass("status-bad",true); return;

					}.bind(this))
					.fail(function(data) {
						this.$.statusbox.children().filterByData('dc',DCname)
							.toggleClass("status-good status-dev",false).toggleClass("status-bad",true)
						;
					}.bind(this))
				; // end promise chaining
			}.bind(this))(DCname); // end closure
		}
		window.setTimeout(this.statusCheck.bind(this),this.config.statusPingRate);
	},


	/////
	//Common functions

	//Net functions


	/////
	//Function: ui.request
	//
	//Description: A wrapper for net functions that performs error checking and chunking requests if required.
	//
	//Input:
	//		args: an object
	//			dc: a number
	//			method: the URL to call on the remote server
	//			obj: an object to JSON-encode
	//			parentPromise: in the case of retries, use this promise instead of making a new one.
	//
	//Output: a Promise object. This promise will notify via .success() .fail() and .progress(), or with this form:
	//	caller: $.when( request() ).then(ui.success,ui.error,ui.setProgress)
	// Progress requires jQuery 1.7
	/////
	request: function (args) {

		//Check for bad arguments
		if( args.dc == null || args.method == null )
		{ return 0; }

		//Prepare a Promise object.
		var promise;
		if( args.parentPromise == null )
		{ promise = $.Deferred(); }
		else // don't bury yourself in promises.
		{
			if( args.parentPromise.state() !== "resolved" )
			{ promise = args.parentPromise; }
			else
			{ console.warn("Attempted to chain a resolved promise."); promise = $.Deferred(); }
		}

		//Check for invalid JSON, and format it if desired.
		var json;
		if( args.obj != null )
		{ json = this.stringify(args.obj); }
		if( json === false )
		{ promise.reject("Invalid JSON"); }

		//Base64-encode the JSON string //NET?
		json = btoa(json);

		//Form the request
		request = {'url': args.dc, 'method': args.method, 'body':json};
		requestLength = lengthInUtf8Bytes(JSON.stringify(request));

		//Payload secured, prepare shipment.

		//Check if chunking is required
		if( requestLength >= this.config.byteLimit - 1 ) // I think Apache pads with 2 bytes. Needs testing
		{
			// //Initiate chunking request
			// $.ajax( merge( this.req_template, { method:"/chunktoken_get" } ) )
			// .done(function( data, textStatus, xhr ) {
			// 	if( data.error ) { return promise.reject(xhr.reponseText); }
			// 	if( data.chunkingAllowed )
			// 	{
			// 		request.chunkToken = data.chunkToken;
			//
			// 		window.setTimeout(function(){
			// 			this.sendDataChunk( request, requestLength, this.config.byteLimit, promise);
			// 		}.bind(this) ,0);
			// 	}
			// 	else
			// 	{ promise.reject("Request is too large and chunking is disallowed."); }
			// })
			// .fail( function( xhr ) {
			// 	var msg = xhr;
			//
			// 	// Handle codes that aren't 200.
			// 	if( xhr.status != null && xhr.status !== 200 )
			// 	{
			// 		if( xhr.status === 403 )
			// 		{
			// 			// Login and try this request again.
			// 			this.hideLoading();
			// 			this.loginModal()
			// 			.done(function() {
			// 				args.parentPromise = promise;
			// 				this.request(args).done(function(data) {
			// 					console.log("inner request done");
			// 					console.log(data);
			// 				});
			// 			}.bind(this));
			// 		}
			// 		else { msg = xhr.status+' '+xhr.statusText; }
			// 	}
			//
			// 	if( xhr.responseText != null && xhr.responseText !== "" )
			// 	{ msg = msg+': '+xhr.responseText; }
			//
			// 	promise.reject(msg);
			// }.bind(this))
			// ;

			//Break this out into sendDataChunk or an initializing function like requestChunk
			promise.reject("Request is too large.");
		}
		else
		{
			//Normal request
			$.ajax( merge( this.req_template, { data: request } ) )
			.done(function( data, textStatus, xhr ) {
				if( data.error ) { return promise.reject(data.message); }
				promise.resolve(data); //Send out the data to callbacks.
			}.bind(this))
			.fail( function( xhr ) {
				var msg = xhr;

				// Handle codes that aren't 200.
				if( xhr.status != null && xhr.status !== 200 )
				{
					if( xhr.status === 403 )
					{
						// Login and try this request again.
						this.hideLoading();
						this.loginModal()
						.done(function() {
							args.parentPromise = promise;
							this.request(args);
						}.bind(this));
						return;
					}
					else { msg = xhr.status+' '+xhr.statusText; }
				}

				if( xhr.responseText != null && xhr.responseText !== "" )
				{ msg = xhr.responseText; }

				promise.reject(msg);
			}.bind(this))
			;
		}

		return promise.promise();
	},

	/////
	//Function: sendDataChunk
	//
	//Description: Sends data in chunks.
	//
	//Input:	request: {dc: 1, method: "/rules_set", data: jsonstring}
	//			length: the length in UTF8 bytes of the total request.
	//			maxlen: the maximum number of UTF8 bytes we are allowed to send.
	//			promise: the promise object to message
	//			nextSlice: used mostly internally to track where we are in the slice
	//
	//Output: nothing
	/////
	sendDataChunk: function (request, length, maxlen, promise, nextSlice) {
		if( nextSlice == null || nextSlice === 0 ) {
			//first chunk
			nextSlice = 0;
		}

		//Do the slice
		var ret = utf8Slice(request.body,nextSlice,maxlen);

		//So I don't have to clone this hash every time, let's just save the main body
		var fullBody = request.body;
		request.body = utf8Slice(ret.body,nextSlice,maxlen);
		if( ret.nextSlice >= fullBody.length )
		{ request.final = 1; }

		//send a chunk
		$.ajax( merge( this.req_template, chunkrequest ) )
		.done(function( data, textStatus, xhr ) {
			request.body = fullBody;

			if( data.error ) { return promise.reject(xhr.responseText); }

			if( data.final )
			{
				return promise.resolve(); // no message, caller must provide.
			}
			else
			{
				//update bar and call self again
				chunksSent++;
				promise.progress(nextSlice/length * 100);

				setTimeout( function(){ sendDataChunk(request, length, maxlen, promise, ret.nextSlice); }.bind(this), 0);
			}
		})
		.fail( function(){promise.reject(xhr.responseText); });
	},

	stringify: function (data) {
		//just a wrapper for common formatting and isJSON.
		try {
			if( this.config.prettyPrint )
			{ return JSON.stringify(data,null,"\t"); }
			else
			{ return JSON.stringify(data); }
		} catch (e) {
			return false;
		}
	},

	//UI functions
	setLoading: function (bool) { return this._setLoading(bool,false); },
	setLoadingForever: function (bool) {return this._setLoading(bool,true); },
	hideLoading: function () { return this._setLoading(false,false); },

	_setLoading: function (bool,forever) {

		if( bool == null ) { bool = true; }
		if( forever == null ) { forever = false; }

		if( bool )
		{
			//Preparation before it's shown
			if(forever)
			{ //unset element width so that it can be set via CSS.
				this.$.progress.width("").toggleClass("progress--forever",true);
			}
			else
			{
				this.$.progress.width("0%").toggleClass("progress--forever",false);
			}

			this.$.loading.toggleClass(this.config.hiddenClass,false);
			this.Modals.showOverlay();
		}
		else
		{
			//Remove the forever class regardless
			this.$.progress.toggleClass("progress--forever",false);

			this.$.loading.toggleClass(this.config.hiddenClass,true);
			this.Modals.hideOverlay();
		}
	},

	setProgress: function (pct) {

		//set it visible if it's hidden. (also stop forever-load)
		 this._setLoading(true);

		//if it's not a string, make it one.
		if( ! isNaN(pct) ) { pct = pct+"%"; }

		this.$.progress.width(pct);
	},
	setProgressDone: function () {

		//setting forever's width to 100 would just mess with it
		if( ! this.$.progress.hasClass("progress--forever") )
		{
			this.$.progress.width("100%"); // maybe use progress--done later, and add a check for that to the other loading functions
		}

		//hide the loading screen after a bit.
		setTimeout(function(){ this.hideLoading(); }.bind(this) ,500);
	},

	//Mbox functions
	closembox: function () { this.$.mbox.toggleClass(this.config.hiddenClass,true); },
	internalerror: function (str) { this.error("Internal error: "+str+" Please report this along with a screenshot to the webmaster."); },
	success: function (str) { this._mbox_manip('mboxsuccess',str); },
	error: function (str) { this._mbox_manip('mboxerror',str); },
	info: function (str) { this._mbox_manip('mboxinfo',str); },
	_mbox_manip: function (destclass,str) {
		this.$.mbox.toggleClass(this.config.hiddenClass,false)
			.removeClass('mboxerror mboxsuccess mboxinfo')
			.addClass(destclass)
			.children("span")
			.text(str)
		;
	},


	/////
	//Template objects
	template: {
		proportion:
		{
			"@type": "AlwaysOn",
			"method": "POST",
			"retryAfterMs": 21600000,
			"codes": [503],
			"rule": {
				"@type": "And",
				"rules": [
					{
						"@type": "UriPattern",
						"pattern": "^/dv/api/user/.*/(content(/query)?|file)$",
					},
					{
						"@type": "HeaderIn",
						"name": "X-Client-Platform",
						"values": ["HANDSET"],
					},
					{
						"@type": "HeaderPattern",
						"header": "User-Agent",
						"pattern": "^VZCloud.*",
					},
					{
						"@type": "PercentageOfUsers",
						"proportion": 0,
					},
				],
		   },
		},
	},
};

//Detached DOM
//window.dDOM_mainlist = $("<fake>"); // an empty object is not a detached DOM and cannot be appended to.
//window.dDOM_simplelist = $("<fake>");
//function dDOM_reInit() {
	//discardjQ(dDOM_mainlist);
	//dDOM_mainlist = $("<fake>");

	//discardjQ(dDOM_simplelist);
	//dDOM_simplelist = $("<fake>");
//}


//////////
//503 UI//
//////////

var ui503 = {

	rules: null,

	//Common objects
	$: {
		paneleft: $("#tab-503-ui-base"),
		paneright: $("#tab-503 .output_container"),

		output: $("#tab-503 .output"),
		outputopt: $("#tab-503 .outputopt"),
		outputmodebox: $("#tab-503 .outputmodebox"),
		outhideshow: $("#tab-503 .outhideshow"),
		outmode: $("#tab-503 .outmode"),
		update: $("#tab-503 .updateoutput"),
		autoupdate: $("#tab-503 .autoupdate"),

		add: $("#tab-503 .add"),
		reload: $("#tab-503 button.reload"),

		ruleslist: $("#ruleslist"),
	},
	config: {
		badusersregex: new RegExp("/dv/api/user/\\w+"),
		inBadUsersBlock: 0,
		currentBadUsersBlock: null,
		commitAllowed: 1,

		//Output options
		outputMode: 2, //partial
		outputHidden: 0,
		autoUpdate: 1,
	},

	//REWORK this to have values under tokens, so they can also be friendlyfied
	controls: {
		values: {
			"@type": [
				"AlwaysOn",
				"HeaderIn",
				"UriPattern",
				"HeaderPattern",
				"PercentageOfUsers",
			],
			"method": [
				"POST",
				"GET",
			],
			"codes": [
				"503",
				"404",
			],
			"values": [
				"HANDSET",
				"WEB",
				"CCS",
				"NULL",
			],
		},
		constraints: {
			"proportion": {
				min: 0,
				marks: [25,50,75],
				max: 100,
				simple: true,
			},
			"rangeStart": {
				min: 0,
				marks: [25,50,75],
				max: 99,
			},
			"retryAfterMs": {
				step: 1000,
			},
		},
		type: {
			"@type": "dropdown", // no and/or in this list.
			"method": "dropdown",

			"pattern": "text",
			"header": "text", //should this be a dropdown? probably not

			"retryAfterMs": "number",

			"proportion": "slider",
			"rangeStart": "slider",

			"codes": "array",
			"values": "array",

			"default": "text",
		},
		tokens: {
			"@type": {
				tooltip: {
					label: "Type",
					text: "The type of rule.",
				},
			},

			"method": {
				tooltip: {
					label: "Method",
					text: "The HTTP method to match against.",
				},
			},

			"pattern": {
				tooltip: {
					label: "Pattern",
					text: "A regular expression matched against the URL.",
				},
			},

			"header": {
				tooltip: {
					label: "Header",
					text: "A header to match against.",
				},
			},

			"retryAfterMs": {
				tooltip: {
					label: "Retry Time",
					text: "In milliseconds, how long until the client will check in again.",
				},
			},

			"proportion": {
				tooltip: {
					label: "Proportion",
					text: "Percentage of users to filter out.",
				},
			},
			"rangeStart": {
				tooltip: {
					label: "Range Start",
					text: "Percentage of key space to shift the proportion.",
				},
			},

			"codes": {
				tooltip: {
					label: "Codes",
					text: "HTTP codes to return when the client checks in.",
				},
			},

			"values": {
				tooltip: {
					label: "Values",
					text: "The platform(s) to match against.",
				},
			},

			"name": {
				tooltip: {
					label: "Header Name",
					text: "The value of the header to match against.",
				},
			},
		},

		//Subsets
		block_andor: {
			values: {
				"@type": ["And","Or"]
			},
			tokens: {
				"@type": {
					tooltip: {
						label: "And/Or",
						text: "A logical block to contain more rules that are applied together.",
					},
				},
			},
			constraints: {},
		},

	}, //end controls

	/////
	//Functions

	/////
	//Tab hooks
	hook_dcbtn: function() {
		this.loadRules();
	},

	hook_togglesimple: function(bool) {

		//if( bool || ! $ruleslist.hasClass("simplelist") )
		//{
			////swap out the main list for the simple list.
			//discardjQ(dDOM_mainlist);
			//dDOM_mainlist.empty().append($ruleslist.children().detach());

			//dDOM_simplelist.children().appendTo($ruleslist);

			////this is where I'd do some 3D flip transition.

			////and then here I'd actually detach mainlist

			//$ruleslist.toggleClass('simplelist',true);
		//}
		//else
		//{
			////swap out the simple list for the mainlist
			//discardjQ(dDOM_simplelist);
			//dDOM_simplelist.empty().append($ruleslist.children().detach());

			//dDOM_mainlist.children().appendTo($ruleslist);

			////this is where I'd do some 3D flip transition.

			////and then here I'd actually detach simplelist

			//$ruleslist.toggleClass('simplelist',false);
		//}
		//if( bool || ! $ruleslist.hasClass("simplelist") )
		this.$.ruleslist.toggleClass("simplelist",bool);
	},

	hook_commit: function() {
		//When commit is clicked, post the rules to the daemon if it's allowed and the modal is confirmed.
		if(this.config.commitAllowed)
		{
			Modals.openModal({
				content: "Set Rules in "+this.global.config.selectedDC+"?",
				yes: function(p){
					if( this.sendRules() )
					{ p.resolve(); }
					else
					{ p.reject(); }
				}.bind(this),
				no: function(p) { p.reject(); }
			})
			.done(function() {
				// this.success("");
				//If I really wanted I could have sendRules resolve/reject a promise. That seems...
				// Like a good idea, but hard to think about right now.
			})
			;
		}
		else
		{
			this.error("Rule commit has been disabled.");
		}
	},

	hook_cancel: function() {
		this.loadRules();
	},

	//Globals
	global: ui,
	internalerror: function() { return this.global.internalerror; },
	error: function() { return this.global.error; },
	success: function() { return this.global.success; },

	inited: 0,
	init: function() {
		//Defaults
		if( this.inited ){ return; }

		this.$.ruleslist.addClass("simplelist");

		this.hookStatics();

		this.loadDynamics();

		//load default rules
		this.loadRules();

		this.inited = 1;
	},

	hookStatics: function() {
		//Initial hooks

		//When reload is clicked, do so.
		this.$.reload.click( function() {
			this.hook_cancel();
		}.bind(this));

		//Output options
		this.$.autoupdate.click( function() {
			this.config.autoUpdate = !this.config.autoUpdate;
			this.$.update.toggle();
			this.updateOutput("refresh");
		}.bind(this));

		this.$.outmode.click( function() {
			this.config.outputMode = $(this).data("outputmode");
			this.$.outmode.toggle();
			this.updateOutput("refresh");
		}.bind(this));

		this.$.update.click( function() {
			this.updateOutput("refresh");
		}.bind(this));

		this.$.outhideshow.click( function() {
			this.toggleOutput();
		}.bind(this));

		//hide/show menu
		this.$.outputopt.click( function() {
			this.$.outputopt.children("div").toggleClass(this.config.hiddenClass);
		}.bind(this));


		this.$.add.click( function() {
			//FUTURE: add the template select UI
			//I think effeckt will autoscroll the list? Use that later.
			this.$.ruleslist.scrollTop(this.$.ruleslist[0].scrollHeight); //REWORK: this doesn't even work, not that it really matters.
			this.appendListItem(this.$.ruleslist, this.rules.rules, this.global.template.proportion);
		}.bind(this));

		//Output options
		this.$.outmode.eq(0).hide(); //hide the partial button
		this.$.outhideshow.eq(1).hide(); //hide the show button as default
		this.$.update.hide();
	},

	loadDynamics: function() {

	},


	//UI functions
	toggleOutput: function() {
		this.config.outputHidden = !this.config.outputHidden;

		//set the halfview to be a fullview.
		this.$.paneleft.toggleClass("halfview fullview");
		this.$.paneright.toggleClass("halfview minimized");

		this.$.outhideshow.toggle(); //swap hide and show
		this.$.outputmodebox.toggle(); //swap hide and show
		this.$.output.toggle(); //maybe detach this if it still hitches.

		//refresh the rules
		this.updateOutput("refresh");
	},

	/////
	//Function: loadRules
	//
	//Description: Makes an XmlHttpRequest to retrieve the current rules document.
	//
	//Input:	nothing
	//
	//Output: 	nothing
	/////
	loadRules: function () {
		var dc = this.global.config.selectedDC;

		//Show an indeterminate progress bar
		this.global.setLoadingForever();

		this.global.request({dc: dc, method: "/rules_get"})
		.done(function(data){
			if( data.error ) {
				this.global.internalerror( "LoadRules success got error: " + data.message );
				return;
			}

			// Check for any warning conditions
			if( data.warning )
			{
				this.global.error(data.warnmessage);
			}

			// Base64-decode the rules
			try { data = atob(data.message); }
			catch (e)
			{
				this.global.hideLoading();
				this.global.internalerror("Invalid Base64 encoding");
				console.log(data);
				throw e;
			}

			//Re-parse the message
			try { data = JSON.parse(data); }
			catch (e)
			{
				this.global.hideLoading();
				this.global.internalerror("Invalid internal JSON");
				console.log(data);
				throw e;
			}

			this.rules = data;
			this.updateOutput(this.rules);

			//Load window controls in chunks.
			window.setTimeout( function(){ this.processDataChunk(); }.bind(this) ,0);
		}.bind(this))

		.fail(function(str){
			this.global.error("Error loading rules: "+str);
			this.global.hideLoading();
		}.bind(this))

		.progress(function(i){
			this.global.setProgress(i);
		}.bind(this));
	},


	/////
	//Function: sendRules
	//
	//Description: POSTs rules out, where they will be committed to file.
	//
	//Input:	nothing
	//
	//Output:	1/0
	/////
	sendRules: function () {
		var rules = this.rules;
		var dc = this.global.config.selectedDC;
		//Remove proportion-zero stanzas
		for( var i=0; i < rules.rules.length; i++ )
		{
			if( rules.rules[i].rule != null &&
				rules.rules[i].rule.rules[3] != null &&
				rules.rules[i].rule.rules[3].proportion != null &&
				(
					rules.rules[i].rule.rules[3].proportion === 0 ||
					rules.rules[i].rule.rules[3].proportion === "0"
				)
			)
			{
				//manipulate the rules to remove this section.
				rules.rules.splice(i,1);
			}
		}

		//Show an indeterminate progress bar
		this.global.setLoadingForever();

		this.global.request({dc: dc, method: "/rules_set", obj: rules})
		.done(function(data){
			if( data.error ) {
				this.global.internalerror( "SendRules success got error: " + data.message );
				return;
			}

			//Set the Commit button back to grey.
			this.global.$.commit.toggleClass('topcoat-button--large--cta',false);

			//Send success message
			this.global.success( "Rules in "+this.global.config.selectedDC+" set." );

			//Hide loading.
			this.global.hideLoading(); //make this setProgressDone sometime, have fade anim.
		}.bind(this))

		.fail(function(str){
			this.global.error("Error sending rules: "+str);
			this.global.hideLoading();
		}.bind(this))

		.progress(function(i){
			this.global.setProgress(i);
		}.bind(this));

		return 1;
	},


	/////
	//UI functions
	/////

	/////
	//Function: updateOutput
	//
	//Description: Updates the pane on the right with a readout of the rules.
	//
	//Input:	json: either an Object or a json-encoded string, or "refresh", which causes to to redo its view.
	//
	//Output: nothing
	/////
	updateOutput: function (json) {
		if( json !== "refresh" ) //also acts as 'force'
		{
			//Set the commit button to be Call-To-Action regardless of whether the output is updated.
			//but not if it's just a view refresh
			this.global.$.commit.toggleClass('topcoat-button--large--cta',true);

			this.$.output.data("displaying",json); // update our "current view"

			if( ! this.config.autoUpdate ) { return; }
		}

		if( this.config.outputHidden ) { return; }

		if(this.config.outputMode === 1) // global rules view
		{
			cleanjQ(this.$.output);
			this.$.output.html(
				syntaxHighlight(this.rules)
			);
			this.$.outputmodebox.text("");
		}
		else if(this.config.outputMode === 2) // partial rules view
		{
			cleanjQ(this.$.output);
			this.$.output.html(
				syntaxHighlight( this.$.output.data("displaying") )
			);

			this.$.outputmodebox.text("Partial view");
		}
	},


	/////
	//Function: processDataChunk
	//
	//Description: Calls createListItem in chunks to allow the browser time to update the screen.
	//
	//Input:	idx: a number, the start of this particular chunk.
	//
	//Output: nothing
	/////
	processDataChunk: function (idx) {
		var rules = this.rules;
		if( idx == null || idx === 0 ) {
			//first chunk
			idx = 0;
			this.config.inBadUsersBlock = 0;

			//set progress on
			this.global.setLoading();

			//clear out the list and hide it
			//dDOM_reInit();
			this.$.ruleslist.empty().hide();
		}

		var max = parseInt(idx + (rules.rules.length/10)); //change this to 100 or just set max to some int to make the bar more responsive
		if( max < 1 ) { max = 1; } //argahrgahgr
		var lastChunk = 0;

		if( max >= rules.rules.length ) { max = rules.rules.length; lastChunk = 1; }

		//load ~10% of the new blocks
		for( var i=idx; i < max; i++ )
		{
			//Check if this is the start of a bad users block
			if(
				rules.rules[i].rule.rules[0].pattern != null &&
				this.config.badusersregex.test(rules.rules[i].rule.rules[0].pattern)
			)
			{
				//start the block if this is the beginning
				if( ! this.config.inBadUsersBlock )
				{
					this.config.inBadUsersBlock = 1;
					this.config.currentBadUsersBlock = this.createListItem(this.$.ruleslist,rules.rules,i,"baduser",0);
					this.config.currentBadUsersBlock.data("arrayidx",i);
				}

				//make an item within the block.
				//if I wanted the badusersblock to not be editable, I could set depth=1 here
				this.createListItem(this.config.currentBadUsersBlock,rules.rules,i,"rule",0);
			}
			else
			{
				//if this is the end of a bad users block, store that in the block.
				if( this.config.inBadUsersBlock )
				{
					this.config.inBadUsersBlock = 0;
					this.config.currentBadUsersBlock.data("arrayend",i);
					this.config.currentBadUsersBlock = null;
				}

				//make a normal item.
				this.createListItem(this.$.ruleslist,rules.rules,i,"rule",0);
			}
		}

		if( lastChunk )
		{
			//Clean up
			if( this.config.inBadUsersBlock )
			{
				this.config.currentBadUsersBlock.data("arrayend",rules.rules.length-1);
				this.config.currentBadUsersBlock = null;
			}

			this.global.setProgressDone();
			this.$.ruleslist.show();
		}
		else
		{
			//update bar and call self again
			this.global.setProgress(max/rules.rules.length * 100);
			window.setTimeout( function(){ this.processDataChunk(max); }.bind(this), 0);
		}
	},

	///////////////////////////
	//List Creation Functions//
	///////////////////////////

	/////
	//Function: createListItem
	//
	//Description: Manages structure of the list. If it's a top-level call (depth 0),
	//				it creates a <li> in its container and creates all further elements
	//				as children to that. It creates a ruleblock, and populates it with controls.
	//
	//				e.g. two-tier structure would look like this:
	//				<li>
	//					<toplevelcontrols />
	//					<rb>
	//						<controls />
	//						<rb class='depth1'>
	//							<controls />
	//						</rb>
	//					</rb>
	//				</li>
	//
	//Input:	$dom: a jQ object of the container we're being called from (e.g, a <li>)
	//				rulearr: a list of all rules.
	//				idx: the array index for rulearr.
	//				depth: an integer starting from 0, to track recursiveness.
	//				type: the type of item to make.
	//					rule: a block that is filled with controls.
	//					baduser: a ListItem, but tries to condense a bunch of similar rules into one checkbox.
	//					andor: a logical block that contains one control and other rules.
	//
	//Output: a jQuery object describing the ruleblock.
	/////
	createListItem: function ($dom,rulearr,idx,type,depth)
	{
		var $parent;
		var $controls;
		var simple = 0;
		if( depth == null ) { depth = 0; }
		if( type == null || type == "" ) { type = "rule"; }

		//Create the container and a block with controls if we are a top-level control (or called with null.)
		if( depth === 0 )
		{
			//Get the title of the container
			var title = "Undefined";
			switch (type) { case "rule": title="Rule";break; case "baduser": title="Bad Users";break; case "andor": title="Logic Block";break; } //REWORK: move this into the ui hash

			//Make the container block and append everything else to it.
			$parent = this.struct_ListItem();
			$parent.data("array",rulearr) //JQBREAK
				.data("arrayidx",idx) //store its data object with the DOM object.
			;

			//Create rule controls
			$controls = this.struct_ruleControls(title);
			$controls.appendTo($parent);

			//Do some things type-specific to top-level rules.
			$controls.addClass(type+"-header expanded-header");
			switch(type)
			{
				case "andor":
					//Gives it the nice curved bracket look
					$parent.addClass("andorblock").removeClass("topcoat-list__item"); //CSS
				break;
				case "rule":
					$parent.addClass("new-item")
							.on("animationend", function(e) {
						if( e.originalEvent.animationName === "moveIn" ) //since it's a two-step anim
						{ $(this).removeClass("new-item").off('animationend'); }
					});
				break;
				case "baduser":
					$controls.removeClass("expanded-header"); // folded by default
					$controls.children(".shade").addClass("flip").removeClass("no-animation"); //flip the button

					$parent.addClass("new-item")
							.on("animationend", function(e) {
						if( e.originalEvent.animationName === "moveIn" ) //since it's a two-step anim
						{ $(this).removeClass("new-item").off('animationend'); }
					});
				break;
			}
		}

		//Create the container for the rules
		var $rb = this.struct_ruleblockContainer();
		$rb_isDetached = 0;

		//Do some type-specific things regardless of whether we're a top-level block or not.
		switch(type)
		{
			case "rule":
				//Fill the block with controls
				simple = this.populateRuleBlock($rb,rulearr,idx,depth);
			break;
			case "baduser":
				////Create a copy to go into the Simple controls
				////this copy cannot be changed.
				//$controlcopy = $controls.clone(true);

				////remove the shade button
				//$controlcopy.children(".shade").remove();

				//struct_ListItem().append($controlcopy).appendTo(dDOM_simplelist);

				// hide contents by default
				$controls.data("detached",$rb);
				$rb_isDetached = 1;
				//$created.toggleClass(this.config.hiddenClass,true);
			break;
			case "andor":
				//add its control in place of its normal label.
				ret = this.createControl("dropdown",{ //REWORK: rather than do this, should probably have an extra override param?
						dom: $controls,
						key: "@type",
						val: rulearr["@type"],
						data_ref: rulearr,
						tab: ui.currentTab.controls.block_andor,
					}
				);

				ret.control.insertAfter($controls.children("h5").first()); //move the control just after the h5
			break;
		}

		//If there was a simple control somewhere in there, append the block (in a LI) to the simple detached DOM list.
		//if( simple )
		//{
			////struct_ListItem().append($rb).clone(true).appendTo(dDOM_simplelist);

			////$dom.toggleClass("simple",true);
			////if( $parent != null )
			////{ $parent.toggleClass("simple",true); }
			////$rb.toggleClass("simple",true);

		//}

		//Unless the ruleblock is supposed to remain detached, append it to parent.
		if( ! $rb_isDetached )
		{
			if( $parent != null )
			{ $rb.appendTo($parent); }
			else
			{ $rb.appendTo($dom); }
		}

		//Append the parent container to the dom if it exists.
		if( $parent != null )
		{ $parent.appendTo($dom); }

		return $rb; //return the ruleblock, not the list element.
	},

	struct_ListItem: function() {
		return $("<li>").addClass("topcoat-list__item");
	},

	struct_ruleControls: function(title) {
		//Make the controls container
		$controls = $("<div>");

		//Add controls
		//Title
		$("<h5>").appendTo($controls).text(title);

		//Spacer
		$("<div>").appendTo($controls).addClass("spacer");

		//Fold button
		$("<button>").appendTo($controls)
			.addClass("shade topcoat-button no-animation")
			.text("^")
			.click(function() {
				var $this = $(this);

				$this.removeClass("no-animation")
					.toggleClass("flip")
					.parent().toggleClass("expanded-header")
					.parent().toggleClass("expanded-block")
				;

				//Attach/detach "hidden" elements
				if( $this.parent().data("detached") != null )
				{
					$this.parent().parent().append( $this.parent().data("detached") ); //JQBREAK
					$this.parent().data("detached",null);
				}
				else
				{
					$this.parent().data("detached", $this.parent().parent().children(".ruleblock").detach() );
				}
					//.children(".ruleblock").first().toggleClass(this.config.hiddenClass);
			})
		;

		//Remove button
		$("<button>").appendTo($controls)
			.addClass("remove topcoat-button simple")
			.text("X")
			.click(function() { ui503.removeListItem($(this).parent().parent()); }) //REWORK: don't use global
		;

		return $controls;
	},

	struct_ruleblockContainer: function() {
		return $("<div>").addClass("ruleblock");
	},

	//The first in a series of data-manipulation functions.
	appendListItem: function ($dom,rulearr,template)
	{
		//manipulate the rules to add a new section.
		rulearr.push(clone(template));

		//create and populate a list item based on it.
		this.createListItem($dom,rulearr,rulearr.length-1); //REWORK: put this into the UI hash for template types

		this.updateOutput(rulearr[rulearr.length-1]);
	},

	removeListItem: function ($item)
	{
		var arrstart = $item.data("arrayidx");
		var arrlen = 1;
		var items = $item.parent().children();

		//multiple-element items
		if( $item.data("arrayend") != null )
		{ arrlen = $item.data("arrayend") - arrstart + 1; }

		//badusers detached DOM //REWORK: since arrend is set on the ruleblock not the list item, when the child is detached it's harder to read and will JQBREAK
		if(
			$item.children().data("detached") != null &&
			$item.children().data("detached").data("arrayend") != null
		) { arrlen = $item.children().data("detached").data("arrayend") - arrstart + 1; }

		//manipulate the rules to remove this section.
		$item.data("array").splice(arrstart,arrlen);

		//update the items below this to have their proper array locations.
		if( arrstart !== items.length )
		{
			var temp = items.slice(arrstart+1);
			for( var i=0; i < temp.length; i++ )
			{
				$temp = $(temp[i]);
				var idx = $temp.data("arrayidx");

				idx -= arrlen;
				$temp.data("arrayidx",idx);
			}
		}

		//remove everything that this element is tied to.
		var $parent = $item.parent();
		var arr = $item.data("mychildren");

		items.slice(arrstart,arrstart+arrlen).each(function() {
			discardElement(this);
			$(this).remove();
		});

		//remove the <li>, or potentially do animations here. This doesn't seem to be necessary
		$item.remove();
		discardjQ($item);

		ui503.updateOutput(ui503.rules);
	},



	/////
	//Function: populateRuleBlock
	//
	//Description: Loads UI controls into a ruleblock and hooks the controls.
	//
	//Input:	$dom: a jQ object of the container we're being called from (e.g, a <li>)
	//			rulearr: a reference to the rules array we are based in
	//			idx: the index in the array
	//			depth: an integer starting from 0, to track recursiveness.
	//
	//Output: 0 or 1, indicating whether there was a simple control in there.
	/////
	populateRuleBlock: function ($dom,rulearr,idx,depth) {
		var ret = 0;
		var ruleblock = rulearr[idx];

		if( ruleblock["@type"] != null )
		{
			var hasSubBlock = 0;
			for( var key in ruleblock )
			{
				if( ruleblock.hasOwnProperty(key) ) //avoid catching inherited
				{
					//If it's "rule", we want that to be at the end of the block, so handle it later.
					if( key === "rule" ) { hasSubBlock=1; continue; }

					var context = {
						dom: $dom,
						key: key,
						val: ruleblock[key],
						data_ref: ruleblock,
						tab: ui.currentTab.controls,
					};

					//Lookup the control's type in ui config and call the corresponding function.
					if( context.tab.type[key] != null )
					{
						this.callAddControl(context.tab.type[key],context);
					}
					else
					{
						//the default case
						this.callAddControl(context.tab.type["default"],context);
					}

					//If one of the controls was flagged "simple", tell the caller about that.
					if( context.simple )
					{ ret = 1; }
				}
			}

			//if it has "rule", it's a container rule
			//handling this here will make it always last in the properties of a single rule block.
			if( hasSubBlock )
			{
				//add an And/Or block
				$andor = this.createListItem($dom,rulearr,idx,"andor",depth);

				//recurse into it
				for( var i=0; i < ruleblock.rule.rules.length; i++ )
				{ this.createListItem($andor,ruleblock.rule.rules,i,"rule",depth+1); }
			}
		}
		else
		{
			//Add an "Invalid" block
			$("<div>").appendTo($dom).addClass("cordon").text("Invalid rule.");
		}

		return ret;
	},


	/////
	//Class of functions: Control creation
	//
	//Description: Creates the control, tied to a particular datapoint in rules.
	//
	//Input: context: {
	//			dom: a jQuery object describing the container to create in.
	//			key: the "name" of the control
	//			val: the value that the control should be set to.
	//			data_ref: a reference to the datapoint to be tied to.
	//			ui: the global UI hash, referenced here so that the controls could be from called elsewhere potentially.
	//		}
	//
	//Output: a jQuery object of the control.
	//
	/////
	callAddControl: function (type,context) {
		//create a control block to put it in.
		context.dom = $("<div>").appendTo(context.dom)
			.addClass("controlblock")
			.data("array",context.data_ref) //associate it with its datapoint.
			.data("key",context.key)
		;

		//add the label w/ tooltip
		context.tooltip = this.addTooltip(context);

		context.dom.append(this.createControl(type,context).control);

		if( context.simple )
		{ context.dom.addClass("simple"); }

		//Set sliders to show their initial value
		if( context.control.attr("type") === "range" )
		{
			context.tooltip.text( context.tooltip.data("label-text") + ": " + context.control.val() );
		}
	},

	createControl: function (type,context) {
		//add the control itself
		switch (type)
		{
			case "dropdown": this.addDropdownControl(context); break;
			case "text": this.addTextControl(context); break;
			case "number": this.addNumberControl(context); break;
			case "slider": this.addSliderControl(context); break;
			case "array": this.addArrayControl(context); break;
			default: this.internalerror("invalid control type called!"); return;
		}

		if( context.simple )
		{ context.control.addClass("simple"); }

		return context;
	},

	controlGlobals: function (context) {
		//add values it may have
		this.addValues(context);

		//add constraints it may have
		this.addConstraints(context);

		//hook it
		this.hookRuleControl(context);
	},

	addDropdownControl: function (context) {
		/////
		//Based on this HTML:
		//<p class="labelsmall effeckt-tooltip" data-effeckt-type="bubble" data-effeckt-tooltip-text="The class of users filtered against">Type</p><br />
		//<select name="type">
		//<option value="ALL">ALL</option>
		//<option value="S5">S5</option>
		//</select>
		//<br />
		/////

		//add the dropdown with the array specified, on the value in context.val
		context.control = $("<select>").appendTo(context.dom);

		this.controlGlobals(context);
		return context;
	},

	addArrayControl: function (context,data_ref,id) {
		//REWORK: make this into a small mirror of the rules block.
		//create the header
		//create the ul
		//bind the ul to the array
		//populate the ul with the array
			//if subcontrols, populateRuleBlock()


		//$ac = $("<div>").appendTo(context.dom)
			//.addClass("arraycontrol");

		//$el = addDropdownControl($ac);
		this.addDropdownControl(context);
		context.control.prop("multiple","multiple");

		//$("<button>").appendTo($ac)
			//.addClass("add topcoat-button")
			//.text("Add")
			//.click(function() { ui503.removeListItem($li,rulearr); })
		//;
		return context;
	},

	addSliderControl: function (context) {
		/////
		//Based on this HTML:
		//<p class="labelsmall effeckt-tooltip" data-effeckt-type="bubble" data-effeckt-tooltip-text="Percentage of users to give a 503 code">Proportion</p>
		//<input name="proportion" type="range" width="85%" class="topcoat-range" min=0 max=100 /><br />
		//<div class="measuremarks">
		//	<div><span>25</span></div>
		//	<div><span>50</span></div>
		//	<div><span>75</span></div>
		//	<div><span>100</span></div>
		//</div>
		/////

		context.dom.addClass("slider"); //makes it expand to fill its container and not get pushed around

		//add the dropdown with the array specified, on the value in context.val
		context.control = $("<input>")
			.addClass("topcoat-range")
			.attr("type","range")
			.val(context.val)
		;

		this.controlGlobals(context);
		return context;
	},

	addTextControl: function (context) {
		/////
		//Based on this HTML:
		//<p class="labelsmall effeckt-tooltip" data-effeckt-type="bubble" data-effeckt-tooltip-text="The class of users filtered against">Type</p><br />
		//<input type="text" />
		//<option value="ALL">ALL</option>
		//<option value="S5">S5</option>
		//</select>
		//<br />
		/////

		//add the text box with the value in context.val
		context.control = $("<input>")
			.attr("type","text")
			.data("array",context.data_ref)
			.data("key",context.key)
			.val(context.val)
		;

		this.controlGlobals(context);
		return context;
	},

	addNumberControl: function (context) {
		//this is a textbox, but for numbers only
		this.addTextControl(context);
		context.control.attr("type","number");

		return context;
	},


	//pieces of UI
	addTooltip: function (context) {
		// var $label = $("<p>").appendTo(context.dom)
		// 	.addClass("labelsmall effeckt-tooltip")
		// 	.attr("data-effeckt-type","bubble") //Effeckt tooltip
		// 	.attr("data-effeckt-position","right")
		// 	.attr("data-effeckt-tooltip-text",tooltip)
		// 	.attr("data-label-text",label) //my own attr for dynamic labels
		// 	.text(label)
		// ;

		var label = context.key;
		var tooltip = "This tooltip is undefined. Please report this.";

		var $label = $("<p>").appendTo(context.dom)
			.addClass("labelsmall")
			.attr("data-label-text",label) //my own attr for dynamic labels
			.text(label)
		;

		//add the tooltip data

		//Lookup the tokens in the UI hash if they exist.
		if( context.tab.tokens[context.key] != null && context.tab.tokens[context.key].tooltip != null )
		{
			label = context.tab.tokens[context.key].tooltip.label;
			tooltip = context.tab.tokens[context.key].tooltip.text;

			$label.addClass("labelsmall simptip-position-right simptip-smooth simptip-movable simptip-multiline")
			.attr("data-tooltip",tooltip)
			;

			$("<br />").appendTo(context.dom); //something goofy about tooltip CSS
		}

		return $label;
	},

	addValues: function (context) {
		if(
			context.tab.values[context.key] != null &&
			context.tab.tokens[context.key] != null
		)
		{
			//use the UI -> Values -> key array for the values
			var myvalues = context.tab.values[context.key];
			var mytokens = context.tab.tokens[context.key];

			for(i=0; i < myvalues.length; i++)
			{
				var val = myvalues[i];
				var text = val;

				//checks for tokens for this option and grabs the text value for it if it exists.
				if( mytokens.options != null )
				{ text = mytokens.options[ val ]; }

				$("<option>").appendTo(context.control)
					.attr("value",val)
					.text(text)
				;
			}

			//Set the current value to be what it is in the rules.
			context.control.val(context.val);
		}
	},


	addConstraints: function (context) {
		if( context.tab.constraints[context.key] != null )
		{
			var myconstraints = context.tab.constraints[context.key];

			for( var key in myconstraints )
			{
				if( myconstraints.hasOwnProperty(key) ) //avoid catching inherited
				{
					switch(key)
					{
						case "marks":
							var $mm = $("<div>")
								.addClass("measuremarks")
							;

							//add the middle marks
							for(i=0; i < myconstraints.marks.length; i++)
							{
								$("<div><span>"+myconstraints.marks[i]+"</span></div>").appendTo($mm);
							}

							//add the minimum mark
							$("<span>"+myconstraints.min+"</span>").prependTo($mm);

							//add the maximum mark
							$("<div><span>"+myconstraints.max+"</span></div>").appendTo($mm);

							//concatenate it into the control
							context.control = context.control.add($mm);
						break;
						case "simple":
							if( myconstraints.simple ) { context.simple = 1; } // bubble this up out to the top level
						break;

						//if it's not a special constraint, just add it to the element.
						default: context.control.attr(key,myconstraints[key]); break;
					}
				}
			}
		}
	},


	/////
	//Function: hookRuleControl
	//
	//Description: Hooks a control with appropriate functions on events.
	//
	//Input: context: {
	//			control: a jQuery object describing the object to hook. Added from a control-create function.
	//			dom: a jQuery object describing the container to create in.
	//			key: the "name" of the control
	//			val: the value that the control should be set to.
	//			data_ref: a reference to the datapoint to be tied to.
	//			tab: a reference to the current tab's tokens for friendly names
	//		}
	//
	//Output: nothing
	/////
	hookRuleControl: function (context) {

		//FUTURE: change this to hook sorting.

		//hook the control to update its rule object
		context.control.on("change", context, function(e) {
			//an individual control has updated, so I'm setting its datapoint.
			if ( e.data.data_ref != null )
			{
				var $this = $(this);
				var val = e.data.control.val();

				//Parse the value of the control and update its tied datapoint
				if( $this.hasClass('topcoat-checkbox') )
				{
					//Checkboxes are on/off and also finicky. "On" is not negatable.
					val = !e.data.data_ref[e.data.key];
				}
				else if ( $this.is('select[multiple]') )
				{
					//Always must end up as an array. typeParse is no good for this, as one value will return as a scalar.
					var temp = [];

					if( Array.isArray(val) )
					{
						// Go through and typeParse each.
						for( var i=0; i < val.length; i++ )
						{ temp.push(typeParse(val[i]));	}
					}
					else
					{ temp = [typeParse(val)]; }

					val = temp;
				}
				else
				{
					//for others, the value is always a string, so parse it
					val = typeParse(val);
				}

				//set the data
				e.data.data_ref[e.data.key] = val;

				//update the view.
				ui.currentTab.updateOutput(e.data.data_ref);
			}
			else
			{
				ui.currentTab.internalerror("Attempted to set a null data_ref!");
			}
		});

		//Hook sliders to update a readout of their exact value dynamically.
		if( context.control.attr("type") === "range" )
		{
			context.control.on("input", context, function(e) {
				var $label = e.data.control.parent().children(".labelsmall");
				$label.text( $label.data("label-text") + ": " + e.data.control.val() );
			});
		}
	},
};


/////////////////
// Restarts UI //
/////////////////

var uirestarts = {

	//Globals
	global: ui,

	inited: 0,
	init: function() {
		if( this.inited ){ return; }

		this.hookStatics();

		this.loadDynamics();

		//whatever, default action

		this.inited = 1;
	},

	hookStatics: function() {
		//Initial hooks

	},

	loadDynamics: function() {

	},

	$: {
		//jQuery objects
	},

	config: {
		//Various options
	},


	/////
	//Functions

	/////
	//Tab hooks
	hook_dcbtn: function() {

	},

	hook_togglesimple: function(bool) {

	},

	hook_commit: function() {

	},

	hook_cancel: function() {

	},
};

/**
 * modalEffects.js v1.1.0
 * http://www.codrops.com
 *
 * Rewritten for effeckts project
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright 2013, Codrops
 * http://www.codrops.com
 */
var Modals = {

  overlay: $('#effeckt-overlay'),
  modalWrap: $("#effeckt-modal-wrap"),
  modal: $("#effeckt-modal"),
  modalStyle: "",

  //my modifications
  hiddenClass: 'hidden',
  defaultModalStyle: 'md-effect-2',
  header: $("#effeckt-modal>h1"),
  body: $(".effeckt-modal-content"),
  cancel: $(".effeckt-modal-cancel"),
  confirm: $(".effeckt-modal-confirm"),

  promise: null,
  yes: null,
  no: null,

  buttons: function(){ return Modals.modal.children('.topcoat-overlay-buttons'); }, //REWORK: there has to be a better way to do this
  // canLeave: true,

  initialHeader: 'Confirm',
  initialBody: '<p>Are you sure?</p>',
  initialConfirm: 'Commit',
  initialCancel: 'Cancel',
  lastconfirm: null,

  init: function() {

    this.bindUIActions();

    return this; // my modification

  },

  bindUIActions: function() {

    //$(".modal2-button").on("click", function() {
      //Modals.openModal(this);
    //});

    this.cancel.on("click", function() {
        this.no(this.promise);
    }.bind(this));

    this.confirm.on("click", function() {
        this.yes(this.promise);
    }.bind(this));

    $(".effeckt-overlay").on("click", function() {
        this.no(this.promise);
    }.bind(this));

    $(window).on("keyup", function(e) {
        if ( e.keyCode === 27 ) this.no(this.promise);
        if ( e.keyCode === 13 ) this.yes(this.promise);
    }.bind(this));

  },

  //Args: content, yes, no, el, parentPromise
  openModal: function(args) {

    //Prepare a Promise
    var promise;
    if( args.parentPromise == null )
    { promise = $.Deferred(); }
    else
    { promise = args.parentPromise; }

    this.promise = promise
        .always(function() {  Modals.closeModal(); } )
    ;

    //Cancel any existing animations
    Modals.overlay.off(evt);
    Modals.modalWrap.off(evt);

    //Setting el lets you have different modal types per button.
	if( args.el != null )
    {
        var button = $(args.el);
		Modals.modalStyle = "md-effect-" + button.data("modal-type").replace(/[^0-9]/g, '');

		if (button.data("needs-perspective")) {
		  setTimeout(function () {
			$("html").addClass("md-perspective");
		  }, 50);
		}
		if (button.data("hide-class")) {
		  Modals.modalWrap.data("hide-class",true);
		  Modals.modalWrap.data("hide-class", button.data("hide-class"));
		}
	}
	else
    { Modals.modalStyle = Modals.defaultModalStyle; }

    //Allow a simple string to be the box's title instead of requiring the object notation.
    if ( typeof args.content === 'string' || args.content instanceof String )
    { args.content = { header: args.content }; }

    //Defaults
    if( args.yes == null )
    {
        args.content.hideYes = true;
        args.yes = function() { Modals.promise.resolve(); };
    }

    if( args.no == null )
    {
        args.content.hideNo = true;
        args.yes = function() { Modals.promise.reject(); };
    }

    //Set styles
    if( args.content != null )
    {
        Modals.setModal(args.content);
    }

    Modals.modalWrap.addClass(Modals.modalStyle);

    var evt = Effeckt.animationEndEventName + ' ' + Effeckt.transitionEndEventName;
		Modals.overlay.on(evt, function () {
		Modals.modalWrap.addClass("effeckt-show");
		Modals.overlay.off(evt);
    });

    Modals.modalWrap.on(evt, function() {
		//If there's an input, focus on the first one
		var firstinput = Modals.body.find('input').first();
		if( firstinput.length > 0 )
		{ firstinput[0].focus(); }

		Modals.modalWrap.off(evt);
	});

    //Set internal vars
    Modals.yes = args.yes;
    Modals.no = args.no;

    //Show the modal
    Modals.modalWrap.show();
    Modals.showOverlay();


    return promise.promise();
  },

  closeModal: function(confirm) {
	// if( ! Modals.canLeave && ! confirm ) { return; }

    var evt = Effeckt.animationEndEventName + ' ' + Effeckt.transitionEndEventName;

	// Modals.lastconfirm = confirm;

    Modals.modalWrap.on(evt, function () {
      Modals.modalWrap.removeClass("effeckt-show effeckt-hide " + Modals.modalStyle);
      $("html").removeClass("md-perspective");
      Modals.modalWrap.hide().off(evt);

		// //execute events
		// if( Modals.lastconfirm )
		// { Modals.promise.resolve();	}
		// else
		// { Modals.promise.reject(); }
        //
		// Modals.lastconfirm = null;
		// Modals.promise = null;
    });

    //Wipe promises
    Modals.promise = null;

    Modals.hideOverlay();
    //Not the cleanest way
    Modals.modalWrap.removeClass("effeckt-show");

    if( Modals.modalWrap.data("hide-class") ){
      Modals.modalWrap.addClass("effeckt-hide");
    }

	// //Reset this
	// Modals.canLeave = true;

  },

  showOverlay: function() {
    Modals.overlay.addClass("effeckt-show");
  },

  hideOverlay: function() {
    Modals.overlay.removeClass("effeckt-show");
  },

  setModal: function (obj) {
		//reset everything
		this.header.text(this.initialHeader);
		this.body.html(this.initialBody);
		this.confirm.text(this.initialConfirm);
		this.cancel.text(this.initialCancel);
		this.buttons().toggleClass(this.hiddenClass,false).children().toggleClass(this.hiddenClass,false);

        //Apply options.
		if( obj.header != null )
		{ this.header.text(obj.header); }

		if( obj.body != null )
		{ this.body.html(obj.body); }

		if( obj.text != null )
		{ this.body.children('p').text(obj.body); }

        if( obj.cancel != null )
        { this.cancel.text(obj.cancel); }

        if( obj.confirm != null )
        { this.confirm.text(obj.confirm); }

        //REWORK: don't do this by index.
        if( obj.hideYes != null && obj.hideYes == true  )
		{ this.buttons().children().eq(1).toggleClass(this.hiddenClass,true); }
        if( obj.hideNo != null && obj.hideNo == true )
		{ this.buttons().children().eq(0).toggleClass(this.hiddenClass,true); }

	},
};

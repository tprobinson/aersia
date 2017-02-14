'use strict';
// Always expect both kinds of event
const buttonPressedEvent = 'touchstart click';

// List of all animation/transition properties
// with its animationEnd/transitionEnd event
const animationEndEventNames = {
  WebkitAnimation: 'webkitAnimationEnd',
  OAnimation: 'oAnimationEnd',
  msAnimation: 'MSAnimationEnd',
  animation: 'animationend'
};

const transitionEndEventNames = {
  WebkitTransition: 'webkitTransitionEnd',
  OTransition: 'oTransitionEnd',
  msTransition: 'MSTransitionEnd',
  transition: 'transitionend'
};

export default class Effeckt {
  constructor() {
    this.buttonPressedEvent = buttonPressedEvent;

    // event trigger after animation/transition end.
    this.transitionEndEventName = Modernizr ? transitionEndEventNames[Modernizr.prefixed('transition')] : this.getTransitionEndEventNames();
    this.animationEndEventName = Modernizr ? animationEndEventNames[Modernizr.prefixed('animation')] : this.getAnimationEndEventNames();
    this.transitionAnimationEndEvent = this.animationEndEventName + ' ' + this.transitionEndEventName;

    this.version = '0.0.1';
  }

  getViewportHeight() {
    const docElement = document.documentElement;
    const client = docElement.clientHeight;
    const inner = window.innerHeight;

    return client < inner ? inner : client;
  }

  // Get all the properties for transition/animation end
  getTransitionEndEventNames() {
    return this._getEndEventNames( transitionEndEventNames );
  }

  getAnimationEndEventNames() {
    return this._getEndEventNames( animationEndEventNames );
  }

  _getEndEventNames(obj) {
    return Object.values(obj).join(' ');
  }
}

/*!
 * strength.js
 * Original author: @aaronlumsden
 * Further changes, comments: @aaronlumsden
 *
 * Rewritten for effeckts project
 *
 * Licensed under the MIT license
 */
var Tabs = {

  tabsWrapClass:  '.effeckt-tabs-wrap',
  tabsClass:      '.effeckt-tabs a.effeckt-tab',
  tabContentClass:'.effeckt-tab-content',

  init: function() {

    this.initComponent();
    this.bindUIActions();

  },

  initComponent: function() {

    //keep a reference to this (Tabs) object.
    var self = this;

    $(this.tabsWrapClass).each(function(){

      var $el             = $(this);
      var effect          = $el.data('effeckt-type');
      var tabContents     = $el.find(self.tabContentClass);
      var firstTabContent = tabContents.first();
      var tabs            = $el.find(self.tabsClass);

      tabs.removeClass('active').first().addClass('active');
      tabContents.not(':eq(0)').addClass('effeckt-hide');

      firstTabContent.addClass('effeckt-show');
      tabContents.parent().height(firstTabContent[0].clientHeight);

    });

  },

  bindUIActions: function() {

    //keep a reference to this (Tabs) object.
    var self = this;

    $(this.tabsClass).on( Effeckt.buttonPressedEvent, function(e) {
      e.preventDefault();
      self.showTab(this);
    });

  },

  showTab: function(el) {

    var tab         = $(el);
    var tabsWrap    = tab.parents(this.tabsWrapClass);
    var tabs        = tabsWrap.find(this.tabsClass);
    var tabContents = tabsWrap.find(this.tabContentClass);
    var effect      = tabsWrap.data('effeckt-type');

    //set active to this current clicked tab
    tabs.removeClass('active');
    tab.addClass('active');

    var tabID = tab.data('tab-id');
    var tabContent = tabContents.filter(tabID);

    tabContents.removeClass('effeckt-show').addClass('effeckt-hide');
    tabContent.addClass('effeckt-show');

    //add parent height, just because of position: absolute;
    tabContents.parent().height(tabContent[0].clientHeight);
  }

};

Tabs.init();

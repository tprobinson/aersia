'use strict';
import EffecktCore from './effeckt-core.js';
/*
 * strength.js
 * Original author: @aaronlumsden
 * Further changes, comments: @aaronlumsden
 *
 * Rewritten for effeckts project
 *
 * Licensed under the MIT license
 */
export default class EffecktTabs {
  constructor() {
    this.initComponent();
    this.bindUIActions();

    this.Effeckt = new EffecktCore();

    this.tabsWrapClass = '.effeckt-tabs-wrap';
    this.tabsClass = '.effeckt-tabs a.effeckt-tab';
    this.tabContentClass = '.effeckt-tab-content';
  }

  initComponent() {
    // keep a reference to this (Tabs) object.
    let self = this;

    $(this.tabsWrapClass).each(function () {
      const $el = $(this);
      const effect = $el.data('effeckt-type');
      const tabContents = $el.find(self.tabContentClass);
      const firstTabContent = tabContents.first();
      const tabs = $el.find(self.tabsClass);

      tabs.removeClass('active').first().addClass('active');
      tabContents.not(':eq(0)').addClass('effeckt-hide');

      firstTabContent.addClass('effeckt-show');
      tabContents.parent().height(firstTabContent[0].clientHeight);
    });
  }

  bindUIActions() {
    // keep a reference to this (Tabs) object.
    const self = this;
    $(this.tabsClass).on( this.Effeckt.buttonPressedEvent, function (e) {
      e.preventDefault();
      self.showTab(this);
    });
  }

  showTab(el) {
    const tab = $(el);
    const tabsWrap = tab.parents(this.tabsWrapClass);
    const tabs = tabsWrap.find(this.tabsClass);
    const tabContents = tabsWrap.find(this.tabContentClass);
    const effect = tabsWrap.data('effeckt-type');

    // set active to this current clicked tab
    tabs.removeClass('active');
    tab.addClass('active');

    const tabID = tab.data('tab-id');
    const tabContent = tabContents.filter(tabID);

    tabContents.removeClass('effeckt-show').addClass('effeckt-hide');
    tabContent.addClass('effeckt-show');

    // add parent height, just because of position: absolute;
    tabContents.parent().height(tabContent[0].clientHeight);
  }
}

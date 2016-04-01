var EffecktListItems = {

  init: function() {

    this.bindUIActions();

  },

  bindUIActions: function() {

    var self = this;
    $(".topcoat-list__container .add").on( Effeckt.buttonPressedEvent, function() {
      self.addListItem(this);
    });

    $(".topcoat-list__container .remove").on( Effeckt.buttonPressedEvent, function() {
      self.removeListItem(this);
    });

    $("button.remove").hide();
  },

  addListItem: function(el) {

    var insertPoint = $(el).parent().find("ul");
    $(el).parent().find("button.remove").show();

    //$("<li />", {
      //'text': "new item",
      //'class': "topcoat-list__item new-item"
    //}).appendTo(insertPoint);
    $(templateLI).appendTo(insertPoint);

  },

  removeListItem: function(el) {

    var $parent = $(el).parent(),
        self = this;

    var elToRemove = $parent.find("li").last();
    elToRemove.on( Effeckt.transitionAnimationEndEvent, function () {
      elToRemove.off( Effeckt.transitionAnimationEndEvent );
      elToRemove.remove();
    });

    elToRemove.toggleClass("remove-item new-item");
    if (!$parent.find("li").length) {
      $parent.find("button.remove").hide();
    }

  }

};

EffecktListItems.init();

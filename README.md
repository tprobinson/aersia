Replacing Aersia's Flash-based player, for fun and ~~profit~~!

#Done in version 0.0.5:
* Song information panel
 * Toggle shuffling to current song
 * Direct download
 * Sharing links, which can share just a playlist or playlist+song
* Layouts panel
* Internals
 * Updated Modernizr to 3, now supporting Opus detection.
 * Check available filetypes for each song and choose best available
 * Generated favicons for every platform


#Planned for the next version:
* More interface reworks
* Song information panel
 * Cover art or other art of song
 * Selection of original/remixes
* More layouts
* Revamp playlist structure to support all of this relational information.

#Planned for the future:
* Mobile support?
* Compile the JS

##Previous Versions
###0.0.4
* Rebranding from VIP to Aersia
* Play history
 * Player tracks up to 100 songs of history, and Prev button will go back in this list.
 * Next button will either advance in the history list, or shuffle if you're at the most recent song.
 * If you're backed up in the history and a new song is requested (via click or song end shuffle), the current song becomes the most recent song in the stack.
* More themes, based on Aersia
* Custom themes can now be imported and exported.
* Moved Options panel to be over the playlist in Classic interface.
* Development changes
 * Rewriting much of Gruntfile to better use generated space
 * Actually using the libraries I have included
 * Disabling old junk
* Re-include Effeckt.css for options tabs.
 * Partially rewrote modules/tabs.js to use data tags instead of href, as that can interfere with link sharing
* Updated robots.txt and humans.txt

###0.0.3
* Increase the size of the playlist items on the touch interface
* Add some support for saving/loading/remembering themes, so if a user sets it the app will read a cookie to get their preferences, or presets.
* Re-style the Options box to use the right colors.
* Make some icons so the site will show the right graphics on the Chrome New Tab, Mozilla Recent Tabs, or Windows Metro UI panels.
* Allow switching between the different playlists.

###0.0.2
* Added a new font, "Titillium Web".
* Added an options menu, accessible by clicking the gear next to the Fullscreen button.
* Added a touch-style interface, automatically applied on all touchscreen devices, manually toggleable in the Options menu.
* Added some themeing support. Currently, it doesn't change the gradients on the controls bar.
* Added scrolling animation on the list when a new song is played.

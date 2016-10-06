# Aersia Player

<!-- MDTOC maxdepth:1 firsth1:0 numbering:0 flatten:0 bullets:1 updateOnSave:1 -->

- [Known issues](#known-issues)   
- [Usage and Development](#usage-and-development)   
- [Changelog](#changelog)   
- [Previous Versions](#previous-versions)   
- [License](#license)   

<!-- /MDTOC -->

Replacing Aersia's Flash-based player!

This is primarily a Javascript-based music player.

## Known issues

### Interface
The touch interface has some problems, like pieces of the interface overlapping.

You can't Ctrl-F on the list.

### Cover Art
Not all playlists have cover art, just VIP so far.

Some of the cover art is kind of weird, when there are better options available. So far, I'm only using the Mobygames cover art resource, and which art is chosen is decided based on a weighting algorithm that can still use a few tweaks. Some games also are not available on Mobygames' database.

The cover art acts a little differently on the Streambox interface than it does on Classic.

## Usage and Development

Examples given are of an Ubuntu system. Some processes may not work exactly as shown.

Install Node.js and NPM on your system:

```shell
sudo apt install nodejs npm
sudo npm install -g n
sudo n stable
sudo npm install -g npm
```

Checkout this repository:

```shell
# The recursive flag is important to get submodules
git clone --recursive <this checkout url>
cd aersia
```

Install dependencies:

```shell
npm install

cd node_modules/js-logger
npm install
cd -

cd node_modules/perfect-scrollbar
npm install
cd -
```

**Temporary step:** edit the node_modules/js-logger/gulpfile and remove the inside of the 'test' task. This is broken, and I don't know why.

```js
gulp.task('test', [ 'version' ], function () {
});
```

Run the full deploy:
```shell
grunt full-deploy
# or
grunt --env=dev full-deploy
```

Open a web browser to see and work on the app:
```shell
grunt dev
# or
grunt --env=dev dev
```


## Changelog
#### Done in version 0.1.2:
* Internals
    * Reworked the internal build process to support a 'dev' and 'prod' branch
    * Added a little overlay to show the build type.
    * Reworked most of the actual pipeline, resulting in minified CSS and uglified JS

* Player
    * Updated the playlist to the Sept 7th update


#### Planned for the next version:
* Fixing some layout issues in the options box. Making Streambox less dynamic?

#### Planned for the future:
* Mobile support?

## Previous Versions
### 0.1.1
* Internals
    * Corrected an error in playlist sorting, Angular does not preserve the original index pre-sort.
    * Reduced CPU usage in timelineUpdate() by caching bounding rectangles.

* Player
    * Loading spinner added for when a playlist is loading.
    * The playlist will now neither overscroll nor underscroll when attempting to focus on an entry at the end of the playlist.
    * Failures that the user should know about are now displayed in an error box.
    * Removed the Recent News tab, as it doesn't do anything.
    * Removed the "album" listing.

### 0.1.0
* Internals
    * Allowed both XML and JSON formats to be loaded as playlists. This functionality, along with the ability to parse XML, will probably be removed later.
    * Object-fit polyfill included, for browsers that don't support it.
    * Lightbox file included in Node dependencies and Grunt deploys.
    * Decreased default logging level.
    * The playlist now sorts itself, to support adding future songs while keeping song-blocking information (which is stored by song index) intact.
* Player
    * Added in error checking and retrying for song loading issues.
    * Song art now included in playlist, and loaded per-song.
    * A lightbox will be brought up with the full-size art if the song art is clicked/touched.
* Layouts
    * Song art properly included and a few things were locked down to make sure the art doesn't "escape".

### 0.0.6
* Internals
    * Removed more broken Angular code
    * Layout fixes and automatic correction of when the layout changes.
* Player
    * Fixed a rare case where the shuffle would pick the same song twice and stop playing.
* Layouts
    * Streambox, a stubby version of the Current Song tab.
    * Streambar, the top controls bar and nothing else.

### 0.0.5
* Song information panel
 * Toggle shuffling to current song
 * Direct download
 * Sharing links, which can share just a playlist or playlist+song
* Layouts panel
* Internals
 * Updated Modernizr to 3, now supporting Opus detection.
 * Check available filetypes for each song and choose best available
 * Generated favicons for every platform

### 0.0.4
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

### 0.0.3
* Increase the size of the playlist items on the touch interface
* Add some support for saving/loading/remembering themes, so if a user sets it the app will read a cookie to get their preferences, or presets.
* Re-style the Options box to use the right colors.
* Make some icons so the site will show the right graphics on the Chrome New Tab, Mozilla Recent Tabs, or Windows Metro UI panels.
* Allow switching between the different playlists.

### 0.0.2
* Added a new font, "Titillium Web".
* Added an options menu, accessible by clicking the gear next to the Fullscreen button.
* Added a touch-style interface, automatically applied on all touchscreen devices, manually toggleable in the Options menu.
* Added some themeing support. Currently, it doesn't change the gradients on the controls bar.
* Added scrolling animation on the list when a new song is played.

## License
Released under the [MIT License](https://www.tldrlegal.com/l/mit)

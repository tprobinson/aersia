# Aersia Player

<!-- MDTOC maxdepth:2 firsth1:1 numbering:0 flatten:0 bullets:1 updateOnSave:1 -->

- [Aersia Player](#aersia-player)   
- [Changelog](#changelog)   
- [Known issues](#known-issues)   
- [Usage and Development](#usage-and-development)   
   - [Updating the Playlist from XML](#updating-the-playlist-from-xml)   
   - [Deploying to the demo site](#deploying-to-the-demo-site)   
- [Previous Versions](#previous-versions)   
- [License](#license)   

<!-- /MDTOC -->

Replacing Aersia's Flash-based player!

This is a Javascript-based music player.

# Changelog
#### Done in version 0.1.4:
* Internals
    * Switch to ESLint instead of JSHint, reformatted all the code.
    * Fixed a potential bug with source-type selection.
    * Fixed a share-link bug: if you share while you already have a share link loaded, it broke.
    * Reformatted share-links to be more useful
    * Added a fixed-seed capability. It can't be triggered by any GUI control, but using a share link of `/#seed=whatever` will fix the seed. The fixed seed can be removed by using `/#seed=false` or reloading the page without the seed share link.
    * Added a timeout to the message box that appears on share-linking. Otherwise it stayed up permanently. Errors still stay up forever.
    * Automatic logging level selection dev vs beta

* Player
    * Play progress bars don't reset when pause/unpausing anymore.
    * Updated the playlist to the Dec 18th update


#### Planned for the next version:
* Nothing

#### Planned for the future:
* Fixing some layout issues in the options box. Making Streambox less dynamic?
* Mobile support?

# Known issues

#### Interface
The touch interface has some problems, like pieces of the interface overlapping.

You can't Ctrl-F on the list.

The loading progress bar doesn't work properly, only for the first song, and only if you are loading a share link.

#### Cover Art
Not all playlists have cover art, just VIP so far.

Some of the cover art is kind of weird, when there are better options available. So far, I'm only using the Mobygames cover art resource, and which art is chosen is decided based on a weighting algorithm that can still use a few tweaks. Some games also are not available on Mobygames' database.

The cover art acts a little differently on the Streambox interface than it does on Classic.

# Usage and Development

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
git clone <this checkout url>
cd aersia
```

Install dependencies:

```shell
npm install #or yarn

cd node_modules/js-logger
npm install
cd -

cd node_modules/perfect-scrollbar
npm install
cd -
```

**Temporary step:** edit node_modules/js-logger/gulpfile.js and remove the inside of the 'test' task. This is broken, and I don't know why.

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

## Updating the Playlist from XML

You will need an environment capable of running Perl. Examples given are of an Ubuntu machine.

### Getting the new XML as JSON
Run the development environment, making sure it loads the "new" XML file as its current playlist.
You can change a line in the `this.playlists` hash to get the player to load the new file.

In the browser with the player running, open the developer console and run this command:

```js
angular.element(document.body).scope().aersiaCtrl.copyPlaylist = true
```

Then, click on a Share button for any song. The browser will copy the entire playlist as JSON into your clipboard.

Paste the playlist into a file. I prefer using `bin/roster.new.json` for this. Rename `bin/roster.json` to `bin/roster.old.json` to avoid naming conflicts later.

### Patching the JSON files

You will need some Perl dependencies to run the scripts in this directory. Run the following:
```shell
sudo apt install libjson-maybexs-perl libwww-mechanize-perl libnet-ssleay-perl libhtml-treebuilder-xpath-perl libterm-progressbar-perl
```

Go into the bin directory and run this command:
```shell
perl patchJSON.pl roster.old.json roster.new.json
```

It will create `bin/roster.patched.json`. Rename this to `bin/roster.json`.

### Scanning for Cover Art

Run the following, still in the `bin` directory:
```shell
# If you've run the development environment with --env=dev, use this:
perl coverArtScanner.pl -e dev
# Otherwise, use this:
perl coverArtScanner.pl
```

The script will go through `bin/roster.json` and search Mobygames for art, then output to either `devgenerated/roster_new.json` or `generated/roster_new.json`.

### Resolving Cover Art Errors:
#### Could not find page for X
It will probably say this for a lot of items. If you know that the page for that game exists or has a different name, run this:

```shell
perl coverArtScanner.pl -e dev -o gamename -n
```

The script will ask you for a Mobygames-compatible name for that particular game. This would be however the game's name appears in the URL.

An example with 'Civilization III':

```shell
$ perl coverArtScanner.pl -e dev -o 'Civilization III' -n
Decoding config/dev.json...
Decoding bin/roster.json...
Decoding bin/nameMapping.json...
Civilization III                                                                
 98% [================*======================================================= ]
Enter a Mobygames-compatible name for Civilization III, or 'skip'
: sid-meiers-civilization-iii

Art retrieved, post-processing.
```
'Civilization III' can be found at  `http://www.mobygames.com/game/sid-meiers-civilization-iii` on Moby Games. You would enter `sid-meiers-civilization-iii` for the compatible name.

After doing this process you may need to re-run the art scanner, as it will have overwritten its output file. However, it will remember the name mapping you gave it, in `bin/nameMapping.json`. Be certain to commit this file to Git as well.


#### Scanner is making weird decisions on art

Run the following line to have a lot of output about what decisions it's making:
```
perl coverArtScanner.pl -e dev -o gamename -t
```

If it's really a weird decision, report this as an issue.

### Test file

Copy the output file (either `devgenerated/roster_new.json` or `generated/roster_new.json`) into `dev/roster.json` or `dist/roster.json`. Change the line back in `js/main.js` to read this file. See if it works.

### Commit file

Copy the output file to `bin/roster.json`. Remove `bin/roster.*.json`. Commit the file and push.


## Deploying to the demo site

Run `grunt full-deploy`, then run `grunt gh-pages`.

# Previous Versions
#### 0.1.3
* Internals
    * Added Yarn as a dependency management, updated all Node modules.
    * Moved playlist sorting to main.js, instead of relying on Angular.
    * Song "indexes" are now used a bit more like ID numbers instead of weird mappings

* Player
    * Updated the playlist to the Nov 16th Update

#### 0.1.2
* Internals
    * Reworked the internal build process to support a 'dev' and 'prod' branch
    * Added a little overlay to show the build type.
    * Reworked most of the actual pipeline, resulting in minified CSS and uglified JS

* Player
    * Updated the playlist to the Sept 7th update

#### 0.1.1
* Internals
    * Corrected an error in playlist sorting, Angular does not preserve the original index pre-sort.
    * Reduced CPU usage in timelineUpdate() by caching bounding rectangles.

* Player
    * Loading spinner added for when a playlist is loading.
    * The playlist will now neither overscroll nor underscroll when attempting to focus on an entry at the end of the playlist.
    * Failures that the user should know about are now displayed in an error box.
    * Removed the Recent News tab, as it doesn't do anything.
    * Removed the "album" listing.

#### 0.1.0
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

#### 0.0.6
* Internals
    * Removed more broken Angular code
    * Layout fixes and automatic correction of when the layout changes.
* Player
    * Fixed a rare case where the shuffle would pick the same song twice and stop playing.
* Layouts
    * Streambox, a stubby version of the Current Song tab.
    * Streambar, the top controls bar and nothing else.

#### 0.0.5
* Song information panel
 * Toggle shuffling to current song
 * Direct download
 * Sharing links, which can share just a playlist or playlist+song
* Layouts panel
* Internals
 * Updated Modernizr to 3, now supporting Opus detection.
 * Check available filetypes for each song and choose best available
 * Generated favicons for every platform

#### 0.0.4
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

#### 0.0.3
* Increase the size of the playlist items on the touch interface
* Add some support for saving/loading/remembering themes, so if a user sets it the app will read a cookie to get their preferences, or presets.
* Re-style the Options box to use the right colors.
* Make some icons so the site will show the right graphics on the Chrome New Tab, Mozilla Recent Tabs, or Windows Metro UI panels.
* Allow switching between the different playlists.

#### 0.0.2
* Added a new font, "Titillium Web".
* Added an options menu, accessible by clicking the gear next to the Fullscreen button.
* Added a touch-style interface, automatically applied on all touchscreen devices, manually toggleable in the Options menu.
* Added some themeing support. Currently, it doesn't change the gradients on the controls bar.
* Added scrolling animation on the list when a new song is played.

# License
Released under the [MIT License](https://www.tldrlegal.com/l/mit)

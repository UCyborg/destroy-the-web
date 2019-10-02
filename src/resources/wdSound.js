/**
 * Copyright (c) 2009, Jose Enrique Bolanos
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *  * Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *  * Neither the name of Jose Enrique Bolanos nor the names
 *    of its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER
 * OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **/

var EXPORTED_SYMBOLS = [ "WebDestroyer.Sound" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Ce = Components.Exception;

Components.utils.import("resource://webdes/wdCommon.js");

// The number of explosion sounds available
const NUM_EXPLOSION_SOUNDS = 15;
// The number of background music files available
const NUM_BGMUSIC = 15;

/**
 * WebDestroyer Sound. Loads and plays the different sound effects in the game.
 */
if (typeof(WebDestroyer.Sound) == 'undefined') {
WebDestroyer.Sound = {

  /* Logger for this object. */
  _logger : null,

  /* Array of explosion sounds */
  _explosionSounds : null,
  /* Array of background music sounds */
  _bgMusic : null,
  /* Current index of bg music */
  _bgMusicIndex : -1,
  /* Game End sound */
  _gameEndSound : null,
  /* Game Cancel sound */
  _gameCancelSound : null,
  /* Bonus sound */
  _bonusSound : null,
  /* Miss sound */
  _missSound : null,

  /**
   * Initializes the object.
   */
  init : function() {
    this._logger = WebDestroyer.getLogger("WebDestroyer.Sound", "Info");
    this._logger.debug("init");

    // Add all the sounds to the hidden window
    let win =
      Cc["@mozilla.org/appshell/appShellService;1"].
        getService(Ci.nsIAppShellService).hiddenDOMWindow;
    let doc = win.document;

    this._gameEndSound =
      this._createSound(doc, "chrome://webdes/content/sounds/gameEnd.wav");
    this._gameCancelSound =
      this._createSound(doc, "chrome://webdes/content/sounds/gameCancel.wav");
    this._bonusSound =
      this._createSound(doc, "chrome://webdes/content/sounds/bonus.wav");
    this._missSound =
      this._createSound(doc, "chrome://webdes/content/sounds/miss.wav");

    this._explosionSounds = [];
    for (let i = 0; i < NUM_EXPLOSION_SOUNDS; i++) {
      this._explosionSounds.push(this._createSound(
        doc, "chrome://webdes/content/sounds/explod" + i + ".wav"));
    }

    this._bgMusic = [];
    for (let i = 0; i < NUM_BGMUSIC; i++) {
      this._bgMusic.push(this._createSound(
        doc, "chrome://webdes/content/sounds/bgmusic" + i + ".ogg"));
    }
  },

  /**
   * Creates a sound by inserting an audio tag in the given document.
   * @param aDocument The document in which the sound in injected.
   * @param aSoundSource The source of the sound.
   * @return The sound (audio tag) element.
   */
  _createSound : function(aDocument, aSoundSource) {
    this._logger.trace("_createSound");

    let sound =
      aDocument.createElementNS("http://www.w3.org/1999/xhtml", "audio");
    sound.setAttribute("src", aSoundSource);
    sound.setAttribute("autobuffer", true);

    aDocument.documentElement.appendChild(sound);
    //sound.load();

    return sound;
  },

  /**
   * Whether sound is enabled or not.
   * @return True if enabled, false if disabled.
   */
  _isSoundEnabled : function() {
    this._logger.trace("_isSoundEnabled");

    return WebDestroyer.Application.prefs.
      get(WebDestroyer.PREF_BRANCH + "sound").value;
  },

  /**
   * Plays the given sound object from the beginning.
   * @param aSound The sound object to be played.
   */
  _playSound : function(aSound) {
    this._logger.trace("_playSound");

    if (this._isSoundEnabled()) {
      // Stop, rewind, and play sound
      try { aSound.pause();         } catch (e) { this._logger.warn("Could not pause sound. Exception: "  + e); }
      try { aSound.currentTime = 0; } catch (e) { this._logger.warn("Could not rewind sound. Exception: " + e); }
      try { aSound.play();          } catch (e) { this._logger.warn("Could not play sound. Exception: "   + e); }
    }
  },

  /**
   * Pauses the given sound object.
   * @param aSound The sound object to be paused.
   */
  _pauseSound : function(aSound) {
    this._logger.trace("_pauseSound");
    aSound.pause();
  },

  /**
   * Resumes playback of the given sound object.
   * @param aSound The sound object to be resumed.
   */
  _resumeSound : function(aSound) {
    this._logger.trace("_resumeSound");

    if (this._isSoundEnabled()) {
      aSound.play();
    }
  },

  /**
   * Stops all sounds.
   */
  stopAll : function() {
    this._logger.debug("stopAll");

    for each (let sound in this._bgMusic) {
      sound.pause();
    }
  },

  /**
   * Plays the "Game End" sound.
   */
  playGameEnd : function() {
    this._logger.debug("playGameEnd");
    this._playSound(this._gameEndSound);
  },

  /**
   * Plays the "Game Canceled" sound.
   */
  playGameCancel : function() {
    this._logger.debug("playGameCancel");
    this._playSound(this._gameCancelSound);
  },

  /**
   * Plays the "Bonus" sound.
   */
  playBonus : function() {
    this._logger.debug("playBonus");
    this._playSound(this._bonusSound);
  },

  /**
   * Plays the "Miss" sound.
   */
  playMiss : function() {
    this._logger.debug("playMiss");
    this._playSound(this._missSound);
  },

  /**
   * Plays a random explosion sound.
   */
  playExplosion : function() {
    this._logger.debug("playExplosion");

    let i = Math.floor(Math.random() * NUM_EXPLOSION_SOUNDS);
    this._playSound(this._explosionSounds[i]);
  },

  /**
   * Obtains the next background music index, based on the lastMusic preference,
   * and sets the new index in the same preference.
   * @return The next bg music index, relative to the _bgMusic array.
   */
  _getNextBGMusicIndex : function() {
    this._logger.trace("_getNextBGMusicIndex");

    let i = WebDestroyer.Application.prefs.
      get(WebDestroyer.PREF_BRANCH + "lastMusic").value;

    i = Math.max(0, (i+1) % NUM_BGMUSIC);

    WebDestroyer.Application.prefs.
      setValue(WebDestroyer.PREF_BRANCH + "lastMusic", i);

    return i;
  },

  /**
   * Plays a background music file from the beginning.
   */
  playBGMusic : function() {
    this._logger.debug("playBGMusic");

    this._bgMusicIndex = this._getNextBGMusicIndex();
    this._playSound(this._bgMusic[this._bgMusicIndex]);
  },

  /**
   * Pauses the current background music.
   */
  pauseBGMusic : function() {
    this._logger.debug("pauseBGMusic");
    this._pauseSound(this._bgMusic[this._bgMusicIndex]);
  },

  /**
   * Resumes the current background music.
   */
  resumeBGMusic : function() {
    this._logger.debug("resumeBGMusic");
    this._resumeSound(this._bgMusic[this._bgMusicIndex]);
  }
};}

/**
 * WebDestroyer.Sound constructor.
 */
(function() {
  this.init();
}).apply(WebDestroyer.Sound);

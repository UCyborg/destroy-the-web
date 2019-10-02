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

Components.utils.import("resource://webdes/wdCommon.js");
Components.utils.import("resource://webdes/wdGame.js");
Components.utils.import("resource://webdes/wdSound.js");
Components.utils.import("resource://webdes/wdCountdown.js");
Components.utils.import("resource://webdes/wdTransformation.js");

/**
 * WebDestroyer chrome namespace. We need a separate one because this one is
 * defined per window.
 */
if (typeof(WebDestroyerChrome) == 'undefined') {
  var WebDestroyerChrome = {};
};

/**
 * Browser overlay controller. This is the entry point for most operations that
 * happen in the add-on.
 */
WebDestroyerChrome.BrowserOverlay = {

  /* Logger for this object. */
  _logger : null,

  /**
   * Initializes the object.
   */
  init : function() {
    this._logger = WebDestroyer.getLogger("WebDestroyerChrome.BrowserOverlay");
    this._logger.debug("init");

    // Add an observer to the status bar button visibility preference
    this.Preferences.observe(
      WebDestroyer.PREF_BRANCH + "statusbarButton", this._updateStatusbarButton);
    this._updateStatusbarButton();

    // Perform first run operations
    if (WebDestroyer.Prefs.getBoolPref("firstRun")) {
        this._installToolbarButton();
        WebDestroyer.Prefs.setBoolPref("firstRun", false);
    }
  },

  /**
   * Unloads the object.
   */
  uninit : function() {
    this._logger.debug("uninit");

    // Remove observer of the status bar button visibility preference
    this.Preferences.ignore(
      WebDestroyer.PREF_BRANCH + "statusbarButton", this._updateStatusbarButton);
  },

  /**
   * Installs the toolbar button the first time the extension is run.
   */
  _installToolbarButton : function() {
    this._logger.trace("_installToolbarButton");

    try {
      let toolbar = document.getElementById("nav-bar");
      let curSet = toolbar.currentSet;

      if (-1 == curSet.indexOf("webdes-play-button")) {
        let set;

        // Place the button before the urlbar
        if (curSet.indexOf("urlbar-container") != -1) {
          set =
            curSet.replace(
              /urlbar-container/, "webdes-play-button,urlbar-container");
        } else { // at the end
          set = curSet + ",webdes-play-button";
        }

        toolbar.setAttribute("currentset", set);
        toolbar.currentSet = set;
        document.persist("nav-bar", "currentset");

        BrowserToolboxCustomizeDone(true);
      }
    } catch(e) {}
  },

  /**
   * Updates the visibility of the statusbar button (panel).
   * @param aEvent Preference change event.
   */
  _updateStatusbarButton : function(aEvent) {
    let that = WebDestroyerChrome.BrowserOverlay;
    that._logger.trace("_updateStatusbarButton");

    let panel = document.getElementById("webdes-statusbar-panel");
    if (that.Preferences.get(WebDestroyer.PREF_BRANCH + "statusbarButton"))
      panel.removeAttribute("hidden");
    else
      panel.setAttribute("hidden", true);
  },

  /**
   * Enables or disables the "Play" button depending on whether the current
   * page has finished loading.
   */
  updatePlayButton : function() {
    this._logger.debug("updatePlayButton");

    let playButtonBroadcaster =
      document.getElementById("webdes-play-button-broadcaster");

    // Check if the document has finished loading (i.e. title available)
    // TODO: Find a better way to determine this
    let title = String(content.document.title);
    if (title.length > 0)
      playButtonBroadcaster.setAttribute("disabled", "false");
    else
      playButtonBroadcaster.setAttribute("disabled", "true");
  },

  /**
   * Starts the game in the current tab document.
   * @param aEvent The event that triggered this action.
   */
  play : function(aEvent) {
    this._logger.debug("play");
    WebDestroyerChrome.GameController.play();
  }
};

Components.utils.import("resource://webdes/Preferences.js", WebDestroyerChrome.BrowserOverlay);

window.addEventListener(
  "load", function() { WebDestroyerChrome.BrowserOverlay.init(); }, false);
window.addEventListener(
  "unload", function() { WebDestroyerChrome.BrowserOverlay.uninit(); }, false);

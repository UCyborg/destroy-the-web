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

/**
 * WebDestroyer chrome namespace. We need a separate one because this one is
 * defined per window.
 */
if (typeof(WebDestroyerChrome) == 'undefined') {
  var WebDestroyerChrome = {};
};

/**
 * Score dialog controller..
 */
WebDestroyerChrome.ScoreDialog = {

  /* Logger for this object. */
  _logger : null,
  /* Reference to the game element. */
  _game : null,

  /**
   * Initializes the object.
   */
  init : function() {
    this._logger = WebDestroyer.getLogger("WebDestroyerChrome.ScoreDialog");
    this._logger.debug("init");

    this._game = window.arguments[0].game;

    let labels = {
      "webdes-score-embeds"   : this._game.ELEMENT_TYPE_EMBED,
      "webdes-score-tables"   : this._game.ELEMENT_TYPE_TABLE,
      "webdes-score-divs"     : this._game.ELEMENT_TYPE_DIV,
      "webdes-score-headings" : this._game.ELEMENT_TYPE_HEADING,
      "webdes-score-inputs"   : this._game.ELEMENT_TYPE_INPUT,
      "webdes-score-images"   : this._game.ELEMENT_TYPE_IMAGE,
      "webdes-score-links"    : this._game.ELEMENT_TYPE_LINK,
      "webdes-score-other"    : this._game.ELEMENT_TYPE_OTHER
    };

    for (let labelId in labels) {
      let count = this._game.getDestroyedElementCount(labels[labelId]);
      let label = document.getElementById(labelId);
      label.value = "x" + count;
      if (count > 0)
        label.parentNode.setAttribute("class", "highlight");
    }

    let timeBonus = document.getElementById("webdes-score-timeBonus");
    timeBonus.value = this._game.timeBonus;
    if (this._game.timeBonus > 0)
      timeBonus.parentNode.setAttribute("class", "super-highlight");

    let noMissBonus = document.getElementById("webdes-score-noMissBonus");
    noMissBonus.value = this._game.noMissBonus;
    if (this._game.noMissBonus > 0)
      noMissBonus.parentNode.setAttribute("class", "super-highlight");

    document.getElementById("webdes-score-page-title").value =
      this._game.pageTitle;
    document.getElementById("webdes-score-page-url").value =
      this._game.pageURL;
    document.getElementById("webdes-score-value").value =
      this._game.score;
  },

  /**
   * Opens the score submission page, passing the game results.
   */
  submitScore : function() {
    this._logger.debug("submitScore");

    let dataString =
      "gameId=" + encodeURIComponent(this._game.gameId) +
      "&pageTitle=" + encodeURIComponent(this._game.pageTitle) +
      "&pageURL=" + encodeURIComponent(this._game.pageURL) +
      "&score=" + this._game.score +
      "&secondsLeft=" + this._game.secondsLeft +
      "&destroyedArray=" + this._game.destroyedArray.toString();

    let ss =
      Components.classes["@mozilla.org/io/string-input-stream;1"].
        createInstance(Components.interfaces.nsIStringInputStream);
    ss.data = dataString;

    let postData =
      Components.classes["@mozilla.org/network/mime-input-stream;1"].
        createInstance(Components.interfaces.nsIMIMEInputStream);
    postData.addHeader("Content-Type", "application/x-www-form-urlencoded");
    postData.addContentLength = true;
    postData.setData(ss);

    let browser = window.opener.getBrowser();

    // Look for a destroytheweb.net page, and reuse it
    let found = false;
    let numTabs = browser.browsers.length;
    for (let i = 0; i < numTabs; i++) {
      let tabBrowser = browser.getBrowserAtIndex(i);
      if (String(tabBrowser.currentURI.spec).match(/destroytheweb\.net/gi)) {

        tabBrowser.loadURIWithFlags(
          "http://www.destroytheweb.net/submit.php",
          null, null, null, postData);

        browser.selectedTab = browser.tabContainer.childNodes[i];
        found = true;
      }
    }

    // If not found, add a new tab
    if (!found) {
      browser.selectedTab =
        browser.addTab(
          "http://www.destroytheweb.net/submit.php",
          null, null,
          postData,
          null, null);
    }
  }
};

window.addEventListener(
  "load", function() { WebDestroyerChrome.ScoreDialog.init(); }, false);

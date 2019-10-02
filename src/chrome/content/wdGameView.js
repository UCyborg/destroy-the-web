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

/**
 * WebDestroyer chrome namespace. We need a separate one because this one is
 * defined per window.
 */
if (typeof(WebDestroyerChrome) == 'undefined') {
  var WebDestroyerChrome = {};
};

/**
 * Game view. Handles the game UI.
 */
WebDestroyerChrome.GameView = {

  /* Logger for this object. */
  _logger : null,

  /**
   * Initializes the object.
   */
  init : function() {
    this._logger = WebDestroyer.getLogger("WebDestroyerChrome.GameView");
    this._logger.debug("init");
  },

  /**
   * Unloads the object.
   */
  uninit : function() {
    this._logger.debug("uninit");
  },

  /**
   * Inserts the crosshair in the document where the game will be played.
   * @return The crosshair element.
   */
  insertCrosshair : function() {
    this._logger.debug("insertCrosshair");

    let doc = window.content.document;

    // Hide the mouse ponter
    doc.documentElement.style.cursor = "none";

    let div = WebDestroyer.createGameElement(doc, "div");
    div.style.width  = WEBDESTROYER_IMAGE_CROSSHAIR_WIDTH  + "px";
    div.style.height = WEBDESTROYER_IMAGE_CROSSHAIR_HEIGHT + "px";
    div.style.opacity = 0.8;

    let img = doc.createElement("img");
    img.src = WEBDESTROYER_IMAGE_CROSSHAIR;
    div.appendChild(img);

    doc.documentElement.appendChild(div);
    return div;
  },

  /**
   * Starts the game clock and updates it every few miliseconds.
   */
  startClock : function() {
    this._logger.debug("startClock");

    let that = this;
    let label = document.getElementById("webdes-statusbar-timeLeft-value");

    var updateTime = function() {
      // Exit if the game has finished
      if (!WebDestroyerChrome.GameController.isPlaying)
        return;

      let now = (new Date()).getTime();
      let elapsed = now - WebDestroyerChrome.GameController.game.startTime;
      let timeLeft = WEBDESTROYER_GAME_TIME - elapsed;

      let sec = Math.floor(timeLeft / 1000);
      let msec = timeLeft - (sec * 1000);

      if (sec < 10) sec = "0" + sec;

      if (msec < 10) msec = "00" + msec;
      else if (msec < 100) msec = "0" + msec;

      if (timeLeft > 20) {
        label.value = sec + ":" + msec;
        window.setTimeout(updateTime, 20);
      } else {
        label.value = "00:000";
      }
    };
    updateTime();
  },

  showStatusbar : function(aShow) {
    this._logger.debug("showStatusvar");

    let statusbar = document.getElementById("webdes-statusbar");
    if (aShow) {
      document.getElementById("webdes-statusbar-score-value").value = "0";
      document.getElementById("webdes-statusbar-element").value = "";
      statusbar.removeAttribute("hidden");
    } else {
      statusbar.setAttribute("hidden", true);
    }
  },

  updateStatusbarScore :
    function(aElementType, aScore, aMultiplier, aTotalScore) {
    this._logger.debug("updateStatusbarScore");

    let scoreLabel = document.getElementById("webdes-statusbar-score-value");
    let elementLabel = document.getElementById("webdes-statusbar-element");

    scoreLabel.value = aTotalScore;
    elementLabel.value =
      aElementType.toUpperCase() +
      (aMultiplier > 1 ? " (x" + aMultiplier + ")" : "") +
      (aScore > 0 ? " +" + aScore : " " + aScore);

    let opacityTransformation =
      new WebDestroyer.Transformation(elementLabel, "opacity", 0, 1, 10);
    let sizeTransformation =
      new WebDestroyer.Transformation(elementLabel, "fontSize", 1, 2, 10);
    sizeTransformation.setUnit("em");

    WebDestroyerChrome.Animation.executeTransformations(
      [opacityTransformation, sizeTransformation], 20);
  }
};

window.addEventListener(
  "load", function() { WebDestroyerChrome.GameView.init(); }, false);
window.addEventListener(
  "unload", function() { WebDestroyerChrome.GameView.uninit(); }, false);

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
 * Game controller. Handles the events of a single game.
 */
WebDestroyerChrome.GameController = {

  /* Logger for this object. */
  _logger : null,
  /* String bundle in the overlay. */
  _bundle : null,

  /* The current WebDestroyer.Game object. */
  game : null,
  /* Reference to the tab in which the current game is being played. */
  _gameTab : null,
  /* Reference to the countdown object used to start the game. */
  _countdown : null,
  /* Reference to the timeout used to end the game. */
  _gameTimeout : null,
  /* Reference to the crosshair element, injected in the document */
  _crosshair : null,

  /* Whether a game is currently being played (private var). */
  _isPlaying : false,
  /* Whether a game is currently being played (public getter). */
  get isPlaying() { return this._isPlaying; },

  /**
   * Initializes the object.
   */
  init : function() {
    this._logger = WebDestroyer.getLogger("WebDestroyerChrome.GameController");
    this._logger.debug("init");
  },

  /**
   * Unloads the object.
   */
  uninit : function() {
    this._logger.debug("uninit");
    this._gameTab = null;
  },

  /**
   * Starts a game session by displaying the countdown.
   */
  play : function() {
    this._logger.debug("play");

    if (this._isPlaying) {
      this._tryToCancel();
    } else {

      let promptService =
        Cc["@mozilla.org/embedcomp/prompt-service;1"].
          getService(Ci.nsIPromptService);

      // Check that this is a valid page to play the game
      if (!this._isValidPage()) {
        promptService.alert(
          window,
          WebDestroyer.overlayBundle.GetStringFromName("webdes.prompt.title"),
          WebDestroyer.overlayBundle.GetStringFromName("webdes.prompt.invalidPage"));
        return;
      }
      // Check if this is the first game, prompting for help
      if (WebDestroyer.Prefs.getBoolPref("firstGame")) {
        WebDestroyer.Prefs.setBoolPref("firstGame", false);

        let rulesResult = promptService.confirm(
          window,
          WebDestroyer.overlayBundle.GetStringFromName("webdes.prompt.title"),
          WebDestroyer.overlayBundle.GetStringFromName("webdes.prompt.firstGame"));
        if (rulesResult) {
          openUILinkIn("http://www.destroytheweb.net/howtoplay.html", 'tab');
          return;
        }
      }
      // Check for inner frames and prompt for confirmation
      let iframes = window.content.document.getElementsByTagName("iframe");
      let frames = window.content.document.getElementsByTagName("frame");
      let frameSets = window.content.document.getElementsByTagName("frameset");

      if (iframes.length > 0 || frameSets.length > 0 || frames.length > 0) {
        let framesResult = promptService.confirm(
          window,
          WebDestroyer.overlayBundle.GetStringFromName("webdes.prompt.title"),
          WebDestroyer.overlayBundle.GetStringFromName("webdes.prompt.frames"));
        if (!framesResult)
          return;
        // Hide frames
        for (let i = 0; i < iframes.length; i++) {
          iframes[i].style.display = "none !important";
          iframes[i].parentNode.removeChild(iframes[i]);
        }
        for (let i = 0; i < frames.length; i++)
          frames[i].style.display = "none !important";
        for (let i = 0; i < frameSets.length; i++)
          frameSets[i].style.display = "none !important";
      }

      // Start the game
      this._isPlaying = true;
      this._gameTab = window.getBrowser().selectedTab.linkedBrowser;

      let that = this;
      this._countdown = new WebDestroyer.Countdown(
        window, window.content.document, function() { that._onGameStarted(); });

      WebDestroyer.Sound.playBGMusic();
      this._countdown.start();
    }
  },

  /**
   * Determines whether the current document is playable, i.e. it contains a
   * Web HTML document loaded via the http(s) protocol.
   * @return True if valid, false otherwise.
   */
  _isValidPage : function() {
    this._logger.trace("_isValidPage");

    const PAGE_REGEX = /^https?:\/\/[^\/].+$/i;

    let location = String(window.content.location);
    let contentType = String(window.content.document.contentType).toLowerCase();

    return (location.match(PAGE_REGEX) && contentType == "text/html");
  },

  /**
   * Aborts the current game session, if there is one.
   */
  abort : function() {
    this._logger.debug("abort");

    if (this.isPlaying) {
      this._endGame();

      WebDestroyer.Sound.stopAll();
      WebDestroyer.Sound.playGameCancel();
    }
  },

  /**
   * Adds mouse events to the web document, required to play the game.
   */
  _addGameEvents : function(aWindow) {
    this._logger.trace("_addGameEvents");

    aWindow.document.addEventListener("mousemove", this.onMouseMove, false);
    aWindow.document.addEventListener("mousedown", this.onMouseDown, false);
  },

  /**
   * Removes the mouse events from the web document, which were addad to play
   * the game.
   */
  _removeGameEvents : function(aWindow) {
    this._logger.trace("_removeGameEvents");

    aWindow.document.removeEventListener("mousemove", this.onMouseMove, false);
    aWindow.document.removeEventListener("mousedown", this.onMouseDown, false);
  },

  /**
   * Handles the beginning of the game session. Called when the countdown has
   * finished.
   */
  _onGameStarted : function() {
    this._logger.trace("_onGameStarted");

    this.game = new WebDestroyer.Game(
      String(window.content.location), String(window.content.document.title));
    this.game.start();
    this._addGameEvents(window.content);

    this._crosshair = WebDestroyerChrome.GameView.insertCrosshair();
    WebDestroyerChrome.GameView.showStatusbar(true);

    let that = this;
    this._gameTimeout =
      window.setTimeout(function() { that._onGameEnded(); }, WEBDESTROYER_GAME_TIME);
    WebDestroyerChrome.GameView.startClock();
  },

  /**
   * Handles the end of the game session. Displays the score dialog and resets
   * the document.
   */
  _onGameEnded : function() {
    this._logger.trace("_onGameEnded");

    this._endGame();

    WebDestroyer.Sound.stopAll();
    WebDestroyer.Sound.playGameEnd();

    // Show score dialog
    window.openDialog(
      "chrome://webdes/content/wdScoreDialog.xul",
      "webdes-score-dialog",
      "chrome,modal,centerscreen,titlebar,toolbar,resizable=no",
      { game : this.game });
  },

  /**
   * Tries to cancel the current game session. This occurs when the user
   * presses the toolbar button while a game is already in progress.
   */
  _tryToCancel : function() {
    this._logger.trace("_tryToCancel");

    let promptService =
      Cc["@mozilla.org/embedcomp/prompt-service;1"].
        getService(Ci.nsIPromptService);

    WebDestroyer.Sound.pauseBGMusic();
    let stopConfirmation = promptService.confirm(
      window,
      WebDestroyer.overlayBundle.GetStringFromName("webdes.prompt.title"),
      WebDestroyer.overlayBundle.GetStringFromName("webdes.prompt.stopGame"));

    if (stopConfirmation) {
      this._endGame();
      WebDestroyer.Sound.stopAll();
      window.getBrowser().reload();
    }
    else {
      WebDestroyer.Sound.resumeBGMusic();
    }
  },

  /**
   * Ends the current game session and restores the page.
   */
  _endGame : function() {
    this._logger.trace("_endGame");

    this._isPlaying = false;
    this._removeGameEvents(window.content);

    if (this.game != null) {

      // Calculate how many seconds are left
      let seconds = 0;
      let now = (new Date()).getTime();
      let elapsed = now - this.game.startTime;
      let timeLeft = WEBDESTROYER_GAME_TIME - elapsed;
      if (timeLeft > 0)
        seconds = Math.floor(timeLeft / 1000);

      this.game.end(seconds);
    }
    if (null != this._countdown) {
      this._countdown.cancel();
    }
    if (null != this._gameTimeout) {
      window.clearTimeout(this._gameTimeout);
      this._gameTimeout = null;
    }

    WebDestroyerChrome.GameView.showStatusbar(false);

    try {
      this._gameTab.reload();
    } finally {
      this._gameTab = null;
    }
  },

  /**
   * Handles the "mouse move" event in the document. If the crosshair exists
   * it is moved to pointer position.
   * @param aEvent The object that triggered this event.
   */
  onMouseMove : function(aEvent) {
    //XXX: No logging here for efficiency reasons
    let that = WebDestroyerChrome.GameController;

    if (that._crosshair == null)
      return;

    let x =
      (aEvent.pageX - Math.floor(WEBDESTROYER_IMAGE_CROSSHAIR_WIDTH / 2));
    let y =
      (aEvent.pageY - Math.floor(WEBDESTROYER_IMAGE_CROSSHAIR_HEIGHT / 2));

    WebDestroyer.moveElement(that._crosshair, x, y);
  },

  /**
   * Handles the "mouse down" event in the document. If the game has started and
   * the left mouse button was pressed, a destroyable element is looked for at
   * the pointer position; if one is found it is destroyed and the score is
   * increased.
   * @param aEvent The object that triggered this event.
   */
  onMouseDown : function(aEvent) {
    let that = WebDestroyerChrome.GameController;
    that._logger.trace("_onMouseDown");

    if (that._crosshair == null)
      return;
    if (aEvent.button != 0)
      return;

    WebDestroyer.hideElement(that._crosshair);

    let destroyableElement = that._getElementAtPoint(
      window.content.document, aEvent.clientX, aEvent.clientY);

    if (null != destroyableElement) {
      let doc = destroyableElement.ownerDocument;

      that._destroyElement(destroyableElement, aEvent);

      if (!that._hasVisibleChildren(doc.getElementsByTagName("body")[0])) {
        // Page cleared, finish the game
        that._onGameEnded();
      }
    }
    else {
      // Missed! deduct points
      that._addMiss(aEvent);
    }

    WebDestroyer.showElement(that._crosshair);
  },

  /**
   * Tries to obtain a destroyable element at the given position.
   * @param aDocument The document in which to look for the element.
   * @param aX The X coordinate in which to look an element.
   * @param aY The Y coordinate in which to look an element.
   * @return A destroyable element if found, null otherwise.
   */
  _getElementAtPoint : function(aDocument, aX, aY) {
    this._logger.trace("_getElementAtPoint");

    let gameElementsHidden = [];
    let element = null;

    do {
      if (element != null) {
        WebDestroyer.hideElement(element);
        gameElementsHidden.push(element);
      }

      element = aDocument.elementFromPoint(aX, aY);

    } while (element != null && element.gameElement);

    for (let i = 0; i < gameElementsHidden.length; i++) {
      WebDestroyer.showElement(gameElementsHidden[i]);
    }

    if (this._isDestroyableElement(element)) {
      return element;
    }
    return null;
  },

  /**
   * Determines whether or not the given element is a destroyable element. To
   * qualify, an element cannot have child nodes (except for text and combos).
   * @param aElement The element to be evaluated.
   * @return True if destroyable, false otherwise.
   */
  _isDestroyableElement : function(aElement) {
    this._logger.trace("_isDestroyableElement");

    let destroyable = false;

    if (null != aElement && !aElement.destroyed && !aElement.gameElement) {

      if (!aElement.hasChildNodes() ||
          aElement.nodeName.toLowerCase() == "select" ||
          aElement.nodeName.toLowerCase() == "input" ||
          aElement.nodeName.toLowerCase() == "a" ||
          !this._hasVisibleChildren(aElement)) {
        destroyable = true;
      }
    }

    return destroyable;
  },

  /**
   * Determines whether the given element has visible children.
   * @param aElement The element to be evaluated.
   * @return True if it has visible children, false otherwise.
   */
  _hasVisibleChildren : function(aElement) {
    this._logger.trace("_hasVisibleChildren");

    for (let i = 0; i < aElement.childNodes.length; i++) {
      let childNode = aElement.childNodes[i];

      if (childNode.gameElement ||
          childNode.nodeType != 1 ||
          childNode.style.visibility == 'hidden' ||
          childNode.style.display == 'none')
        continue;

      let nodeName = childNode.nodeName.toLowerCase();
      if (nodeName != "br" && nodeName != "script") {

        // Check whether the child has size and is in the visible area of
        // the parent (using offset)
        if (childNode.offsetWidth <= 0 || childNode.offsetHeight <= 0 ||
            (childNode.offsetLeft + childNode.offsetWidth) < aElement.offsetLeft ||
            (aElement.offsetLeft + aElement.offsetWidth) < childNode.offsetLeft ||
            (childNode.offsetTop + childNode.offsetHeight) < aElement.offsetTop ||
            (aElement.offsetTop + aElement.offsetHeight) < childNode.offsetTop)
          continue;

        return true;
      }
    }

    return false;
  },

  /**
   * Destroys the given element, performing the appropriate animation and
   * increasing the score.
   * @param aElement The element to be destroyed.
   * @param aEvent The event object where this action was triggered.
   */
  _destroyElement : function(aElement, aEvent) {
    this._logger.trace("_destroyElement");

    aElement.destroyed = true;
    let result = this.game.addDestroyedElement(aElement);

    // TODO: Play different sound depending on the multiplier
    WebDestroyerChrome.Animation.destroyElement(aElement);
    WebDestroyerChrome.Animation.
      popScore(aEvent.pageX, aEvent.pageY, result.score);

    WebDestroyer.Sound.playExplosion();
    if (result.multiplier > 1) {
      window.setTimeout(function() { WebDestroyer.Sound.playBonus(); }, 500);
    }

    WebDestroyerChrome.GameView.updateStatusbarScore(
      aElement.nodeName, result.score, result.multiplier, this.game.score);
  },

  /**
   * Adds a "miss" in the game, performing the appropriate animation and
   * decreasing the score.
   * @param aEvent The event object where this action was triggered.
   */
  _addMiss : function(aEvent) {
    this._logger.trace("_addMiss");

    let result = this.game.addMiss();

    WebDestroyerChrome.Animation.popScore(
      aEvent.pageX, aEvent.pageY,
      WebDestroyer.overlayBundle.GetStringFromName("webdes.miss"));

    WebDestroyer.Sound.playMiss();

    WebDestroyerChrome.GameView.updateStatusbarScore(
      WebDestroyer.overlayBundle.GetStringFromName("webdes.miss"),
      result.score, result.multiplier, this.game.score);
  }
};

window.addEventListener(
  "load", function() { WebDestroyerChrome.GameController.init(); }, false);
window.addEventListener(
  "unload", function() { WebDestroyerChrome.GameController.uninit(); }, false);

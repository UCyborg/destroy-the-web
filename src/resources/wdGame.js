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

var EXPORTED_SYMBOLS = [];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Ce = Components.Exception;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://webdes/wdCommon.js");

// Maximum score multiplier
const MAX_SCORE_MULTIPLIER = 10;
// Seconds left multiplier
const SECONDS_MULTIPLIER = 1000;
// Points deducted for missing
const POINTS_FOR_MISSING = 5;
// No miss bonus
const NO_MISS_MULTIPLIER = 500;

/**
 * Game object. Holds the data of a single game.
 */
WebDestroyer.Game = function(aPageURL, aPageTitle) {
  this._logger = WebDestroyer.getLogger("WebDestroyer.Game");
  this._logger.debug("init");

  this.gameId = WebDestroyer.generateGUID();
  this.pageURL = aPageURL;
  this.pageTitle = aPageTitle;

  this._elementTypes = [];
  this._elementTypes[this.ELEMENT_TYPE_EMBED] =
    { score: 90, regex: /^(embed|object)$/i };
  this._elementTypes[this.ELEMENT_TYPE_TABLE] =
    { score: 65, regex: /^(table|tr|td|th|tbody|thead|tfoot)$/i };
  this._elementTypes[this.ELEMENT_TYPE_DIV] =
    { score: 50, regex: /^(div)$/i };
  this._elementTypes[this.ELEMENT_TYPE_HEADING] =
    { score: 70, regex: /^(h1|h2|h3|h4|h5|h6)$/i };
  this._elementTypes[this.ELEMENT_TYPE_INPUT] =
    { score: 55, regex: /^(form|input|select|textarea)$/i };
  this._elementTypes[this.ELEMENT_TYPE_IMAGE] =
    { score: 35, regex: /^(img)$/i };
  this._elementTypes[this.ELEMENT_TYPE_LINK] =
    { score: 20, regex: /^(a)$/i };
  // This one matches anything, used after every other has been tested
  this._elementTypes[this.ELEMENT_TYPE_OTHER] =
    { score: 10, regex: /.*/i };
};

/**
 * Game object methods.
 */
WebDestroyer.Game.prototype = {
  /* Logger for this object */
  _logger : null,

  /* Id of the game. */
  gameId : null,
  /* The URL of the page in which the game is played. */
  pageURL : null,
  /* The title of the page in which the game is played. */
  pageTitle : null,

  /*
   * Array of element type objects (score and regex). Used to simply the code.
   */
  _elementTypes : null,
  /* Array of destroyed elements count by type */
  _destroyedCounts : null,

  /* Score of the game */
  _score : 0,
  /* Points awarded if the page is cleared before the game timer ends */
  _timeBonus : 0,
  /* Time when the game started */
  _startTime : null,

  /* Security */
  _destroyedArray : null,
  _secondsLeft : 0,

  /* Node name of the last destroyed element, used to multiply score */
  _lastDestroyedNodeName : null,
  /* Multiplier indicator for the score */
  _multiplier : null,
  /* Number of times the player missed */
  _missedCount : 0,

  // Element type constants
  get ELEMENT_TYPE_EMBED()   { return 0; },
  get ELEMENT_TYPE_TABLE()   { return 1; },
  get ELEMENT_TYPE_DIV()     { return 2; },
  get ELEMENT_TYPE_HEADING() { return 3; },
  get ELEMENT_TYPE_INPUT()   { return 4; },
  get ELEMENT_TYPE_IMAGE()   { return 5; },
  get ELEMENT_TYPE_LINK()    { return 6; },
  get ELEMENT_TYPE_OTHER()   { return 7; },

  /* Gets the score */
  get score() { return this._score; },
  /* Gets the time bonus */
  get timeBonus() { return this._timeBonus; },
  /* Gets the start time */
  get startTime() { return this._startTime; },
  /* Gets the destroyedArray (list of destroyed elements) */
  get destroyedArray() { return this._destroyedArray; },
  /* Gets the seconds left when the game finished */
  get secondsLeft() { return this._secondsLeft; },

  /* Gets the value of the no-miss bonus, if obtained. */
  get noMissBonus() {
    if (this._missedCount == 0)
      return (this._destroyedArray.length * NO_MISS_MULTIPLIER);
    return 0;
  },

  /**
   * Starts the game session, initializing its values.
   */
  start : function() {
    this._logger.debug("start");

    this._startTime = (new Date()).getTime();
    this._score = 0;
    this._timeBonus = 0;
    this._lastDestroyedNodeName = null;
    this._multiplier = 1;
    this._missedCount = 0;

    // Security
    this._destroyedArray = [];
    this._secondsLeft = 0;

    this._destroyedCounts = [];
    this._destroyedCounts[this.ELEMENT_TYPE_EMBED]   = 0;
    this._destroyedCounts[this.ELEMENT_TYPE_TABLE]   = 0;
    this._destroyedCounts[this.ELEMENT_TYPE_DIV]     = 0;
    this._destroyedCounts[this.ELEMENT_TYPE_HEADING] = 0;
    this._destroyedCounts[this.ELEMENT_TYPE_INPUT]   = 0;
    this._destroyedCounts[this.ELEMENT_TYPE_IMAGE]   = 0;
    this._destroyedCounts[this.ELEMENT_TYPE_LINK]    = 0;
    this._destroyedCounts[this.ELEMENT_TYPE_OTHER]   = 0;
  },

  /**
   * Ends the game session. If aSecondsLeft is greater than zero, its (integer)
   * value is multiplied by the seconds left bonus value and added to the score.
   */
  end : function(aSecondsLeft) {
    this._logger.trace("_onGameEnded");

    if (aSecondsLeft) {
      this._secondsLeft = Math.max(0, Math.floor(aSecondsLeft));
      this._timeBonus = this._secondsLeft * SECONDS_MULTIPLIER;
      this._score += this._timeBonus;
    }
    this._score += this.noMissBonus;
  },

  /**
   * Adds an element to the destroyed list, incrementing the score accordingly.
   * @param aElement The element to be added to the destroyed list.
   * @return An object with the score and multiplier this element produces.
   */
  addDestroyedElement : function(aElement) {
    this._logger.debug("addDestroyedElement");

    let score = 0;
    let nodeName = aElement.nodeName.toLowerCase();

    for (let elementType = 0;
         elementType < this._elementTypes.length;
         elementType++) {
      let elementTypeObj = this._elementTypes[elementType];

      if (nodeName.match(elementTypeObj.regex)) {
        score = elementTypeObj.score;
        this._destroyedCounts[elementType]++;
        break;
      }
    }

    // Save list of elements and score, that way we can compare in the
    // server and know if the score is legit.
    this._destroyedArray.push(nodeName);

    // Increase the score multiplier if the element is the same as before
    if (this._lastDestroyedNodeName == nodeName) {
      this._multiplier = Math.min(MAX_SCORE_MULTIPLIER, this._multiplier + 1);
    } else {
      this._lastDestroyedNodeName = nodeName;
      this._multiplier = 1;
    }
    score = (this._multiplier * score);
    this._score += score;

    return { score : score, multiplier : this._multiplier };
  },

  /**
   * Adds a "miss" to the game, deducting the necessary points from the total
   * score.
   */
  addMiss : function() {
    this._logger.debug("addMiss");

    this._missedCount++;

    this._lastDestroyedNodeName = null;
    this._multiplier = 1;
    this._score = Math.max(0, this._score - POINTS_FOR_MISSING);

    return { score : -POINTS_FOR_MISSING, multiplier : this._multiplier };
  },

  /**
   * Gets the number of elements of the given type which were destroyed in the
   * game.
   * @param aElementType The type of element.
   * @return The number of destroyed elements.
   */
  getDestroyedElementCount : function(aElementType) {
    this._logger.debug("getDestroyedElementCount");

    if (aElementType != this.ELEMENT_TYPE_EMBED &&
        aElementType != this.ELEMENT_TYPE_TABLE &&
        aElementType != this.ELEMENT_TYPE_DIV &&
        aElementType != this.ELEMENT_TYPE_HEADING &&
        aElementType != this.ELEMENT_TYPE_INPUT &&
        aElementType != this.ELEMENT_TYPE_IMAGE &&
        aElementType != this.ELEMENT_TYPE_LINK &&
        aElementType != this.ELEMENT_TYPE_OTHER) {
      throw new Ce("wdGame: Unrecognized element type");
    }

    return this._destroyedCounts[aElementType];
  },

  /**
   * Gets the wrapped inner object.
   * XXX: This is a workaround so we can pass this object through an observer
   * without having to explicitly declare an interface for it.
   * http://www.mail-archive.com/dev-tech-xpcom@lists.mozilla.org/msg01505.html
   */
  get wrappedJSObject() {
    return this;
  },

  /**
   * We need to pass tracks through observers, so we implement nsISupports.
   */
  QueryInterface: XPCOMUtils.generateQI([Ci.nsISupports])
};

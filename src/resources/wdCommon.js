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

var EXPORTED_SYMBOLS = [ "WebDestroyer" ];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://webdes/log4moz.js");

/**
 * WebDestroyer namespace.
 */
if (typeof(WebDestroyer) == 'undefined') {
  var WebDestroyer = {
    /* The preferences object. */
    get Prefs() { return this._prefs; },
    /* The root branch for all WebDestroyer preferences. */
    get PREF_BRANCH() { return "extensions.webdes."; },

    /* The logger for this object. */
    _logger : null,
    /* The preferences object. */
    _prefs : null,
    /* Reference to the observer service. We use this one a lot. */
    obsService : null,
    /* Overlay string bundle. */
    overlayBundle : null,

    /**
     * Initialize this object.
     */
    init : function() {
      // Setup logging. See http://wiki.mozilla.org/Labs/JS_Modules.

      // The basic formatter will output lines like:
      // DATE/TIME  LoggerName LEVEL  (log message)
      let formatter = new Log4Moz.BasicFormatter();
      let root = Log4Moz.repository.rootLogger;
      let logFile = this.getExtensionDirectory();
      let app;

      logFile.append("log.txt");

      // Loggers are hierarchical, lowering this log level will affect all
      // output.
      root.level = Log4Moz.Level["All"];

      // this appender will log to the file system.
      app = new Log4Moz.RotatingFileAppender(logFile, formatter);
      app.level = Log4Moz.Level["Warn"];
      root.addAppender(app);

      // get a Logger specifically for this object.
      this._logger = this.getLogger("WebDestroyer");
      this._logger.debug("init");

      this._prefs =
        Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);
      this._prefs = this._prefs.getBranch(this.PREF_BRANCH);
      this.obsService =
        Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
      this.overlayBundle =
        Cc["@mozilla.org/intl/stringbundle;1"].
          getService(Ci.nsIStringBundleService).
            createBundle("chrome://webdes/locale/wdBrowserOverlay.properties");
    },

    /**
     * Gets a reference to the directory where WebDestroyer will keep its files.
     * The directory is created if it doesn't exist.
     * @return reference (nsIFile) to the WebDestroyer directory.
     */
    getExtensionDirectory : function() {
      // XXX: there's no logging here because the logger initialization depends
      // on this method.

      let directoryService =
        Cc["@mozilla.org/file/directory_service;1"].
          getService(Ci.nsIProperties);
      let dir = directoryService.get("ProfD", Ci.nsIFile);

      dir.append("dtw");

      if (!dir.exists() || !dir.isDirectory()) {
        // read and write permissions to owner and group, read-only for others.
        dir.create(Ci.nsIFile.DIRECTORY_TYPE, 0774);
      }

      return dir;
    },

    /**
     * Creates a logger repository from Log4Moz.
     * @param aName the name of the logger to create.
     * @param aLevel (optional) the logger level.
     * @return the created logger.
     */
    getLogger : function(aName, aLevel) {
      let logger = Log4Moz.repository.getLogger(aName);

      logger.level = Log4Moz.Level[(aLevel ? aLevel : "All")];

      return logger;
    },

    /**
     * Creates an HTML element that is part of the game interface, i.e. cannot
     * be destroyed during a game session. By default its position is absolute
     * and set to be displayed over every other element in the document.
     * @param aDocument The document in which the game element will be created.
     * @param aNodeName The type of element (node) to create. Div if none
     * supplied.
     */
    createGameElement : function(aDocument, aNodeName) {
      this._logger.debug("createGameElement");

      if (!aNodeName) {
        aNodeName = "div";
      }

      let element = aDocument.createElement(aNodeName);
      element.style.position = "absolute";
      element.style.zIndex = 9999;
      element.style.textAlign = "center";

      element.gameElement = true;

      return element;
    },

    /**
     * Moves a game element to the given (absolute) position inside the
     * document.
     * @param aElement The element to be re-positioned.
     * @param aX The X coordinate in which to place the element.
     * @param aY The Y coordinate in which to place the element.
     */
    moveElement : function(aElement, aX, aY) {
      // XXX: No logging here for efficiency reasons. This method might be
      // called from mousemove event.

      aElement.style.left = aX + "px";
      aElement.style.top = aY + "px";
    },

    /**
     * Hides a game element.
     * @param aElement The element to be hidden.
     */
    hideElement : function(aElement) {
      // XXX: No logging here for efficiency reasons. This method might be
      // called from mousemove event.

      aElement.style.display = "none";
    },

    /**
     * Shows a game element.
     * @param aElement The element to be shown.
     */
    showElement : function(aElement) {
      // XXX: No logging here for efficiency reasons. This method might be
      // called from mousemove event.

      aElement.style.display = "";
    },

    /**
     * Obtains the size (width and height) of the given element.
     * @param aElement The element whose size will be calculated.
     * @return An object with the width and height values of the element.
     */
    getElementSize : function(aElement) {
      this._logger.debug("getElementSize");

      /*let widthString =
        aElement.ownerDocument.defaultView.
          getComputedStyle(aElement,"").getPropertyValue("width");
      let heightString =
        aElement.ownerDocument.defaultView.
          getComputedStyle(aElement,"").getPropertyValue("height");

      // Parse the computed width and height values removing the "px"
      let width = parseInt(widthString.split("px")[0]);
      let height = parseInt(heightString.split("px")[0]);*/

      let width = aElement.scrollWidth;
      let height = aElement.scrollHeight;

      return { width : width, height : height };
    },

    /**
     * Gets the position of an element inside its owner document.
     * @param aElement The element whose position will be calculated.
     * @return An object with the x and y coordinates of the element.
     */
    getElementPosition : function(aElement) {
      this._logger.debug("getElementPosition");

      let x = 0;
      let y = 0;

      if (aElement.offsetParent) {
        do {
          x += aElement.offsetLeft;
          y += aElement.offsetTop;
        } while (aElement = aElement.offsetParent);
      }

      return { x : x, y : y };
    },

    /**
     * Converts the given number to its string representation, adding commas
     * every three units.
     * @param aNumber The number to be formatted.
     * @return The formatted number.
     */
    formatNumber : function(aNumber) {
      this._logger.debug("formatNumber");

      let number = String(aNumber);
      let rgx = /(\d+)(\d{3})/;

      while (rgx.test(number)) {
        number = number.replace(rgx, '$1' + ',' + '$2');
      }
      return number;
    },

    /**
     * Generates a GUID.
     * @return the newly generated GUID.
     */
    generateGUID : function() {
      this._logger.debug("generateGUID");

      let guid = "";
      for (let i = 0; i < 32; i++) {
        guid += Math.floor(Math.random() * 0xF).
          toString(0xF) + (i == 8 || i == 12 || i == 16 || i == 20 ? "-" : "");
      }
      return guid;
    }
  };
}

/**
 * WebDestroyer constructor. This sets up logging for the rest of the extension.
 */
(function() {
  this.init();
}).apply(WebDestroyer);

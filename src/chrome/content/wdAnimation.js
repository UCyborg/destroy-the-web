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
 * Animation. Contains methods used to animate HTML elements in the game.
 */
WebDestroyerChrome.Animation = {

  /* Logger for this object. */
  _logger : null,

  /**
   * Initializes the object.
   */
  init : function() {
    this._logger =
      WebDestroyer.getLogger("WebDestroyerChrome.Animation", "Info");
    this._logger.debug("init");
  },

  /**
   * Unloads the object.
   */
  uninit : function() {
    this._logger.debug("uninit");
  },

  /**
   * Obtains the current animation quality from the preferences.
   */
  _getAnimationQuality : function() {
    this._logger.trace("_getAnimationQuality");

    let quality = WebDestroyer.Prefs.getIntPref("animationQuality");

    // Reset to HIGH in case it was changed outside the accepted values
    if (quality != WEBDESTROYER_ANIMATION_QUALITY_HIGH &&
        quality != WEBDESTROYER_ANIMATION_QUALITY_MEDIUM &&
        quality != WEBDESTROYER_ANIMATION_QUALITY_LOW &&
        quality != WEBDESTROYER_ANIMATION_QUALITY_NO) {
      quality = WEBDESTROYER_ANIMATION_QUALITY_HIGH;
      WebDestroyer.Prefs.setIntPref("animationQuality", quality);
    }

    return quality;
  },

  /**
   * Destroys an element from a document. It grabs an image of the element using
   * a canvas, splits it and animates each piece of the image to resemble an
   * explosion. If the element size cannot be determined, the element is removed
   * without an animation.
   * @param aElement The element to be destroyed.
   */
  destroyElement : function(aElement) {
    this._logger.debug("destroyElement");

    let size = WebDestroyer.getElementSize(aElement);
    let quality = this._getAnimationQuality();

    // If the animation quality is set to NONE, or if for some reason the
    // dimensions cannot be obtained, remove the element.
    if (quality == WEBDESTROYER_ANIMATION_QUALITY_NO ||
        isNaN(size.width) || isNaN(size.height)) {
      aElement.parentNode.removeChild(aElement);
      return;
    }

    let doc = window.content.document;
    let position = WebDestroyer.getElementPosition(aElement);
    let imageData = this._grabImage(position, size);

    aElement.parentNode.removeChild(aElement);

    // The size of the image that was taken of the element
    const IMAGE_WIDTH  = size.width;
    const IMAGE_HEIGHT = size.height;

    // How big the "explosion" canvas will be compared to the original element
    const CANVAS_SIZE_MULTIPLIER = 4;

    // The size of the canvas (image size * canvas size multiplier)
    const CANVAS_WIDTH  = IMAGE_WIDTH  * CANVAS_SIZE_MULTIPLIER;
    const CANVAS_HEIGHT = IMAGE_HEIGHT * CANVAS_SIZE_MULTIPLIER;

    // In how many pieces will the image be split (odd number!) and how many
    // steps the animation will take.
    let PIECES_VER, PIECES_HOR, MAX_STEPS;
    switch (quality) {
      case WEBDESTROYER_ANIMATION_QUALITY_HIGH:
        PIECES_HOR = 7;
        PIECES_VER = 7;
        MAX_STEPS = 10;
        break;
      case WEBDESTROYER_ANIMATION_QUALITY_MEDIUM:
        PIECES_HOR = 5;
        PIECES_VER = 5;
        MAX_STEPS = 10;
        break;
      case WEBDESTROYER_ANIMATION_QUALITY_LOW:
        PIECES_HOR = 3;
        PIECES_VER = 3;
        MAX_STEPS = 5;
        break;
    }

    // The size of each piece of the image
    const PIECE_WIDTH  = Math.floor(IMAGE_WIDTH  / PIECES_HOR);
    const PIECE_HEIGHT = Math.floor(IMAGE_HEIGHT / PIECES_VER);

    // The index of the center pieces of the image
    const CENTER_HOR = Math.floor(PIECES_HOR / 2);
    const CENTER_VER = Math.floor(PIECES_VER / 2);

    // Create a canvas and center it around the original element
    let canvas = WebDestroyer.createGameElement(doc, "canvas");
    canvas.setAttribute("width", CANVAS_WIDTH);
    canvas.setAttribute("height", CANVAS_HEIGHT);
    canvas.style.left =
      (position.x - ((CANVAS_SIZE_MULTIPLIER - 1) * (IMAGE_WIDTH / 2))) + "px";
    canvas.style.top =
      (position.y - ((CANVAS_SIZE_MULTIPLIER - 1) * (IMAGE_HEIGHT / 2))) + "px";
    //canvas.style.border = "thin red solid";
    doc.documentElement.appendChild(canvas);

    let ctx = canvas.getContext("2d");
    let step = 1;
    let image = new Image();

    let draw = function() {

      // Clear the canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.save();

      // Move the center position to the center of the canvas
      ctx.translate(Math.floor(CANVAS_WIDTH / 2), Math.floor(CANVAS_HEIGHT / 2));

      // Calculate how farther away each piece will be drawn in this iteration
      let spacing = Math.sqrt(step);

      for (var i = 0; i < PIECES_HOR; i++) {
        for (var j = 0; j < PIECES_VER; j++) {

          // Draw each piece
          ctx.drawImage(
            image,
            // Grab the rectangle for this piece from the source image
            (i * PIECE_WIDTH), (j * PIECE_HEIGHT), PIECE_WIDTH, PIECE_HEIGHT,
            // Place the rectangle in a different position, depending on the
            // position relative to the center and the spacing,
            ((i - CENTER_HOR) * spacing * PIECE_WIDTH),
            ((j - CENTER_VER) * spacing * PIECE_HEIGHT),
            // with the same dimensions as the original
            PIECE_WIDTH, PIECE_HEIGHT);
        }
      }
      ctx.restore();

      // Make the canvas a little more transparent each time
      canvas.style.opacity = 1 - (step / MAX_STEPS);

      if (step <= MAX_STEPS) {
        step++;
        window.setTimeout(draw, 50);
      } else {
        // Finished. Clean up.
        canvas.parentNode.removeChild(canvas);
      }
    };

    image.onload = draw;
    image.src = imageData;
  },

  /**
   * Pops up a score at the given position in the document.
   * @param aDocument The document in which the animation is performed.
   * @param aX The X position in which to perform the animation.
   * @param aY The Y position in which to perform the animation.
   * @param aScore The score to be animated.
   */
  popScore : function(aX, aY, aScore) {
    this._logger.debug("popScore");

    let doc = window.content.document;

    let score = WebDestroyer.createGameElement(doc, "div");
    WebDestroyer.moveElement(score, aX, aY);
    doc.documentElement.appendChild(score);

    // TODO: Set proper style, perhaps a class from a css file
    score.style.fontFamily = "Courier New, sans-serif";
    score.style.fontWeight = "bold";
    score.style.color = "#F52";

    if (aScore >= 0)
      aScore = "+" + aScore;
    score.innerHTML = aScore;

    // Apply opacity and size transformations
    let opacityTransformation =
      new WebDestroyer.Transformation(score, "opacity", 1, 0, 16);

    let sizeTransformation =
      new WebDestroyer.Transformation(score, "fontSize", 14, 72, 10);
    sizeTransformation.setUnit("px");

    let endFunction = function() {
      score.parentNode.removeChild(score);
    };

    this.executeTransformations(
      [opacityTransformation, sizeTransformation], 50, endFunction);
  },

  /**
   * Executes an array of WebDestroyer.Transformation objects, executing each
   * step in the given interval. When it finishes it calls the given "end"
   * function.
   * @param aTransformations The array of WebDestroyer.Transformation objects.
   * @param aStepInterval The interval in ms between transformation steps.
   * @param aEndFunction (Optional) The function to be called once all
   * transformations have finished.
   */
  executeTransformations :
    function(aTransformations, aStepInterval, aEndFunction) {
    this._logger.trace("_executeTransformations");

    let transformationStepFunction = function() {
      let allFinished = true;
      for (let i = 0; i < aTransformations.length; i++) {
        if (!aTransformations[i].hasFinished()) {
          aTransformations[i].step();
          allFinished = false;
        }
      }
      if (allFinished) {
        if (null != aEndFunction) {
          aEndFunction();
        }
      } else {
        window.setTimeout(transformationStepFunction, aStepInterval);
      }
    };
    transformationStepFunction();
  },

  /**
   * Grabs an image of the current document, using a canvas.
   * @param aPosition The coordinates of where to grab the image.
   * @param aSize The size of the image to be grabbed.
   * @return The data of the image (image/jpeg string representation).
   */
  _grabImage : function(aPosition, aSize) {
    this._logger.trace("_grabImage");

    let doc = window.content.document;

    let canvas = doc.createElement("canvas");
    canvas.setAttribute("width", aSize.width);
    canvas.setAttribute("height", aSize.height);

    let ctx = canvas.getContext("2d");
    ctx.drawWindow(
      doc.defaultView,
      aPosition.x, aPosition.y,
      aSize.width, aSize.height,
      "rgb(255,255,255)");

    return canvas.toDataURL("image/jpeg", "");
  }
};

window.addEventListener(
  "load", function() { WebDestroyerChrome.Animation.init(); }, false);
window.addEventListener(
  "unload", function() { WebDestroyerChrome.Animation.uninit(); }, false);

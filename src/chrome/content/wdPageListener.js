/**
 * Copyright (c) 2011, Jose Enrique Bolanos
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
 * WebDestroyer chrome namespace.
 */
if (typeof(WebDestroyerChrome) == 'undefined') {
  var WebDestroyerChrome = {};
};

/**
 * Tab page progress listener.
 */
WebDestroyerChrome.PageListener = {

  _logger : null,

  init : function() {
    this._logger = WebDestroyer.getLogger("WebDestroyerChrome.PageListener");
    this._logger.debug("init");

    gBrowser.addEventListener("pageshow", this.onPageShow, false);
    gBrowser.addTabsProgressListener(this);
    gBrowser.tabContainer.addEventListener("TabSelect", this.onTabSelected, false);
    gBrowser.tabContainer.addEventListener("TabOpen", this.onTabOpened, false);
    gBrowser.tabContainer.addEventListener("TabClose", this.onTabClosed, false);
  },

  /**
   * Uninitializes and removes the progress listener.
   */
  uninit : function() {
    this._logger.debug("uninit");

    gBrowser.removeEventListener("pageshow", this.onPageShow, false);
    gBrowser.removeTabsProgressListener(this);
    gBrowser.tabContainer.removeEventListener("TabSelect", this.onTabSelected, false);
    gBrowser.tabContainer.removeEventListener("TabOpen", this.onTabOpened, false);
    gBrowser.tabContainer.removeEventListener("TabClose", this.onTabClosed, false);
  },

  onPageShow : function(aEvent) {
    WebDestroyerChrome.BrowserOverlay.updatePlayButton();
  },

  onLocationChange : function(aBrowser, aWebProgress, aRequest, aLocation) {
    WebDestroyerChrome.GameController.abort();
    WebDestroyerChrome.BrowserOverlay.updatePlayButton();
  },

  onTabSelected : function(aEvent) {
    WebDestroyerChrome.GameController.abort();
    WebDestroyerChrome.BrowserOverlay.updatePlayButton();
  },

  onTabOpened : function(aEvent) {
    WebDestroyerChrome.GameController.abort();
    WebDestroyerChrome.BrowserOverlay.updatePlayButton();
  },

  onTabClosed : function(aEvent) {
    WebDestroyerChrome.GameController.abort();
    WebDestroyerChrome.BrowserOverlay.updatePlayButton();
  }
};

window.addEventListener("load",
  function() { WebDestroyerChrome.PageListener.init(); }, false);
window.addEventListener("unload",
  function() { WebDestroyerChrome.PageListener.uninit(); }, false);

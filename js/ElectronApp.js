"use strict";

const {webFrame, remote} = require("electron");
module.exports = {
  init() {
    webFrame.setZoomLevelLimits(1, 1);
    document.documentElement.classList.add("electron");

    document.documentElement.classList.toggle("osx", navigator.platform.includes("Mac"));
    if (!navigator.platform.includes("Mac")) {
      this.initWindowControls();
    }
  },
  initWindowControls() {
    let header = Element("div", {
      class: "caption-buttons",
      parent: document.getElementById("header-container")
    });

    Element("button", {
      class: "caption-button minimize",
      parent: header,
      onclick() {
        remote.BrowserWindow.getFocusedWindow().minimize();
      }
    });

    Element("button", {
      class: "caption-button maximize",
      parent: header,
      onclick() {
        let focusedWindow = remote.BrowserWindow.getFocusedWindow();
        if (focusedWindow.isMaximized()) {
          focusedWindow.unmaximize();
          this.className = "caption-button maximize";
        } else {
          focusedWindow.maximize();
          this.className = "caption-button restore";
        }
      }
    });

    Element("button", {
      class: "caption-button close",
      parent: header,
      onclick() {
        window.close();
      }
    });
  }
};

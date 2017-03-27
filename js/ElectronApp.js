"use strict";

const {webFrame, remote} = require("electron");
module.exports = {
  init() {
    webFrame.setZoomLevelLimits(1, 1);
    document.documentElement.classList.add("electron");

    let isMac = navigator.platform.includes("Mac");
    document.documentElement.classList.toggle("osx", isMac);
    if (!isMac) {
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

    let maximizeBtn = Element("button", {
      class: "caption-button maximize",
      parent: header,
      onclick() {
        let focusedWindow = remote.BrowserWindow.getFocusedWindow();
        if (focusedWindow.isMaximized()) {
          focusedWindow.unmaximize();
        } else {
          focusedWindow.maximize();
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

    let focusedWindow = remote.BrowserWindow.getFocusedWindow();
    focusedWindow.on("unmaximize", () => {
      maximizeBtn.className = "caption-button maximize";
    });
    focusedWindow.on("maximize", () => {
      maximizeBtn.className = "caption-button restore";
    });
  }
};

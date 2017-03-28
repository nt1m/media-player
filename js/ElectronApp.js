"use strict";

const {webFrame, remote, ipcRenderer} = require("electron");
const fs = require("fs");
let MimeTypeUtils = require("mime-types");
module.exports = {
  init() {
    webFrame.setZoomLevelLimits(1, 1);
    document.documentElement.classList.add("electron");

    let isMac = navigator.platform.includes("Mac");
    document.documentElement.classList.toggle("osx", isMac);
    if (!isMac) {
      this.initWindowControls();
    }

    ipcRenderer.on("file-found", (event, path) => {
      this.handleFileFound(path);
    });

    // Debug
    document.addEventListener("keydown", function(e) {
      if (e.which === 123) {
        remote.getCurrentWindow().toggleDevTools();
      } else if (e.which === 116) {
        location.reload();
      }
    });
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
  },

  handleFileFound(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, null, (err, file) => {
        if (err) {
          return reject(err);
        }
        try {
          let name = this.getFileNameFromPath(path);
          let type = MimeTypeUtils.lookup(name);
          if (!type) {
            return reject("No type");
          }
          let blob = new Blob([file.buffer], {type});
          blob.name = name;
          return MediaPlayer.playlist.add(blob);
        } catch (e) {
          reject(e);
          alert("Could not read audio/video file");
        }
        return reject("Unknown error");
      });
    });
  },

  getFileNameFromPath(filePath) {
    let fileName = filePath.split("/").pop();
    if (fileName == filePath) {
      fileName = filePath.split("\\").pop();
    }
    return fileName;
  }
};

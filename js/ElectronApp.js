"use strict";

const {webFrame, remote, ipcRenderer} = require("electron");
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

    ipcRenderer.on("file-found", (event, file, name) => {
      try {
        let type = MimeTypeUtils.lookup(name);
        console.log(type, file, name);
        if (!type) {
          return;
        }

        let arraybuffer = Uint8Array.from(file).buffer;
        let blob = new Blob([arraybuffer], {type});
        blob.name = name;
        MediaPlayer.playlist.add(blob);
      } catch (e) {
        console.error("Couldn't read file" + e);
        alert("Could not read audio/video file");
      }
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
  }
};

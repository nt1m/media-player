"use strict";

const {webFrame, remote, ipcRenderer} = require("electron");
module.exports = {
  init() {
    webFrame.setZoomLevelLimits(1, 1);
    document.documentElement.classList.add("electron");

    let isMac = navigator.platform.includes("Mac");
    document.documentElement.classList.toggle("osx", isMac);
    if (!isMac) {
      this.initWindowControls();
    }
    
    ipcRenderer.on("file-found", (event, file) => {
      function toArrayBuffer(buf) {
          var ab = new ArrayBuffer(buf.length);
          var view = new Uint8Array(ab);
          for (var i = 0; i < buf.length; ++i) {
              view[i] = buf[i];
          }
          return ab;
      }
      try {
      console.log(file);
      let buffer = file;
      let arraybuffer = Uint8Array.from(buffer).buffer;
      let blob = new Blob([arraybuffer], {type: "audio/mp3"});
      MediaPlayer.playlist.add(blob);
      }catch(e) {console.error(e);alert(e.toString());}
    });
    
    // Debug
    document.addEventListener("keydown", function (e) {
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

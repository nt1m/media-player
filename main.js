"use strict";

/* eslint no-undef:0 */
const { app, BrowserWindow, nativeImage, ipcMain } = require("electron");
const path = require("path");
const url = require("url");
const fs = require("fs");

const setupEvents = require("./installer/setup-events");
if (setupEvents.handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

// Setup file handlers
var osxFile;
app.on("open-file", (event, filePath) => {
  if (win && win.webContents && !win.webContents.isLoading()) {
    win.webContents.send("file-found", filePath);
  } else {
    osxFile = filePath;
  }
});

let win;

let image = createNativeImage("./img/icon.png");
if (app.dock) {
  app.dock.setIcon(image);
}

function createNativeImage(relativePath) {
  return nativeImage.createFromPath(path.join(__dirname, relativePath));
}
function setThumbarState(state) {
  if (!win) {
    return;
  }

  if (state == "ended") {
    win.setThumbarButtons([]);
    return;
  }

  let buttons = [];
  buttons.push({
    tooltip: "Previous song",
    icon: path.join(__dirname, "img", "electron", "previous-song.png"),
    click() {
      win.webContents.send("request-video-action", "previous-song");
    },
  });

  if (state == "play") {
    buttons.push({
      tooltip: "Pause",
      icon: path.join(__dirname, "img", "electron", "pause.png"),
      click() {
        win.webContents.send("request-video-action", "pause");
      }
    });
  } else {
    buttons.push({
      tooltip: "Play",
      icon: path.join(__dirname, "img", "electron", "play.png"),
      click() {
        win.webContents.send("request-video-action", "play");
      },
    });
  }

  buttons.push({
    tooltip: "Next song",
    icon: path.join(__dirname, "img", "electron", "next-song.png"),
    click() {
      win.webContents.send("request-video-action", "next-song");
    },
  });

  win.setThumbarButtons(buttons);
}

function onMediaStateChange(event, state) {
  if (app.dock) {
    let badge;
    switch (state) {
      case "pause":
        badge = "⏸";
        break;
      case "play":
        badge = "▶";
        break;
      case "ended":
        badge = "";
        break;
    }
    app.dock.setBadge(badge);
  }
  if (win.setThumbarButtons) {
    setThumbarState(state);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 290,
    minHeight: 290,
    icon: __dirname + "/img/icon.png",
    title: "Media Player",
    hasShadow: true,
    frame: false,
    center: true,
    titleBarStyle: "hidden-inset"
  });
  win.setMenu(null);
  // win.toggleDevTools();
  win.loadURL(url.format({
    pathname: path.join(__dirname, "./index.html"),
    protocol: "file:",
    slashes: true,
  }));

  win.webContents.once("did-stop-loading", () => {
    if (process.platform == "win32") {
      let fileDesc = fs.lstatSync(process.argv[process.argv.length - 1]);
      if (fileDesc.isFile()) {
        var openedFilePath = process.argv[process.argv.length - 1];
        win.webContents.send("file-found", openedFilePath);
      }
    } else if (osxFile) {
      win.webContents.send("file-found", osxFile);
    }
    ipcMain.on("add-recent-file", (_, mediaPath) => app.addRecentDocument(mediaPath));
    ipcMain.on("media-state-change", onMediaStateChange);
  });

  // Close handler
  win.on("closed", () => {
    win = null;
    ipcMain.removeAllListeners("add-recent-file");
    ipcMain.removeAllListeners("media-state-change");

    if (app.dock) {
      app.dock.setBadge("");
    }
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => app.quit());

app.on("activate", () => (win === null) ? createWindow() : 0);


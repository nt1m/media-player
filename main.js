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

  let buttonFlags = state == "ended" ? ["disabled"] : ["enabled"];

  let buttons = [];
  buttons.push({
    tooltip: "Previous song",
    icon: createNativeImage("./img/previous-song.svg"),
    click() {
      win.webContents.send("request-video-action", "previous-song");
    },
    flags: buttonFlags,
  });

  if (state == "play") {
    buttons.push({
      tooltip: "Pause",
      icon: createNativeImage("./img/pause.svg"),
      click() {
        win.webContents.send("request-video-action", "pause");
      }
    });
  } else {
    buttons.push({
      tooltip: "Play",
      icon: createNativeImage("./img/play.svg"),
      click() {
        win.webContents.send("request-video-action", "play");
      },
      flags: buttonFlags,
    });
  }

  buttons.push({
    tooltip: "Next song",
    icon: createNativeImage("./img/previous-song.svg"),
    click() {
      win.webContents.send("request-video-action", "previous-song");
    },
    flags: buttonFlags,
  });

  win.setThumbarButtons(buttons);
}

function onMediaStateChange(event, state) {
  if (app.dock) {
    let badge;
    switch (state) {
      case "pause":
        badge = "❚ ❚";
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
    app.dock.setBadge("");
    ipcMain.removeAllListeners();
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => app.quit());

app.on("activate", () => (win === null) ? createWindow() : 0);


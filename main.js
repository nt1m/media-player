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

let image = nativeImage.createFromPath(path.join(__dirname, "./img/icon.png"));
if (app.dock) {
  app.dock.setIcon(image);
}

function onStateChange(event, state) {
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

    ipcMain.on("media-state-change", onStateChange);
  });

  // Close handler
  win.on("closed", () => {
    win = null;
    ipcMain.removeAllListeners("media-state-change");
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => app.quit());

app.on("activate", () => (win === null) ? createWindow() : 0);


"use strict";

/* eslint no-undef:0 */
const { app, BrowserWindow, nativeImage } = require("electron");
const path = require("path");
const url = require("url");
const fs = require("fs");

const setupEvents = require("./installer/setup-events");
if (setupEvents.handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

let win;

let image = nativeImage.createFromPath(path.join(__dirname, "./img/icon.png"));
if (app.dock) {
  app.dock.setIcon(image);
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

  // Setup file handlers
  var osxFile;
  app.on("open-file", (event, filePath) => {
    var data = fs.readFileSync(filePath, null);
    if (win.webContents.isLoading()) {
      win.webContents.send("file-found", data, filePath);
    } else {
      let fileName = getFileNameFromPath(filePath);
      osxFile = {data, fileName};
    }
  });
  win.webContents.once("did-stop-loading", () => {
    let fileDesc = fs.lstatSync(process.argv[process.argv.length - 1]);
    if (process.platform == "win32" && fileDesc.isFile()) {
      var openFilePath = process.argv[process.argv.length - 1];
      var data = fs.readFileSync(openFilePath, null);
      let openFileName = getFileNameFromPath(openFilePath);
      win.webContents.send("file-found", data, openFileName);
    } else if (osxFile) {
      win.webContents.send("file-found", osxFile.data, osxFile.fileName);
    }
  });

  // Close handler
  win.on("closed", () => {
    win = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => app.quit());

app.on("activate", () => (win === null) ? createWindow() : 0);

function getFileNameFromPath(filePath) {
  let fileName = filePath.split("/").pop();
  if (fileName == filePath) {
    fileName = filePath.split("\\").pop();
  }
  return fileName;
}

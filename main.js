"use strict";

/* eslint no-undef:0 */
const { app, BrowserWindow, nativeImage } = require("electron");
const path = require("path");
const url = require("url");

let win;

let image = nativeImage.createFromPath(path.join(__dirname, "./img/icon.png"));
if (app.dock) {
  app.dock.setIcon(image);
}
function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: __dirname + "/img/icon.png",
    title: "Media Player",
    darkTheme: true,
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
  win.on("closed", () => {
    win = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => app.quit());

app.on("activate", () => (win === null) ? createWindow() : 0);

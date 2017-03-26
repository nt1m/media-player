"use strict";

/* eslint no-undef:0 */
const {app, BrowserWindow} = require("electron");
const path = require("path");
const url = require("url");

let win;

function createWindow() {
  win = new BrowserWindow({width: 800, height: 600, icon: __dirname + "/img/icon.png"});
  win.setMenu(null);
  win.loadURL(url.format({
    pathname: path.join(__dirname, "./index.html"),
    protocol: "file:",
    slashes: true,
  }));
  win.on("closed", () => win = null);
}

app.on("ready", createWindow);

app.on("window-all-closed", () => app.quit());

app.on("activate", () => (win === null) ? createWindow() : 0);

"use strict";

/* eslint-env node */
const createWindowsInstaller = require("electron-winstaller").createWindowsInstaller;
const path = require("path");

getInstallerConfig().then(createWindowsInstaller).catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

function getInstallerConfig() {
  console.log("Creating windows installer");
  const rootPath = path.join("./");
  const outPath = path.join(rootPath, "dist");

  return Promise.resolve({
    appDirectory: path.join(outPath, "Media\ Player-win32-x64"),
    authors: "Tim Nguyen and Mohamed Hadjoudj",
    noMsi: true,
    outputDirectory: path.join(outPath, "windows-installer"),
    exe: "Media Player.exe",
    setupExe: "MediaPlayerInstaller.exe",
    setupIcon: path.join(rootPath, "img/icon.ico")
  });
}

"use strict";

const {webFrame} = require("electron");
module.exports = {
  init() {
    webFrame.setZoomLevelLimits(1, 1);
    document.documentElement.classList.add("electron");
  }
};

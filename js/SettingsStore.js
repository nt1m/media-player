"use strict";

function SettingsStore(params) {
  this.isElectron = params.isElectron;
  this.getItem = this.getItem.bind(this);
  this.setItem = this.setItem.bind(this);
  for (let definition of this.definitions) {
    if (!this.getItem(definition.id)) {
      this.setItem(definition.id, definition.default);
    } else {
      definition.onApply(this.getItem(definition.id));
    }
  }
}

SettingsStore.prototype = {
  get definitions() {
    return [{
      id: "volume",
      name: "Volume",
      hidden: true,
      default: 0.5,
      onApply: (value) => {
        value = new Number(value);

        if (isNaN(value)) {
          return this.setItem("volume", 0.5);
        }

        return MediaPlayer.changeVolume(value);
      }
    },
    {
      id: "theme",
      name: "Theme",
      default: "dark",
      values: ["light", "dark"],
      onApply(value) {
        document.body.classList.toggle("light", value === "light");
      }
    },
    {
      id: "theme-highlight-color",
      name: "Highlight color",
      default: "#0087ff",
      type: "color",
      onApply(value) {
        function toRgb(color) {
          let r = "0x" + color[1] + color[2];
          let g = "0x" + color[3] + color[4];
          let b = "0x" + color[5] + color[6];
          return [r, g, b];
        }

        function getLuminance([r, g, b]) {
          let distanceB = 0, distanceW = 0;
          distanceB = 0.2 * r + g * 0.7 + b * 0.1;
          distanceW = (255 - r) * 0.2 + (255 - g) * 0.7 + (255 - b) * 0.1;
          return distanceB > distanceW ? 1 : 0;
        }

        let contrastColor = getLuminance(toRgb(value)) === 1 ? "#000" : "#fff";
        document.documentElement.style.setProperty("--theme-highlight-color", value);
        document.documentElement.style.setProperty(
          "--theme-contrast-color", contrastColor
        );
        document.documentElement.classList.toggle(
          "contrast-black", contrastColor == "#000");
      }
    },
    {
      id: "electron.always-on-top",
      name: "Pin window on top of other windows",
      default: false,
      hidden: !this.isElectron,
      type: "checkbox",
      onApply: (value) => {
        if (typeof value !== "boolean") {
          value = false;
        }
        if (this.isElectron) {
          require("electron").remote.BrowserWindow.getFocusedWindow().setAlwaysOnTop(value);
        }
      },
    }];
  },

  getItem(id) {
    let value = localStorage.getItem("settings." + id);

    try {
      value = JSON.parse(value);
    } catch (e) {
      // Do nothing
    }
    return value;
  },

  setItem(id, value) {
    var setting = this._lookupById(id);
    setting.onApply(value);
    return localStorage.setItem("settings." + id, value);
  },

  _lookupById(id) {
    var i = this.definitions.findIndex(s => s.id === id);
    return this.definitions[i];
  }
};

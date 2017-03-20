function SettingsStore(params) {
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
  definitions: [
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
      type: "<color>",
      onApply(value) {
        document.documentElement.style.setProperty("--theme-highlight-color", value);
      }
    }
  ],

  getItem(id) {
    return localStorage.getItem("settings." + id);
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
}
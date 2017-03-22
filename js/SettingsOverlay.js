"use strict";

function SettingsOverlay(params) {
  this.store = params.store;
  this.element = params.element;
  this.toggle = params.toggle;

  this.toggle.addEventListener("click", () => {
    if (this.element.style.opacity == 0) {
      this.element.style.opacity = 1;
      this.element.style.top = 0;
    } else {
      this.element.style.opacity = 0;
      this.element.style.top = "100%";
    }
  });

  Element("header", {
    class: "header",
    content: "Settings",
    parent: this.element
  });

  this.settingsContainer = Element("div", {
    parent: this.element
  });
  this.store.definitions.forEach((s) => this.createSetting(s));
}

SettingsOverlay.prototype = {
  get hidden() {
    return this.element.hidden;
  },
  set hidden(value) {
    this.element.hidden = value;
    this.toggle.classList.toggle("checked", !value);
  },
  createSetting(setting) {
    var element = Element("p", {
      class: "setting",
      parent: this.settingsContainer
    });

    Element("span", {
      class: "label",
      parent: element,
      content: setting.name
    });

    var store = this.store;
    if (setting.values) {
      var select = Element("select", {
        parent: element,
        onchange() {
          store.setItem(setting.id, this.value);
        }
      });
      setting.values.forEach((value) => {
        Element("option", {
          parent: select,
          value,
          content: value
        });
      });

      select.value = store.getItem(setting.id);
    } else {
      var input = Element("input", {
        parent: element,
        type: setting.type,
        oninput() {
          store.setItem(setting.id, this.value);
        }
      });

      input.value = store.getItem(setting.id);
    }

    return element;
  }
};

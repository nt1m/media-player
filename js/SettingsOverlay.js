"use strict";

function SettingsOverlay(params) {
  this.store = params.store;
  this.element = params.element;
  this.toggle = params.toggle;

  this.toggle.addEventListener("click", () => {
    let isHidden = this.element.classList.contains("hidden");
    this.element.classList.toggle("hidden", !isHidden);
    this.toggle.classList.toggle("checked", isHidden);
  });

  Element("header", {
    class: "header",
    content: "Settings",
    parent: this.element
  });

  this.settingsContainer = Element("div", {
    parent: this.element
  });
  this.store.definitions.filter((s) => !s.hidden).forEach((s) => this.createSetting(s));
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
      });

      if (input.type == "color") {
        input.oninput = function() {
          store.setItem(setting.id, this.value);
        };
        input.value = store.getItem(setting.id);
      } else {
        input.onchange = function() {
          store.setItem(setting.id, this.checked);
        };
        input.checked = store.getItem(setting.id);
      }
    }

    return element;
  }
};

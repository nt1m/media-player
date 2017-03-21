function SettingsOverlay(params) {
  this.store = params.store;
  this.element = params.element;
  this.toggle = params.toggle;

  this.toggle.addEventListener("click", () => {
    this.hidden = !this.hidden;
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
      parent: this.element
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
        onchange() {
          store.setItem(setting.id, this.value);
        }
      });

      input.value = store.getItem(setting.id);
    }

    return element;
  }
};
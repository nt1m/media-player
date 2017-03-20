function SettingsOverlay(params) {
  this.store = params.store;
  this.element = params.element;
  this.toggle = params.toggle;

  this.toggle.addEventListener("click", () => {
    this.hidden = !this.hidden;
  });
}

SettingsOverlay.prototype = {
  get hidden() {
    return this.element.hidden;
  },
  set hidden(value) {
    this.element.hidden = value;
    this.toggle.classList.toggle("checked", !value);
  }
}
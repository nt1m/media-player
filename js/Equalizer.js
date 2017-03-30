"use strict";

function Equalizer(props) {
  this.props = props;
  this.frequencyMap = new Map();
  this.init();
}

Equalizer.prototype = {
  init() {
    let { panel, toggle, audioCtx, destinationNode } = this.props;
    toggle.onclick = () => toggle.classList.toggle("checked");

    let frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

    this.sumNode = audioCtx.createGain();
    this.sumNode.connect(destinationNode);

    for (let frequency of frequencies) {
      let audioNode = this.initNodeForFrequency(frequency);
      let div = Element("div", {
        class: "range-with-label",
        parent: panel,
      });
      let input = Element("input", {
        type: "range",
        parent: div,
        min: -20,
        max: 20,
        value: 0,
        orient: "vertical",
        onchange: () => {
          this.setFrequencyGain(frequency, input.value);
        }
      });

      Element("label", {
        content: frequency.toString().replace("000", "k"),
        parent: div,
      });
      this.frequencyMap.set(frequency, {input, audioNode});
    }
  },

  initNodeForFrequency(frequency) {
    let { audioCtx, departureNode } = this.props;

    let biquad = audioCtx.createBiquadFilter();
    biquad.type = "peaking";
    biquad.frequency.value = frequency;

    departureNode.connect(biquad);
    biquad.connect(this.sumNode);
    return biquad;
  },
  setFrequencyGain(frequency, gain) {
    let { audioNode } = this.frequencyMap.get(frequency);
    audioNode.gain.value = gain;
    audioNode.Q.value = frequency / (frequency * 2.5);
  },
};

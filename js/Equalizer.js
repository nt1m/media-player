"use strict";

const EQUALIZER_PRESETS = [
  {
    name: "Acoustic",
    data: [5, 5, 4, 1, 2, 2, 3, 4, 3, 2],
  }, {
    name: "Bass Booster",
    data: [6, 5, 4, 3, 2, 0, 0, 0, 0, 0],
  }, {
    name: "Bass Reducer",
    data: [-6, -5, -4, -3, -2, 0, 0, 0, 0, 0],
  }, {
    name: "Classical",
    data: [5, 4, 3, 2, -1, -1, 0, 1, 3, 4]
  }, {
    name: "Dance",
    data: [4, 6, 5, 0, 2, 3, 5, 4, 3, 0],
  }, {
    name: "Deep",
    data: [5, 3, 2, 1, 3, 2, 1, -2, -4, -5]
  }, {
    name: "Electronic",
    data: [4, 4, 1, 0, -2, 2, 1, 2, 4, 5]
  }, {
    name: "Hip-Hop",
    data: [5, 3, 1, 3, -1, -1, 1, -1, 2, 3],
  }, {
    name: "Jazz",
    data: [4, 3, 1, 2, -1, -1, 0, 1, 3, 4],
  }, {
    name: "Latin",
    data: [5, 3, 0, 0, -1, -1, -1, 0, 3, 5]
  }, {
    name: "Loudness",
    data: [6, 4, 0, 0, -2, 0, -1, -5, 4, 1],
  }, {
    name: "Lounge",
    data: [-3, -2, -1, 1, 4, 3, 0, -1, 2, 1],
  }, {
    name: "Piano",
    data: [3, 2, 0, 2, 3, 1, 3, 5, 3, 4],
  }, {
    name: "Pop",
    data: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2],
  }, {
    name: "R&B",
    data: [2, 7, 6, 1, -2, -1, 2, 3, 3, 4],
  }, {
    name: "Rock",
    data: [5, 4, 3, 2, -1, -2, 0, 2, 3, 4],
  }, {
    name: "Small Speakers",
    data: [5, 4, 3, 2, 1, 0, -2, -3, -4, -5],
  }, {
    name: "Spoken Word",
    data: [-4, -1, 0, 1, 3, 5, 5, 4, 2, 0],
  }, {
    name: "Treble Booster",
    data: [0, 0, 0, 0, 0, 1, 2, 3, 4, 5],
  }, {
    name: "Treble Reducer",
    data: [0, 0, 0, 0, 0, -1, -2, -3, -4, -5],
  }, {
    name: "Vocal Booster",
    data: [-1, -3, -3, 1, 4, 4, 3, 1, 0, -1]
  }
];

const FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

function Equalizer(props) {
  this.props = props;
  this.frequencyMap = new Map();
  this.init();
}

Equalizer.prototype = {
  init() {
    let { panel, toggle, audioCtx, destinationNode } = this.props;
    toggle.onclick = () => toggle.classList.toggle("checked");

    this.sumNode = audioCtx.createGain();
    this.sumNode.connect(destinationNode);

    let select = this.createPresetsSelect();

    this.container = Element("div", { parent: panel, class: "container" });
    this.createScale();
    for (let frequency of FREQUENCIES) {
      let audioNode = this.initNodeForFrequency(frequency);
      let div = Element("div", {
        class: "range-with-label",
        parent: this.container,
      });
      let input = Element("input", {
        type: "range",
        parent: div,
        min: -20,
        max: 20,
        value: 0,
        orient: "vertical",
        onchange: () => {
          select.value = "no-preset";
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

  createScale() {
    let scale = Element("div", {
      parent: this.container,
      class: "scale",
    });

    Element("label", {
      content: "+20dB",
      parent: scale
    });

    Element("div", {
      class: "flex",
      parent: scale
    });

    Element("label", {
      content: "0dB",
      parent: scale,
    });

    Element("div", {
      class: "flex",
      parent: scale
    });

    Element("label", {
      content: "-20dB",
      parent: scale,
    });
  },

  createPresetsSelect() {
    let select = Element("select", {
      parent: this.props.panel,
      onchange: () => {
        if (select.value == "no-preset") {
          this.setPresetData([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
          return;
        }
        this.setPresetData(EQUALIZER_PRESETS[select.value].data);
      }
    });

    Element("option", {
      content: "No preset",
      value: "no-preset",
      parent: select,
    });
    for (let i = 0; i < EQUALIZER_PRESETS.length; i++) {
      let preset = EQUALIZER_PRESETS[i];
      Element("option", {
        content: preset.name,
        parent: select,
        value: i,
      });
    }
    return select;
  },

  setPresetData(data) {
    let inputs = [...document.querySelectorAll(".range-with-label input")];
    for (let i = 0; i < inputs.length; i++) {
      let input = inputs[i];
      input.value = data[i];
      this.setFrequencyGain(FREQUENCIES[i], data[i]);
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
    audioNode.Q.value = 0.01;
  },
};

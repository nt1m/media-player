"use strict";

var AudioPlayer = {
  init() {
    /* Define elements */
    this.audioEl = document.getElementById("AudioPlayer");
    this.uploadEl = document.getElementById("upfile");
    this.headerEl = document.getElementById("header");

    this.playPauseEl = document.getElementById("play-pause");
    this.volumeIcon = document.getElementById("volume-icon");
    this.loopEl = document.getElementById("loop");
    this.speedBtnEl = document.getElementById("speed-btn");

    this.progressBar = document.getElementById("progress-bar");
    this.progressEl = document.getElementById("progress");
    this.tooltipEl = document.getElementById("tooltip");

    this.sidebarEl = document.getElementById("sidebar");
    this.controlsEl = document.getElementById("audio-controls");
    this.canvasEl = document.getElementById("visualizer");


    /* Initialize playlist */
    this.playlist = new Playlist({
      element: document.getElementById("playlist"),
      onItemSelected: this.setAudio.bind(this),
      onItemRemoved: () => {},
      onItemCleared: () => this.UIEnabled = false,
    });

    /* Bind functions */
    this.uploadFiles = this.uploadFiles.bind(this);

    /* Setup uploader */
    this.uploadEl.addEventListener("change", () => this.uploadFiles(this.uploadEl.files));

    this.sidebarEl.addEventListener("dragenter", () => {
      this.sidebarEl.classList.remove("no-drag");
      this.sidebarEl.classList.add("drag");
    });
    this.sidebarEl.addEventListener("dragleave", () => {
      this.sidebarEl.classList.remove("drag");
      this.sidebarEl.classList.add("no-drag");
    });
    this.sidebarEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    this.sidebarEl.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.uploadFiles(e.dataTransfer.files);
      this.sidebarEl.classList.remove("drag");
      this.sidebarEl.classList.add("no-drag");
    });

    this.progressBar.addEventListener("mousedown", function(e) {
      AudioPlayer.onProgressClick(e.pageX);
    });
    this.progressBar.addEventListener("mouseover", function(e) {
      AudioPlayer.setProgressTooltip(e.pageX);
    });

    this.audioEl.addEventListener("timeupdate", function() {
      AudioPlayer.updateProgressBar();
      AudioPlayer.tooltipEl.textContent = AudioPlayer.getTooltip(this.currentTime);
    });
    this.audioEl.addEventListener("play", () => {
      this.playPauseEl.classList.remove("paused");
    });
    this.audioEl.addEventListener("pause", () => {
      this.playPauseEl.classList.add("paused");
    });
    this.audioEl.addEventListener("ended", () => {
      this.killContext();
      this.playlist.selectNext();
    });
    this.initAudioContext();
  },
  set UIEnabled(value) {
    if (!value) {
      this.controlsEl.classList.add("disabled");
      this.headerEl.textContent = "";
      this.stop();
    } else {
      this.controlsEl.classList.remove("disabled");
    }
  },

  /** Sidebar **/
  uploadFiles(uploadedMusic) {
    uploadedMusic = Array.from(uploadedMusic) || [];
    this.playlist.element.classList.add("loading");

    uploadedMusic = uploadedMusic.filter(m => m.type.match("audio") == "audio");
    this.playlist.addAll(uploadedMusic).then(() => {
      this.playlist.element.classList.remove("loading");
      this.UIEnabled = true;
    });
    return true;
  },
  setAudio(hash) {
    let item = this.playlist.list.get(hash);
    this.audioEl.src = URL.createObjectURL(item.audio);
    this.headerEl.textContent = (item.tags.title !== undefined) &&
      (item.tags.title + " | " + item.tags.artist)
      || Utils.extractNameFromFile(item.audio);
    document.title = this.headerEl.textContent;

    this.play();
  },

  /** Audio controls **/
  initAudioContext() {
    var ctx = new AudioContext();
    var audio = this.audioEl;
    var audioSrc = ctx.createMediaElementSource(audio);
    var analyser = ctx.createAnalyser();
    audioSrc.connect(analyser);
    analyser.connect(ctx.destination);
    this.analyser = analyser;
    this.ctx = ctx;
  },
  get paused() {
    return this.audioEl.paused;
  },
  play() {
    this.audioEl.play();
    AudioPlayer.recordContext();
    this.canvasEl.classList.remove("placeholder");
  },

  pause() {
    this.audioEl.pause();
    this.canvasEl.classList.add("placeholder");
  },
  stop() {
    this.audioEl.pause();
    this.audioEl.currentTime = 0;
    this.canvasEl.classList.add("placeholder");
  },
  fastrewind() {
    this.audioEl.currentTime -= 5;
  },
  fastforward() {
    this.audioEl.currentTime += 5;
  },
  toggleLoop() {
    if (this.audioEl.loop) {
      this.audioEl.loop = false;
      this.loopEl.classList.remove("checked");
    } else {
      this.audioEl.loop = true;
      this.loopEl.classList.add("checked");
    }
  },
  toggleSpeedBtn() {
    if (this.speedBtnEl.classList.contains("checked")) {
      this.speedBtnEl.classList.remove("checked");
      this.speedBtnEl.classList.add("not-checked");
    } else {
      this.speedBtnEl.classList.remove("not-checked");
      this.speedBtnEl.classList.add("checked");
    }
  },
  changeVolume(volume) {
    this.audioEl.volume = volume;
    if (volume == 0) {
      this.volumeIcon.className = "mute";
    } else if (volume <= 0.5) {
      this.volumeIcon.className = "half";
    } else {
      this.volumeIcon.className = "";
    }
  },
  changeSpeed(value) {
    var values = [0.5, 1, 1.25, 1.5, 2, 4];
    this.audioEl.playbackRate = values[value];
    this.audioEl.defaultPlaybackRate = values[value];
  },

  /** Progress bar **/
  setCurrentTime(time) {
    this.audioEl.currentTime = time;
  },
  updateProgressBar() {
    var width = (this.audioEl.currentTime * document.body.clientWidth)
                / this.audioEl.duration;
    this.progressEl.style.width = width + "px";
  },
  onProgressClick(x) {
    var duration = (x * this.audioEl.duration) / document.body.clientWidth;
    this.setCurrentTime(duration);
  },
  setProgressTooltip(x) {
    var duration = (x * this.audioEl.duration) / document.body.clientWidth;
    this.progressBar.title = this.getTooltip(duration);
  },
  getTooltip(time) {
    var data = Utils.convertSecondsToDisplay(time);
    var display = "";
    if (data.hours !== 0) {
      display = data.hours;
    }
    if (data.minutes < 10) {
      data.minutes = "0" + data.minutes;
    }
    if (data.seconds < 10) {
      data.seconds = "0" + data.seconds;
    }
    display = display + data.minutes + ":" + data.seconds;
    return display;
  },

  /** Visualizer **/
  recordContext() {
    this.visualize(this.analyser);
  },
  killContext() {
    var canvas = this.canvasEl;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  },
  visualize(analyser) {
    var that = this,
      canvas = this.canvasEl,
      cwidth = canvas.width,
      cheight = canvas.height - 2,
      meterWidth = 10,
      capHeight = 2,
      capStyle = "#fff",
      meterNum = 800 / (10 + 2),
      capYPositionArray = [],
      ctx = canvas.getContext("2d");
    var drawMeter = function() {
      var array = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(array);
      if (that.status === 0) {
        for (let i = array.length - 1; i >= 0; i--) {
          array[i] = 0;
        }
        var allCapsReachBottom = true;
        for (let i = capYPositionArray.length - 1; i >= 0; i--) {
          allCapsReachBottom = allCapsReachBottom && (capYPositionArray[i] === 0);
        }
        if (allCapsReachBottom) {
          cancelAnimationFrame(that.animationId);
          return;
        }
      }
      var step = Math.round(array.length / meterNum);
      ctx.clearRect(0, 0, cwidth, cheight);
      for (let i = 0; i < meterNum; i++) {
        var value = array[i * step];
        if (capYPositionArray.length < Math.round(meterNum)) {
          capYPositionArray.push(value);
        }
        ctx.fillStyle = capStyle;
        if (value < capYPositionArray[i]) {
          ctx.fillRect(i * 12, cheight - (--capYPositionArray[i]), meterWidth, capHeight);
        } else {
          ctx.fillRect(i * 12, cheight - value, meterWidth, capHeight);
          capYPositionArray[i] = value;
        }
        ctx.fillStyle = "#0095dd";
        ctx.fillRect(i * 12, cheight - value + capHeight, meterWidth, cheight);
      }
      that.animationId = requestAnimationFrame(drawMeter);
    };
    this.animationId = requestAnimationFrame(drawMeter);
  }
};

window.addEventListener("load", function() {
  AudioPlayer.init();
}, false);

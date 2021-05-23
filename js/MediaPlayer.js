"use strict";

var MediaPlayer = {
  init() {
    this.isElectron = !!(window.process && window.process.type && window.process.versions.electron);

    /* Define elements */
    this.videoEl = document.getElementById("MediaPlayer");
    this.uploadEl = document.getElementById("upfile");
    this.headerEl = document.getElementById("header");

    this.playPauseEl = document.getElementById("play-pause");
    this.volumeIcon = document.getElementById("volume-icon");
    this.volumeSlider = document.getElementById("volume-range");
    this.loopEl = document.getElementById("loop");
    this.shuffleEl = document.getElementById("shuffle");
    this.speedBtnEl = document.getElementById("speed-btn");

    this.progressBar = document.getElementById("progress-bar");
    this.progressEl = document.getElementById("progress");
    this.tooltipEl = document.getElementById("tooltip");

    this.sidebarEl = document.getElementById("sidebar");
    this.controlsEl = document.getElementById("media-controls");
    this.canvasEl = document.getElementById("visualizer");

    this.controlOverlay = document.getElementById("control-overlay");
    this.videoEl.controls = false;

    this.previousBtn = document.getElementById("previous-btn");
    this.nextBtn = document.getElementById("next-btn");
    this.wirePrevNextControls({
      element: this.previousBtn,
      onHold: this.fastrewind.bind(this),
      onClick: () => {
        this.killContext();
        this.playlist.selectPrevious();
      }
    });
    this.wirePrevNextControls({
      element: this.nextBtn,
      onHold: this.fastforward.bind(this),
      onClick: () => {
        this.killContext();
        this.playlist.selectNext();
      }
    });

    /* Initialize playlist */
    this.playlist = new Playlist({
      element: document.getElementById("playlist"),
      onItemSelected: this.setMedia.bind(this),
      onItemRemoved: () => {},
      onItemCleared: () => {
        this.UIEnabled = false;
      },
    });

    this.settingsStore = new SettingsStore({
      isElectron: this.isElectron,
    });
    this.settingsOverlay = new SettingsOverlay({
      store: this.settingsStore,
      element: document.getElementById("settings-overlay"),
      toggle: document.getElementById("settings-btn")
    });

    if (this.isElectron) {
      var ElectronApp = require("./js/ElectronApp");
      ElectronApp.init();
    }
    let fullscreenchange = (e) => {
      document.documentElement.classList.toggle("fullscreen",
        !!(document.fullscreenElement
        || document.webkitFullscreenElement
        || document.msFullscreenElement
        || document.mozFullScreenElement));
    };
    addEventListener("fullscreenchange", fullscreenchange);
    addEventListener("webkitfullscreenchange", fullscreenchange);
    addEventListener("msfullscreenchange", fullscreenchange);
    addEventListener("mozfullscreenchange", fullscreenchange);
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
      this.classList.add("dragging");
      MediaPlayer.onProgressClick(e.pageX);
    });

    let stopProgressBarDrag = (e) => {
      if (e.type === "mouseout" && e.target !== document.documentElement) {
        return;
      }
      this.progressBar.classList.remove("dragging");
    };
    document.documentElement.addEventListener("mouseout", stopProgressBarDrag);
    window.addEventListener("mouseup", stopProgressBarDrag);
    window.addEventListener("mousemove", (e) => {
      if (this.progressBar.classList.contains("dragging")) {
        this.onProgressClick(e.pageX);
      }
    });
    this.progressBar.addEventListener("mouseover", function(e) {
      MediaPlayer.setProgressTooltip(e.pageX);
    });

    this.controlOverlay.addEventListener("click", () => {
      if (!this.UIEnabled) {
        return;
      }
      if (!this.videoEl.hidden) {
        this.togglePaused();
      }
    });

    addEventListener("keydown", (e) => {
      if (document.activeElement != document.body) {
        return;
      }
      switch (e.keyCode) {
        // Spacebar
        case 32:
          this.togglePaused();
          break;
        // Top arrow
        case 38:
          if (e.ctrlKey || e.metaKey) {
            this.changeVolume(Math.min(1, this.videoEl.volume + 0.1));
            e.preventDefault();
          } else {
            this.playlist.selectPrevious();
          }
          break;
        // Down arrow
        case 40:
          if (e.ctrlKey || e.metaKey) {
            this.changeVolume(Math.max(0, this.videoEl.volume - 0.1));
            e.preventDefault();
          } else {
            this.playlist.selectNext();
          }
          break;
        // Left arrow
        case 37:
          this.fastrewind();
          break;
        // Right arrow
        case 39:
          this.fastforward();
          break;
      }
    });
    this.videoEl.addEventListener("timeupdate", function() {
      MediaPlayer.updateProgressBar();
      MediaPlayer.tooltipEl.textContent = MediaPlayer.getTooltip(this.currentTime);
    });
    this.videoEl.addEventListener("play", () => {
      this.playPauseEl.classList.remove("paused");
    });
    this.videoEl.addEventListener("pause", () => {
      this.playPauseEl.classList.add("paused");
    });
    this.videoEl.addEventListener("ended", () => {
      if (this.playlist.loop) {
        this.killContext();
        this.playlist.selectNext();
      }
    });

    this.UIEnabled = false;
    this.changeLoopState(1);
  },
  set UIEnabled(value) {
    if (!value) {
      document.body.classList.add("controls-disabled");
      this.controlsEl.classList.add("disabled");
      this.headerEl.textContent = "";
      this.headerEl.title = "";
      document.title = "Media Player";
      this.videoEl.hidden = true;
      this.canvasEl.hidden = false;
      this.videoEl.src = "";
      this.pause(true);
      this.videoEl.currentTime = 0;
    } else {
      document.body.classList.remove("controls-disabled");
      this.controlsEl.classList.remove("disabled");
    }
  },
  get UIEnabled() {
    return !this.controlsEl.classList.contains("disabled");
  },

  toggleFullscreen() {
    let shouldGoFullscreen = !document.documentElement.classList.contains("fullscreen");

    if (shouldGoFullscreen) {
      if (!document.documentElement.requestFullScreen) {
        document.documentElement.requestFullScreen = document.documentElement.mozRequestFullScreen
            || document.documentElement.webkitRequestFullscreen;
      }
      document.documentElement.requestFullScreen();
    } else {
      if (!document.exitFullscreen) {
        document.exitFullscreen = document.mozCancelFullScreen
            || document.webkitExitFullscreen;
      }
      document.exitFullscreen();
    }
  },

  /** Sidebar **/
  uploadFiles(uploadedMedia) {
    if (!this.ctx) this.initAudioContext();
    uploadedMedia = Array.from(uploadedMedia) || [];

    return this.playlist.addAll(uploadedMedia);
  },
  setMedia(hash) {
    let item = this.playlist.list.get(hash);
    document.querySelector("#display-container")
      .className = item.type;
    this.videoEl.hidden = item.type != "video";
    this.canvasEl.hidden = item.type == "video";
    URL.revokeObjectURL(this.videoEl.src);
    this.videoEl.src = URL.createObjectURL(item.media);
    this.updateHeader(item.tag);
    // Scroll to the selected item
    this.playlist.element.scrollTo(item.element.offsetTop, 1000);
    this.UIEnabled = true;
    this.play(true);
  },
  updateHeader(tag) {
    let artistAndTitle = tag.artist ? tag.artist + " - " + tag.title
      : tag.title;
    this.headerEl.textContent = artistAndTitle;
    document.title = this.headerEl.textContent;

    this.headerEl.title = Utils.getTooltipForTag(tag);
  },

  /** Audio controls **/
  initAudioContext() {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    var ctx = new AudioContext();
    var media = this.videoEl;
    var mediaSrc = ctx.createMediaElementSource(media);

    var analyser = ctx.createAnalyser();
    analyser.connect(ctx.destination);

    this.equalizer = new Equalizer({
      panel: document.querySelector("#equalizer-panel"),
      toggle: document.querySelector("#equalizer-btn"),
      audioCtx: ctx,
      departureNode: mediaSrc,
      destinationNode: analyser,
    });

    this.analyser = analyser;
    this.ctx = ctx;
  },
  animateIndicator(playing) {
    this.controlOverlay.className = playing ? "playing" : "paused";
    setTimeout(() => {
      this.controlOverlay.className = "";
    }, 500);
  },
  wirePrevNextControls(params) {
    let element = params.element;
    let onClick = params.onClick;
    let onHold = params.onHold;
    let holded = false;
    element.addEventListener("mousedown", () => {
      this.prevOrNextPressed = true;
      this.prevNextTimeout = setTimeout(() => {
        if (this.prevNextTimeout) {
          this.prevNextInterval = setInterval(() => {
            holded = true;
            onHold();
          }, 500);
        }
      });
    }, 1000);

    element.addEventListener("mouseup", () => {
      if (!this.prevOrNextPressed) {
        return;
      }
      this.prevOrNextPressed = false;
      if (this.prevNextTimeout) {
        clearTimeout(this.prevNextTimeout);
        this.prevNextTimeout = null;
      }
      if (!holded) {
        onClick();
      }
      if (this.prevNextInterval) {
        clearInterval(this.prevNextInterval);
        this.prevNextInterval = null;
      }
    });
  },
  get paused() {
    return this.videoEl.paused;
  },
  play(disableAnimation) {
    this.videoEl.play();
    if (!this.canvasEl.hidden) {
      this.recordContext();
    }
    this.controlOverlay.className = "playing";
    this.canvasEl.classList.remove("placeholder");
    if (!disableAnimation) {
      this.animateIndicator(true);
    }
  },
  pause(disableAnimation) {
    this.videoEl.pause();
    this.canvasEl.classList.add("placeholder");
    this.killContext();
    if (!disableAnimation) {
      this.animateIndicator(false);
    }
  },
  togglePaused() {
    if (!this.UIEnabled) {
      return;
    }
    if (this.paused) {
      this.play();
    } else {
      this.pause();
    }
  },
  fastrewind() {
    let newTime = this.videoEl.currentTime - 5;
    if (newTime > -2) {
      this.videoEl.currentTime = Math.max(newTime, 0);
    } else {
      this.killContext();
      this.playlist.selectPrevious();
      clearInterval(this.prevNextInterval);
      this.prevNextInterval = null;
    }
  },
  fastforward() {
    let newTime = this.videoEl.currentTime + 5;
    if (newTime < this.videoEl.duration + 2) {
      this.videoEl.currentTime = Math.min(this.videoEl.duration, newTime);
    } else {
      this.killContext();
      this.playlist.selectNext();
      clearInterval(this.prevNextInterval);
      this.prevNextInterval = null;
    }
  },
  toggleShuffle() {
    this.playlist.toggleShuffle();
    if (this.playlist.shuffle) {
      this.shuffleEl.classList.add("checked");
    } else {
      this.shuffleEl.classList.remove("checked");
    }
  },
  changeLoopState(state) {
    if (!state) {
      this.loopState = this.loopState == 2 ? 0 : this.loopState + 1;
    } else {
      this.loopState = state;
    }

    switch (this.loopState) {
      // No loop
      case 0:
        this.playlist.loop = false;
        this.videoEl.loop = false;
        this.loopEl.classList.remove("checked", "loop-one");
        break;

      // Loop playlist (default)
      case 1:
        this.playlist.loop = true;
        this.videoEl.loop = false;
        this.loopEl.classList.remove("loop-one");
        this.loopEl.classList.add("checked");
        break;

      // Loop one song
      case 2:
        this.playlist.loop = false;
        this.videoEl.loop = true;
        this.loopEl.classList.add("checked", "loop-one");
        break;
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
    if (volume == this.videoEl.volume) {
      return;
    }
    this.videoEl.volume = volume * volume;
    if (volume == 0) {
      this.volumeIcon.className = "mute";
    } else if (volume <= 0.5) {
      this.volumeIcon.className = "half";
    } else {
      this.volumeIcon.className = "";
    }
    this.volumeSlider.value = volume;
    this.volumeSlider.title = this.volumeIcon.title = Math.round(volume * volume * 1000) / 10 + "%";
    if (this.settingsStore) {
      this.settingsStore.setItem("volume", volume);
    }
  },
  changeSpeed(value) {
    var values = [.5, .75, 1, 1.25, 1.5, 2];
    this.videoEl.playbackRate = values[value];
    this.videoEl.defaultPlaybackRate = values[value];
  },

  /** Progress bar **/
  setCurrentTime(time) {
    this.videoEl.currentTime = time;
  },
  updateProgressBar() {
    var width = (this.videoEl.currentTime * document.body.clientWidth)
                / this.videoEl.duration;
    this.progressEl.style.width = width + "px";
  },
  onProgressClick(x) {
    var duration = (x * this.videoEl.duration) / document.body.clientWidth;
    this.setCurrentTime(duration);
  },
  setProgressTooltip(x) {
    var duration = (x * this.videoEl.duration) / document.body.clientWidth;
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
    cancelAnimationFrame(this.animationId);
    this.animationId = null;
    var canvas = this.canvasEl;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  },
  visualize(analyser) {
    var that = this,
      canvas = this.canvasEl,
      cwidth = canvas.width,
      cheight = canvas.height - 2,
      meterWidth = 12,
      capHeight = 3,
      totalWidth = meterWidth + capHeight,
      capStyle = "#fff",
      meterNum = 600 / (meterWidth + capHeight),
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
          ctx.fillRect(i * totalWidth,
            cheight - (--capYPositionArray[i]),
            meterWidth, capHeight);
        } else {
          ctx.fillRect(i * totalWidth, cheight - value, meterWidth, capHeight);
          capYPositionArray[i] = value;
        }
        ctx.fillStyle = getComputedStyle(document.documentElement)
          .getPropertyValue("--theme-highlight-color");
        ctx.fillRect(i * totalWidth, cheight - value + capHeight, meterWidth, cheight);
      }
      that.animationId = requestAnimationFrame(drawMeter);
    };
    if (!this.animationId) {
      this.animationId = requestAnimationFrame(drawMeter);
    }
  }
};

window.addEventListener("load", function() {
  MediaPlayer.init();
}, false);

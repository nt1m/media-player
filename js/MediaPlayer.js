"use strict";

var MediaPlayer = {
  init() {
    /* Define elements */
    this.videoEl = document.getElementById("MediaPlayer");
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
    this.controlsEl = document.getElementById("media-controls");
    this.canvasEl = document.getElementById("visualizer");

    this.videoEl.controls = false;
    /* Initialize playlist */
    this.playlist = new Playlist({
      element: document.getElementById("playlist"),
      onItemSelected: this.setMedia.bind(this),
      onItemRemoved: () => {},
      onItemCleared: () => {
        this.UIEnabled = false;
      },
    });

    this.settingsOverlay = new SettingsOverlay({
      store: new SettingsStore(),
      element: document.getElementById("settings-overlay"),
      toggle: document.getElementById("settings-btn")
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
      MediaPlayer.onProgressClick(e.pageX);
    });
    this.progressBar.addEventListener("mouseover", function(e) {
      MediaPlayer.setProgressTooltip(e.pageX);
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

    uploadedMusic = uploadedMusic.filter(m => m.type.match("audio") == "audio"
                                           || m.type.match("video") == "video");
    return this.playlist.addAll(uploadedMusic).then(() => {
      this.playlist.element.classList.remove("loading");
      this.UIEnabled = true;
    });
  },
  setMedia(hash) {
    let item = this.playlist.list.get(hash);
    this.videoEl.hidden = item.type != "video";
    this.canvasEl.hidden = item.type == "video";
    this.videoEl.src = URL.createObjectURL(item.media);
    this.updateHeader(item.tags);
    // Scroll to the song
    this.playlist.element.scrollTop = item.element.offsetTop;
    this.play();
  },
  updateHeader(tags) {
    let artistAndTitle = tags.artist ? tags.artist + " - " + tags.title
                                     : tags.title;
    this.headerEl.textContent = artistAndTitle;
    document.title = this.headerEl.textContent;

    this.headerEl.title = Utils.getTooltipForTags(tags);
  },

  /** Audio controls **/
  initAudioContext() {
    var ctx = new AudioContext();
    var media = this.videoEl;
    var mediaSrc = ctx.createMediaElementSource(media);
    var analyser = ctx.createAnalyser();
    mediaSrc.connect(analyser);
    analyser.connect(ctx.destination);
    this.analyser = analyser;
    this.ctx = ctx;
  },
  get paused() {
    return this.videoEl.paused;
  },
  play() {
    this.videoEl.play();
    if (!this.canvasEl.hidden) {
      this.recordContext();
    }
    this.canvasEl.classList.remove("placeholder");
  },

  pause() {
    this.videoEl.pause();
    this.canvasEl.classList.add("placeholder");
    this.killContext();
  },
  stop() {
    this.videoEl.pause();
    this.videoEl.currentTime = 0;
    this.canvasEl.classList.add("placeholder");
    this.killContext();
  },
  fastrewind() {
    this.videoEl.currentTime -= 5;
  },
  fastforward() {
    this.videoEl.currentTime += 5;
  },
  toggleLoop() {
    if (this.videoEl.loop) {
      this.videoEl.loop = false;
      this.loopEl.classList.remove("checked");
    } else {
      this.videoEl.loop = true;
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
    this.videoEl.volume = volume;
    if (volume == 0) {
      this.volumeIcon.className = "mute";
    } else if (volume <= 0.5) {
      this.volumeIcon.className = "half";
    } else {
      this.volumeIcon.className = "";
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

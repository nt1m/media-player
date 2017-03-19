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
    this.playlistEl = document.getElementById("playlist");
    this.controlsEl = document.getElementById("audio-controls");
    this.canvasEl = document.getElementById("visualizer");

    /* Bind functions */
    this.uploadFiles = this.uploadFiles.bind(this);

    /* Setup uploader */
    this.uploadEl.addEventListener("change", () => this.uploadFiles());

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
      AudioPlayer.tooltipEl.innerHTML = AudioPlayer.getTooltip(this.currentTime);
    });
    this.audioEl.addEventListener("play", () => {
      this.playPauseEl.classList.remove("paused");

      if (this.playlistEl.querySelector(".playing") &&
          this.playlistEl.querySelector(".last-played") !== null) {
        this.playlistEl.querySelector(".last-played").className = "playing";
      }
    });
    this.audioEl.addEventListener("pause", () => {
      this.playPauseEl.classList.add("paused");
    });
    this.audioEl.addEventListener("ended", function() {
      AudioPlayer.killContext();
      var playing = AudioPlayer.playlistEl.querySelector(".playing");
      if (playing.nextSibling == null) {
        playing.parentElement.children[0].click();
      } else {
        playing.nextSibling.click();
      }
    });
    this.initAudioContext();
  },
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
  playlist: [],
  addItemAsync(data, lastfile) {
    Utils.readID3Data(data).then(tags => {
      var it = {file: data, tags};
      AudioPlayer.playlist[AudioPlayer.playlist.length] = it;
      AudioPlayer.createPlaylistItem(AudioPlayer.playlist.length - 1, tags);
      if (lastfile) {
        AudioPlayer.setAudio(AudioPlayer.playlist[0].file);
        AudioPlayer.controlsEl.classList.remove("disabled");
      }
    });
  },
  createPlaylistItem(key, tags) {
    var data = AudioPlayer.playlist[key].file;
    var titleValue = (tags.title !== undefined) && tags.title ||
                     Utils.extractNameFromFile(data);
    var playlist = AudioPlayer.playlistEl;

    var item = document.createElement("li");
    item.setAttribute("playlist-key", key);

    var title = document.createElement("p");
    title.className = "title";
    title.innerHTML = titleValue;
    item.appendChild(title);

    var cross = document.createElement("span");
    cross.className = "cross";
    item.appendChild(cross);

    item.data = data;
    item.title = titleValue;
    item.addEventListener("click", function(e) {
      if (e.target.className != "cross") {
        AudioPlayer.setAudio(this.data);
      } else {
        AudioPlayer.removeItem(e.target.parentElement.parentElement);
      }
    });
    playlist.appendChild(item);
    return item;
  },
  removeItem(li) {
    var key;
    for (var i in li.parentElement.children) {
      if (li.parentElement.children.hasOwnProperty(key)) {
        var element = li.parentElement.children[key];
        if (element == li) {
          key = i;
        }
      }
    }
    li.remove();
    this.playlist.pop(key);
    if (li.classList.contains("playing")) {
      if (this.playlist.length <= 0) {
        this.stop();
        this.audioEl.removeAttribute("src");
        this.controlsEl.classList.add("disabled");
        this.setAudio(this.playlist[this.playlist.length - 1].file);
      } else {
        this.setAudio(this.playlist[this.playlist.length - 1].file);
      }
    }
  },
  uploadFiles(files) {
    var uploadedMusic = this.uploadEl.files || files;
    this.playlistEl.classList.add("Loading");
    for (let i = 0; i < uploadedMusic.length; i++) {
      if (uploadedMusic[i].type.match("audio") == "audio") {
        var music = uploadedMusic[i];
        var add = 0;
        for (var k in this.playlist) {
          var fn = this.playlist[k].name;
          if (music.name == fn) {
            add += 1;
          }
        }
        if (add == 0) {
          this.addItemAsync(music, (uploadedMusic.length - 1 == i));
        }
      } else {
        return false;
      }
    }
    this.playlistEl.classList.remove("Loading");
    return true;
  },
  setAudio(music) {
    var key = 0;
    for (let i = 0; i < this.playlist.length; i++) {
      if (this.playlist[i].file.name == music.name) {
        key = i;
        break;
      }
    }

    this.audioEl.src = URL.createObjectURL(music);
    this.headerEl.textContent = (this.playlist[key].tags.title !== undefined) &&
      (this.playlist[key].tags.title + " | " + this.playlist[key].tags.artist)
      || Utils.extractNameFromFile(music);
    document.title = this.headerEl.textContent;
    var items = this.playlistEl.children;

    for (var i in items) {
      if (items.hasOwnProperty(i)) {
        items[i].classList.remove("playing");
        if (items[i].getAttribute("playlist-key") == key) {
          items[i].classList.add("playing");
        }
      }
    }
    this.play();
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
    var data = this.convertSecondsToDisplay(time);
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
  convertSecondsToDisplay(time) {
    var hours = Math.floor(time / 3600);
    time = time - hours * 3600;
    var minutes = Math.floor(time / 60);
    var seconds = Math.floor(time - minutes * 60);
    return {hours, minutes, seconds};
  },
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
  },
  setCurrentTime(time) {
    this.audioEl.currentTime = time;
  }
};

window.addEventListener("load", function() {
  AudioPlayer.init();
}, false);

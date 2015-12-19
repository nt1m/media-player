var AudioPlayer = {
	"init": function() {
		this.audioEl = document.getElementById("AudioPlayer");
		this.uploadEl = document.getElementById("upfile");
		this.headerEl = document.getElementById("header");

		this.playPauseEl = document.getElementById("play-pause");
		this.volumeIcon = document.getElementById("volume-icon");
		this.loopEl = document.getElementById("loop");

		this.progressBar = document.getElementById("progress-bar");
		this.progressEl = document.getElementById("progress");
		this.tooltipEl = document.getElementById("tooltip");

		this.sidebarEl = document.getElementById("sidebar");
		this.playlistEl = document.getElementById("playlist");
		this.controlsEl = document.getElementById("audio-controls");
		this.canvasEl = document.getElementById("visualizer");

		this.uploadFiles = this.uploadFiles.bind(this);

		this.uploadEl.addEventListener("change", AudioPlayer.uploadFiles);
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
		this.audioEl.addEventListener("play", function() {
			AudioPlayer.playPauseEl.classList.remove("paused");
			if(!AudioPlayer.playlistEl.querySelector(".playing")) {
				AudioPlayer.playlistEl.querySelector(".last-played").className = "playing";
			}
		});
		this.audioEl.addEventListener("pause", function() {
			AudioPlayer.playPauseEl.classList.add("paused");
		});
		this.audioEl.addEventListener("ended", function() {
			AudioPlayer.killContext();
			var playing = AudioPlayer.playlistEl.querySelector(".playing");
			if(playing.matches(":last-child")) {
				playing.classList.remove("playing");
				playing.classList.add("last-played");
				if(AudioPlayer.audioEl.loop) {
					AudioPlayer.playlistEl.firstChild.click();
				}
			}
			else {
				playing.nextSibling.click();
			}
		});
		this.initAudioContext();
	},
	initAudioContext: function() {
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
	"play": function() {
		this.audioEl.play();
		AudioPlayer.recordContext()
	},
	"pause": function() {
		this.audioEl.pause();
	},
	"stop": function() {
		this.audioEl.pause();
		this.audioEl.currentTime = 0;
	},
	"fastrewind": function() {
		this.audioEl.currentTime -= 5;
	},
	"fastforward": function() {
		this.audioEl.currentTime += 5;
	},
	"playlist": [],
	"createPlaylistItem": function(data) {
		var playlist = this.playlistEl;
		var item = document.createElement("li");

		var title = document.createElement("p");
		title.className = "title";
		title.innerHTML = this.extractNameFromFile(data.name);
		item.appendChild(title);

		item.title = this.extractNameFromFile(data.name);
		item.addEventListener("click", function() {
			AudioPlayer.setAudio(data);
		});
		playlist.appendChild(item);
		return item;
	},
	"uploadFiles": function() {
		var uploadedMusic = this.uploadEl.files;
		for (var i = 0; i < uploadedMusic.length; i++) {
			var music = uploadedMusic[i];
			music.sidebarItem = this.createPlaylistItem(music);
			this.playlist.push(music);
		}
		this.setAudio(this.playlist[this.playlist.length-1]);
		this.controlsEl.classList.remove("disabled");
	},
	"setAudio": function(music) {
		var audio = window.URL.createObjectURL(music);
		this.audioEl.src = audio;
		this.headerEl.innerHTML = this.extractNameFromFile(music.name);
		var items = this.playlistEl.childNodes;
		for(var i = 0; i < items.length; i++) {
			items[i].classList.remove("playing");
		}
		music.sidebarItem.classList.add("playing");
		this.play();
	},
	"toggleLoop": function() {
		if(this.audioEl.loop) {
			this.audioEl.loop = false;
			this.loopEl.classList.remove("checked");
		}
		else {
			this.audioEl.loop = true;
			this.loopEl.classList.add("checked");
		}
	},
	"changeVolume": function(volume) {
		this.audioEl.volume = volume;
		if(volume == 0) {
			this.volumeIcon.className = "mute";
		}
		else if(volume <= 0.5) {
			this.volumeIcon.className = "half";
		}
		else {
			this.volumeIcon.className = "";
		}
	},
	"changeSpeed": function(speed) {
		this.audioEl.defaultPlaybackRate = speed;
		console.info("DEBUG",this.audioEl.playbackRate,speed)
	},
	"updateProgressBar": function() {
		var width = (this.audioEl.currentTime * document.body.clientWidth) / this.audioEl.duration;
		this.progressEl.style.width = width + "px";
	},
	"onProgressClick": function(x) {
		var duration = (x * this.audioEl.duration) / document.body.clientWidth;
		this.setCurrentTime(duration);
	},
	"setProgressTooltip": function(x) {
		var duration = (x * this.audioEl.duration) / document.body.clientWidth;
		this.progressBar.title = this.getTooltip(duration);
	},
	"getTooltip": function(time) {
		var data = this.convertSecondsToDisplay(time);
		var display = "";
		if(data.hours !== 0) {
			display = data.hours;
		}
		if(data.minutes < 10) {
			data.minutes = "0" + data.minutes;
		}
		if(data.seconds < 10) {
			data.seconds = "0" + data.seconds;
		}
		display = display + data.minutes + ":" + data.seconds;
		return display;
	},
	"convertSecondsToDisplay": function(time) {
		var hours = Math.floor(time / 3600);
		time = time - hours * 3600;
		var minutes = Math.floor(time / 60);
		var seconds = Math.floor(time - minutes * 60);
		return {hours: hours, minutes: minutes, seconds: seconds};
	},
	"recordContext": function() {
		// frequencyBinCount tells you how many values you'll receive from the analyser
		var frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
		function renderFrame() {
			requestAnimationFrame(renderFrame);
			this.analyser.getByteFrequencyData(frequencyData);
		}
		this.visualize(this.analyser);
	},
	"killContext": function() {
		var canvas = this.canvasEl;
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	},
	"visualize": function(analyser) {
		var that = this,
			canvas = this.canvasEl,
			cwidth = canvas.width,
			cheight = canvas.height - 2,
			meterWidth = 10,
			gap = 2,
			capHeight = 2,
			capStyle = "#fff",
			meterNum = 800 / (10 + 2),
			capYPositionArray = [],
			ctx = canvas.getContext("2d");
		var drawMeter = function() {
			var array = new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteFrequencyData(array);
			if (that.status === 0) {
				for (var i = array.length - 1; i >= 0; i--) {
					array[i] = 0;
				};
				allCapsReachBottom = true;
				for (var i = capYPositionArray.length - 1; i >= 0; i--) {
					allCapsReachBottom = allCapsReachBottom && (capYPositionArray[i] === 0);
				};
				if (allCapsReachBottom) {
					cancelAnimationFrame(that.animationId);
					return;
				};
			};
			var step = Math.round(array.length / meterNum);
			ctx.clearRect(0, 0, cwidth, cheight);
			for (var i = 0; i < meterNum; i++) {
				var value = array[i * step];
				if (capYPositionArray.length < Math.round(meterNum)) {
					capYPositionArray.push(value);
				};
				ctx.fillStyle = capStyle;

				if (value < capYPositionArray[i]) {
					ctx.fillRect(i * 12, cheight - (--capYPositionArray[i]), meterWidth, capHeight);
				} else {
					ctx.fillRect(i * 12, cheight - value, meterWidth, capHeight);
					capYPositionArray[i] = value;
				};
				ctx.fillStyle = "#0095dd";
				ctx.fillRect(i * 12, cheight - value + capHeight, meterWidth, cheight);
			}
			that.animationId = requestAnimationFrame(drawMeter);
		}
		this.animationId = requestAnimationFrame(drawMeter);
	},
	"setCurrentTime": function(time) {
		this.audioEl.currentTime = time;
	},
	"extractNameFromFile": function(file) {
		var index = file.lastIndexOf(".");
		return file.substring(0, index);
	}
};

window.addEventListener("load", function() {
	AudioPlayer.init();
}, false);

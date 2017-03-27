# Media player

To try this project, go to: http://nt1m.github.io/media-player

Optimized for Firefox and Chrome.

## Authors
- Maintainers: Mohamed Hadjoudj (@MohIceAge), Tim Nguyen (@nt1m)
- Contributors: Daniell Mesquita (@Plasmmer)

## Resources
- Audio visualizer (modified): [HTML5 Audio Visualizer](https://github.com/Wayou/HTML5_Audio_Visualizer)
- Icons: [Material Design Icons](https://github.com/google/material-design-icons)

## Technologies used
- Web Audio API (visualizer)
- HTML `<video>` tag
- CSS variables
- Canvas

## Contributing
Pull requests ! Feel free to skim through [our list of issues](https://github.com/nt1m/media-player/issues) to see you can contribute [:)](http://i.imgur.com/Bq7Gq5W.png?raw=true ":)")

# Run as standalone app
In addition to being a web app, you can also run the Media Player as a standalone app using the Electron runtime.

To get started, you'll need NodeJS, Npm and optionally git.

### Install the Prerequisites
Download the project (by downloading the zipped project or by typing `git clone https://github.com/nt1m/media-player`)
then run the following command in the root directory.
```
npm i
```

### Run the app

If nothing fails then you can run the app by typing:
```
npm start
```

### Bundling the app:

The bundles will appear in `dist/`.

* Current platform only: `npm run pack`
* Windows (both 32-bit and 64-bit): `npm run pack-win`
* macOS 64-bit: `npm run pack-osx`
* Linux (both 32-bit and 64-bit): `npm run pack-linux`
* For all 3 platforms: `npm run pack-all`

### Screenshots

Thank you for reading this readme! Here are some screenshots of the standalone app as a reward:

<img src="screenshots/audio-default-mac.png"/>

![](screenshots/audio-compact-mac.png)               | ![](screenshots/audio-compact-light-playlist-mac.png)
:---------------------------------------------------:|:-----------------------------------------------------:

<p align="center"><img src="screenshots/video-windows.png"/></p>

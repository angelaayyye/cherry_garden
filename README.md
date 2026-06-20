# cherry garden

a cozy shared-room app for angela and eric.

## share it with someone else

this app must be hosted on an `https` website for camera, location, and remote-play features to work between different devices.

easy options:

1. netlify drop: go to `https://app.netlify.com/drop` and drop this whole folder.
2. vercel: import this folder as a static project.
3. github pages: push this folder to a github repo, then enable pages from the repo settings.

after publishing, send the generated `https://...` link to the other person.

## local files

- `index.html` is the app
- `styles.css` is the theme
- `script.js` runs the rooms and sync behavior
- `assets/games/` contains embedded offline html games

## notes

the movie iframe can be opened by both people, but third-party iframes cannot be time-synced unless the provider exposes a playback api.

remote game play uses browser peer connection codes. both people should open the same hosted url, go to games, exchange invite/answer codes, and then use the shared controls.

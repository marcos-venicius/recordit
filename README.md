# RecordIt

Minimal desktop screen recorder for Linux (no audio).

## Usage

1. Pick the **save folder** and, optionally, a **file name**.
2. Pick the **format** (MP4 or WebM).
3. Click **Choose window or screen…** — on Wayland this opens the system picker.
4. Click **Record**: the window hides and the tray icon turns red.
5. Click the tray icon (or *Stop recording* in its menu) to finish and save.

Without a name, the file is saved as `<app>_<YYYY-MM-DD_HH-mm-ss>.<ext>`.

## Install

```sh
npm install
npm run dist
sudo apt install ./dist/recordit_0.1.0_amd64.deb   # or run dist/RecordIt-0.1.0.AppImage
```

## Development

```sh
npm start         # run the app
npm run icons     # regenerate the icons in build/
```

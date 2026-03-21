# What's wraith?

A Linux first system-wide dictation tool to transcribe Speech To Text (STT) with unmatched accuracy and speed, totally free.

## Features

- **Instant Dictation**: Press a hotkey and start speaking. Text appears in real-time in whatever window you have focused in the system.
- **Auto-Correction**: If the AI corrects a word mid-sentence, it automatically backspaces and types the corrected version.
- **System-Wide**: Works in any application - text editors, browsers, terminals, messaging apps, etc.
- **Visual & Audio Feedback**: Get instant confirmation when listening starts, stops, or if there's an error.
- **Zero Latency**: Browser runs persistently in the background - no startup delay when you press the hotkey.
- **No API Keys**: Uses Chrome's built-in Web Speech API - no paid services or local AI models needed.
- **No local models required**: The browser Web Speech Api handles the transcription process entirely, so there's no need to install and setup models locally (like vosk or whisper).

## Installation and setup

```bash
curl -fhsSL https://github.com/E-nkv/wraith/releases/download/latest/install.sh | bash
```

This will install wraith and automatically attempt to install any missing system dependencies. If the automated dependency installation fails on your system, you can install them manually:

- **Arch Linux**: `yay -S dotool google-chrome` (plus `libnotify` and `paplay` from official repos)
- **Debian/Ubuntu**: `sudo apt install dotool libnotify-bin pulseaudio-utils google-chrome-stable`
- **Fedora**: `sudo dnf install dotool libnotify pulseaudio-utils google-chrome-stable`

## Keyboard Shortcuts

wraith runs as a daemon and listens for HTTP requests to start/stop dictation. You'll want to set up keyboard shortcuts so you can actually use it without manually running curl commands.

### GNOME

Open GNOME Settings → Keyboard → Custom Shortcuts, then add:

**Start Dictation (F9):**

- Name: wraith Start
- Command: `curl http://127.0.0.1:3232/start`
- Shortcut: F9

**Stop Dictation (F10):**

- Name: wraith Stop
- Command: `curl http://127.0.0.1:3232/stop`
- Shortcut: F10

### Other Desktop Environments

Non-GNOME shortcut configuration documentation is coming soon. For now, manually bind F9 to `curl http://127.0.0.1:3232/start` and F10 to `curl http://127.0.0.1:3232/stop`.

## System Dependencies

wraith requires the following:

- **dotool** - Wayland-compatible virtual keyboard input
- **libnotify** - Desktop notifications
- **pulseaudio-utils** - Sound playback (paplay) for feedback
- **Google Chrome** - For the Web Speech API (most accurate and fast)

## Usage

1. Run `wraith` to start the daemon
2. Press F9 to start dictating
3. Speak into your microphone
4. Press F10 to stop

## How It Works

1. Press F9 to start listening
2. Speak into your microphone
3. Text appears in real-time in your focused window
4. Press F10 to stop listening

## Requirements

- Linux with Wayland (GNOME recommended)
- Google Chrome Stable (Its Web Speech Api is by far the most superior, in accuracy and speed)
- Microphone

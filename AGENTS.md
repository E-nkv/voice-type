# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview

Voice Type is a system-wide speech-to-text daemon for Linux. It uses Chrome's Web Speech API (running headless in the background) to transcribe speech into text, which is then typed into the active window via `dotool`. No local models, no paid services.

**Key Flow:**
1. Daemon starts HTTP server on port 3232 and launches headless Chrome
2. Chrome initializes Web Speech API (WSA) with exposed functions for speech events
3. User triggers `/toggle` endpoint to start/stop listening
4. Speech results flow: Chrome WSA → `onSpeechUpdate` → TypingController → dotool
5. TypingController calculates diff between previous and current text, then backspaces and retypes corrections

---

## Build Commands (Bun required)
- `bun run dev` - Run with watch mode (`bun --watch src/index.ts`)
- `bun run build` - Build for distribution (outputs to `dist/`)
- `bun run start` - Run directly (`bun run src/index.ts`)
- `bun run compile-binary` - Compile to native binary (outputs to `build/voice-type`)

---

## Architecture & Components

### Entry Point: [`src/index.ts`](src/index.ts)
- Exports `PORT = 3232`
- Parses CLI flags, handles `--detached` mode via `cli.respawnDetached()`
- Creates Daemon instance and starts it
- Handles SIGTERM/SIGINT for clean shutdown

### Daemon: [`src/daemon.ts`](src/daemon.ts)
- HTTP Express server with routes: `/start`, `/stop`, `/toggle`, `/exit`
- Manages browser lifecycle via Puppeteer-core
- Coordinates TypingController and Notifier
- Uses 100ms cooldown after stop to prevent rapid start/stop cycles
- Exposes functions to browser via `page.exposeFunction()`:
  - `onSpeechUpdate({ text })` - handles transcription results
  - `onOffline()` - network disconnected
  - `onError({ type, message })` - speech recognition errors

### Browser/WSA: [`src/browser.js`](src/browser.js) (`.js` extension required)
- Runs in Chrome context, uses `window.SpeechRecognition` API
- `initWSA(lang)` - initializes continuous recognition with interim results
- `startListening()` / `stopListening()` - control speech recognition
- Recognition config: `continuous: true`, `interimResults: true`
- Only sends interim (in-progress) transcripts to `onSpeechUpdate`

### TypingController: [`src/typingController.ts`](src/typingController.ts)
- Spawns `dotool` process with `DOTOOL_XKB_LAYOUT=us` env var
- **Diff Algorithm**: Compares current text with `prevText`, finds common prefix
- Types via: backspace deleted chars → type new chars
- **Character Handling**:
  - ASCII (32-126): buffered and sent as `type <string>`
  - Newlines: `key enter`
  - Unicode/CJK/Emojis: GNOME hex input (`ctrl+shift+u` + hex + enter)
- States: `NoChange`, `ChangeRes` (re-type), `ChangeResAndClear` (reset on empty)

### Browser Launcher: [`src/browserLauncher.ts`](src/browserLauncher.ts)
- Detects browser at `/usr/bin/google-chrome` or `/usr/bin/chromium`
- Launches with flags: `--use-fake-ui-for-media-stream`, `--disable-gpu`, etc.
- Uses `puppeteer-core` (not full Puppeteer) to avoid auto-downloading Chrome

### CLI Parsing: [`src/cli.ts`](src/cli.ts)
- Uses `node:util.parseArgs` with strict mode
- Validates language against `WSA_LANGUAGES` constant
- `--detached` mode spawns detached child process with `stdio: 'ignore'`

### Notifications: [`src/notifier.ts`](src/notifier.ts)
- `TextNotifier` - uses `dbus-next` to send desktop notifications (freedesktop.org spec)
- `SoundNotifier` - spawns `paplay` for audio feedback
- Notification types: daemon start/stop, mic start/stop, errors, offline

---

## Types: [`src/types.ts`](src/types.ts)

```typescript
enum DiffEnum { NoChange, ChangeRes, ChangeResAndClear }
type WSALanguage = (typeof WSA_LANGUAGES)[keyof typeof WSA_LANGUAGES]
type Urgency = "low" | "normal" | "critical"

interface CliFlags {
    lang: WSALanguage
    textNotifs: boolean
    soundNotifs: boolean
    browser: BrowserType
    browserPath?: string
    detached: boolean
    help: boolean
}
```

### Constants: [`src/constants.ts`](src/constants.ts)
- `WSA_LANGUAGES` - BCP47 language tags (en-US, es-ES, ru-RU, zh-CN, etc.)

---

## Code Style (Prettier)
- Tab width: 4 spaces, Print width: 120, No semicolons, No prose wrap
- **Import extensions**: Always use `.js` extension in imports due to `verbatimModuleSyntax`
- **Type imports**: Use `import type { X }` syntax for type-only imports
- Classes export as `export default class ClassName`
- TypeScript strict mode enabled

---

## Testing
- No automated test framework - manual tests in [`src/tests/*.manual.ts`](src/tests/)
- Run manually with `bun run src/tests/<filename>`

---

## Linux-Specific Dependencies (external, not in package.json)
- `dotool` - types text into system (install from source: https://git.sr.ht/~geb/dotool/)
- `dbus-next` - desktop notifications via libdbus
- `x11` - window management (for detecting active window)
- `paplay` - audio playback (pulseaudio-utils package)

### dotool Setup
After installation, run: `sudo udevadm control --reload && sudo udevadm trigger`
User must be in `input` group: `sudo usermod -aG input $USER` (requires reboot)

---

## CLI Usage Examples

```bash
voice-type                    # Start daemon (F9 to toggle, F10 to dictate)
voice-type -l es-ES          # Spanish dictation
voice-type -s                # Enable sound notifications
voice-type --no-text         # Disable text notifications
voice-type -d                # Run detached (background)
voice-type -p /path/to/chrome # Custom browser path
```

### HTTP API (port 3232)
- `GET /start` - Start listening
- `GET /stop` - Stop listening
- `GET /toggle` - Toggle listening state
- `GET /exit` - Stop daemon completely

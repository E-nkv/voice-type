# VOICE TYPE - Persistent Real-Time Speech-to-Text Daemon

## Overview

Voice Type is a persistent, real-time speech-to-text (STT) dictation daemon designed specifically for Linux Wayland (Arch/GNOME). It runs silently in the background and allows you to inject highly accurate transcribed speech directly into any active application window instantly, bypassing the need for heavy local AI models or paid APIs.

## What It Does (Core Workflow)

1. **Trigger**: You press a global shortcut (e.g., F9), which sends an HTTP request to the local daemon via `curl`.

2. **Listen**: A persistent, hidden browser tab activates your microphone and starts streaming audio to the Web Speech API.

3. **Process & Diff**: As interim text streams back in milliseconds, Voice Type calculates the difference between the new text and what was already typed.

4. **Phantom Backspace**: If the AI corrects a word mid-sentence, the daemon instantly fires virtual "Backspace" keys to erase the mistake.

5. **Inject**: It types the final, corrected text directly into whatever text box you currently have focused.

6. **Feedback**: It provides instantaneous, real-time visual and audio feedback (popups and sounds) so you know exactly what the daemon is doing without looking away from your cursor.

## Architecture

### Component Breakdown

#### Entry Point: `src/index.ts`
- Sets process title to `voice-type-daemon`
- Initializes the Daemon instance
- Starts the daemon on the configured port (default: 3232)

#### Core Orchestrator: `src/daemon.ts`
The `Daemon` class is the central coordinator that manages all components:

**Responsibilities:**
- Browser lifecycle management (persistent Chrome instance)
- HTTP server for receiving hotkey triggers
- Speech update handling and routing
- State management (listening status, cooldown)
- Notification coordination

**Key Methods:**
- `start(port)`: Initializes browser and starts HTTP server
- `stopTranscription(reason)`: Handles intentional and offline stops with cooldown
- `handleSpeechUpdate(payload)`: Processes incoming speech text
- `handleOffline(payload)`: Handles network disconnection events
- `destroy()`: Cleanup on shutdown

**Browser Configuration:**
- Uses `puppeteer-core` with Google Chrome Stable
- Headless mode with extensive optimization flags
- Custom user data directory at `/tmp/voice-type-browser`
- Exposes functions to browser context: `onSpeechUpdate`, `onOffline`

#### Browser Integration: `src/browser.js`
JavaScript code injected into the browser context:

**Functions:**
- `initWSA()`: Initializes Web Speech API with continuous mode and interim results
- `startListening()`: Starts the speech recognition
- `stopListening()`: Stops the speech recognition

**Configuration:**
- Language: `es-ES` (Spanish)
- Continuous mode: enabled
- Interim results: enabled
- Error handling: triggers `onOffline` callback on errors

#### Text Injection: `src/typingController.ts`
The `TypingController` class manages virtual keyboard input:

**Responsibilities:**
- Maintains persistent `dotool` process
- Calculates text diffs between speech updates
- Sends backspaces to correct mistakes
- Types new text into focused window

**Diff Algorithm:**
- `NoChange`: Text unchanged, no action
- `ChangeRes`: Calculate common prefix, delete differing characters, type new text
- `ChangeResAndClear`: Reset state (empty text)

**Key Methods:**
- `calculateAndApplyDiff(str)`: Main entry point for text updates
- `sendBackspaces(count)`: Sends virtual backspace keys
- `typeText(text)`: Types text via dotool
- `reset()`: Clears previous text state

#### Notification System

##### Main Notifier: `src/notifier.ts`
Composes `TextNotifier` and `SoundNotifier` for unified notification API:

**Notification Types:**
- `notifyDaemonStart(hotkey)`: Daemon ready notification
- `notifyMicStart()`: Listening started
- `notifyMicStop()`: Listening stopped
- `notifyOffline()`: Network error
- `notifyError(msg)`: General error

##### Text Notifications: `src/textNotifier.ts`
Handles D-Bus notifications via `org.freedesktop.Notifications`:

**Features:**
- Persistent D-Bus session bus connection
- Notification replacement using `replaces_id`
- Advanced hints for real-time updates:
  - `transient`: Don't save to notification history
  - `x-canonical-private-synchronous`: Force instant replacement
  - `urgency`: Low/normal/critical priority
- Fallback to `notify-send` if D-Bus fails

**Urgency Levels:**
- `low` (0): Informational
- `normal` (1): Default
- `critical` (2): Errors and offline states

##### Sound Notifications: `src/soundNotifier.ts`
Handles audio feedback via `paplay`:

**Sound Files:**
- `dialog-warning.oga`: Mic start
- `message-new-instant.oga`: Daemon start
- `message.oga`: Mic stop, error, offline

**Features:**
- Non-blocking spawn for sound playback
- Works in both development and production modes
- Respects executable directory for asset resolution

#### Logging: `src/logger.ts`
In-memory rotating logger with configurable buffer size:

**Features:**
- Configurable max size (default: 10MB)
- Automatic buffer rotation when size exceeded
- Prefixes all messages with `[DAEMON]`
- Outputs to console

#### Types: `src/types.ts`
Shared type definitions:

**Exports:**
- `DiffEnum`: Enum for diff operation types
- `Urgency`: Type for notification urgency levels

## Technology Stack

### Runtime & Architecture
- **Bun / Node.js (TypeScript)**: Core orchestrator managing state, text diffing, and routing
- **Express.js**: Lightweight local HTTP server listening for GET /start and /stop commands
- **systemd (--user)**: Keeps the daemon persistently alive in the background

### Transcription Engine
- **Headless Google Chrome**: Run continuously in the background to eliminate startup latency
- **puppeteer-core**: Manages browser lifecycle and bridges communication via `exposeFunction` and DevTools Protocol
- **Web Speech API**: Chrome's built-in, highly optimized cloud transcription service

### System Integration & Input Injection
- **dotool**: Wayland-compatible virtual input utility that talks directly to the kernel via `/dev/uinput` to simulate physical keyboard strokes
- **PulseAudio/PipeWire (paplay)**: Spawns lightweight child processes to play native .oga UI sound effects

### Real-Time UI (Notifications)
- **dbus-next**: Maintains a persistent session connection to `org.freedesktop.Notifications`
- **Advanced D-Bus Hints**: Uses `x-canonical-private-synchronous` and `transient` hints to force GNOME to instantly swap active notification popups without queuing, history logging, or anti-spam throttling

## Design Considerations

### 1. Persistent Browser for Zero Latency
The browser is launched once at startup and kept alive, eliminating the ~2-3 second startup delay that would occur if a new browser instance were created on each transcription request.

### 2. Real-Time Diff Algorithm
The text diffing algorithm enables "phantom backspace" functionality:
- Calculates common prefix between current and previous text
- Only deletes characters that differ
- Types only new characters
- This allows the AI to correct itself mid-sentence without user intervention

### 3. D-Bus Notification Replacement
GNOME's notification system has built-in throttling and queuing. Voice Type bypasses this by:
- Using `replaces_id` to replace the previous notification
- Setting `transient` hint to prevent history logging
- Using `x-canonical-private-synchronous` for instant updates
- This creates a real-time status indicator feel

### 4. Stop Cooldown Mechanism
A 1-second cooldown prevents rapid successive stop requests that could cause race conditions or unexpected behavior.

### 5. Modular Notification System
Text and sound notifications are separated into distinct classes:
- Allows independent enable/disable
- Clean separation of concerns
- Easy to extend with additional notification types

### 6. In-Memory Rotating Logger
The logger maintains a fixed-size buffer in memory:
- Prevents unbounded memory growth
- Provides recent history for debugging
- No file I/O overhead during operation

### 7. Wayland Compatibility
The entire stack is designed for Wayland:
- Uses `dotool` instead of X11-based input methods
- Works with GNOME on Wayland out of the box
- No XWayland dependencies

## Configuration

### Environment Variables
- `PORT`: HTTP server port (default: 3232)

### GNOME Custom Shortcuts Setup
To set up global hotkeys, create GNOME custom shortcuts:

**Start Transcription (F9):**
```bash
curl http://127.0.0.1:3232/start
```

**Stop Transcription (F10):**
```bash
curl http://127.0.0.1:3232/stop
```

### systemd Service
Create a user systemd service for persistent operation:

```ini
[Unit]
Description=Voice Type Speech-to-Text Daemon
After=network.target

[Service]
Type=simple
ExecStart=/path/to/voice-type-daemon
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

## Development

### Scripts
- `bun run dev`: Development mode with watch
- `bun run start`: Production mode
- `bun run build`: Build to dist directory
- `bun run compile`: Compile to standalone binary

### Code Style
- 4-space indentation
- 120 character line width
- No semicolons
- Prettier for formatting

### Testing
Manual test files are provided in `src/tests/`:
- `dbus.manual.ts`: Test D-Bus notifications
- `notifier.manual.ts`: Test notification system
- `typingController.manual.ts`: Test text injection

## Dependencies

### Runtime
- `bun`: JavaScript runtime
- `express`: HTTP server
- `puppeteer-core`: Browser automation
- `dbus-next`: D-Bus bindings
- `x11`: X11 utilities (legacy support)

### Development
- `@types/express`: TypeScript types for Express
- `bun-types`: TypeScript types for Bun
- `prettier`: Code formatting
- `typescript`: TypeScript compiler

## System Requirements

### Required
- Linux with Wayland (tested on Arch/GNOME)
- Google Chrome Stable
- dotool (for virtual keyboard input)
- paplay (for sound playback)
- D-Bus session bus

### Optional
- systemd user service (for persistent operation)
- GNOME Custom Shortcuts (for global hotkeys)

## File Structure

- src/
  - index.ts: Entry point
  - daemon.ts: Core orchestrator
  - browser.js: Web Speech API wrapper
  - typingController.ts: Text injection via dotool
  - notifier.ts: Main notification composer
  - textNotifier.ts: D-Bus notifications
  - soundNotifier.ts: Sound notifications
  - logger.ts: In-memory rotating logger
  - types.ts: Shared type definitions
  - tests/: Manual test files
- assets/
  - sounds/: OGA sound files
- package.json
- tsconfig.json
- .prettierrc
- bun.lock

## License

Version 1.0.0

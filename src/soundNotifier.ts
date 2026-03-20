import { spawn } from "child_process"
import { dirname, join } from "path"

// Get the directory where the executable is located.
//This works both in development (bun run .) and production (compiled binary)
function getExecutableDir(): string {
    const execPath = process.execPath
    const execDir = dirname(execPath)
    const isDevMode = execPath.endsWith("bun") || execPath.endsWith("node")

    if (isDevMode) {
        return process.cwd()
    }

    return execDir
}

const SOUNDS = {
    START: join(getExecutableDir(), "assets/sounds/dialog-warning.oga"),
    DAEMON_START: join(getExecutableDir(), "assets/sounds/message-new-instant.oga"),
    STOP: join(getExecutableDir(), "assets/sounds/message.oga"),
    ERROR: join(getExecutableDir(), "assets/sounds/message.oga"),
}

/**
 * Handles sound notifications via paplay
 */
export class SoundNotifier {
    private enabled: boolean

    constructor(enabled: boolean = true) {
        this.enabled = enabled
    }

    private notify(audioPath: string) {
        if (!this.enabled || !audioPath) return
        // Use non-blocking spawn
        spawn("paplay", [audioPath])
    }

    notifyDaemonStart() {
        this.notify(SOUNDS.DAEMON_START)
    }

    notifyMicStart() {
        this.notify(SOUNDS.START)
    }

    notifyMicStop() {
        this.notify(SOUNDS.STOP)
    }

    notifyOffline() {
        this.notify(SOUNDS.ERROR)
    }

    notifyError() {
        this.notify(SOUNDS.ERROR)
    }
}

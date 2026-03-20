import { spawn } from "child_process"

const SOUNDS = {
    START: "/usr/share/sounds/freedesktop/stereo/dialog-warning.oga",
    DAEMON_START: "/usr/share/sounds/freedesktop/stereo/message-new-instant.oga",
    STOP: "/usr/share/sounds/freedesktop/stereo/power-unplug.oga",
    ERROR: "/usr/share/sounds/freedesktop/stereo/dialog-error.oga",
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

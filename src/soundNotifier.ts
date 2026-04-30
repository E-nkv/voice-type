import { spawn } from "child_process"
import { dirname, join } from "path"
// Get the sounds directory
function getSoundsDir(): string {
    const soundsDir = join(dirname(process.execPath), "sounds")
    return soundsDir
}

const SOUNDS = {
    START: join(getSoundsDir(), "start.oga"),
    STOP: join(getSoundsDir(), "stop.oga"),
    ERROR: join(getSoundsDir(), "stop.oga"),
}

/**
 * Handles sound notifications via paplay
 */
export class SoundNotifier {
    private enabled: boolean

    constructor(enabled: boolean = true) {
        this.enabled = enabled
    }

    private async notify(audioPath: string): Promise<void> {
        if (!this.enabled || !audioPath) return Promise.resolve()

        return new Promise((resolve) => {
            const proc = spawn("paplay", [audioPath])

            proc.on("error", (err) => {
                console.error("[SoundNotifier] paplay error:", err)
                resolve()
            })

            proc.on("close", () => {
                resolve()
            })
        })
    }

    async notifyStart() {
        await this.notify(SOUNDS.START)
    }

    async notifyStop() {
        await this.notify(SOUNDS.STOP)
    }

    async notifyOffline() {
        await this.notify(SOUNDS.ERROR)
    }

    async notifyError() {
        await this.notify(SOUNDS.ERROR)
    }
}

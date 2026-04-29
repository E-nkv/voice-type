import { spawn, type ChildProcess } from "child_process"
import { log } from "./logger.js"
import { TypingController } from "./typingController.js"

export default class EnigoTypingController extends TypingController {
    private enigo: ChildProcess

    public sendBackspaces(count: number) {
        if (count <= 0) return
        if (!this.enigo.stdin?.writable) {
            log("enigo stdin not writable")
            return
        }
        this.enigo.stdin!.write(`BACKSPACE ${count}\n`)
    }

    public typeText(text: string) {
        if (!text) return
        if (!this.enigo.stdin?.writable) {
            log("enigo stdin not writable")
            return
        }
        this.enigo.stdin!.write(`TYPE ${text}\n`)
    }

    public destroy() {
        this.enigo.kill("SIGTERM")
    }

    constructor(binaryPath: string) {
        super()
        this.enigo = spawn(binaryPath, [], {
            stdio: ["pipe", "inherit", "inherit"],
        })

        this.enigo.stderr?.on("data", (data) => {
            const lines = data.toString().split("\n").filter(Boolean)
            for (const line of lines) {
                console.log(`[ENIGO] ${line}`)
            }
        })

        this.enigo.on("exit", (_code, signal) => {
            log(`enigo finished with signal [${signal}]`)
        })
    }
}

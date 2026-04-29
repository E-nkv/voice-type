import { spawn, type ChildProcessWithoutNullStreams } from "child_process"
import { log } from "./logger.js"
import { TypingController } from "./typingController.js"

export default class DotoolTypingController extends TypingController {
    private dotool: ChildProcessWithoutNullStreams

    private initDotool() {
        const dotool = spawn("dotool")

        dotool.stderr.on("data", (data) => {
            const lines = data.toString().split("\n").filter(Boolean)
            for (const line of lines) {
                console.log(`[DOTOOL] ${line}`)
            }
        })
        dotool.on("exit", (_code, signal) => {
            log(`dotool finished with signal [${signal}]`)
        })

        return dotool
    }

    public sendBackspaces(count: number) {
        if (count <= 0) return
        if (!this.dotool.stdin.writable) {
            log("dotool stdin not writable")
            return
        }
        // Send backspace key press count times
        const cmdString = "key BackSpace \n".repeat(count)
        this.dotool.stdin.write(cmdString)
    }

    public typeText(text: string) {
        if (!text) return
        if (!this.dotool.stdin.writable) {
            log("dotool stdin not writable")
            return
        }

        let script = ""
        let asciiBuffer = ""

        // Helper to flush standard characters to the script
        const flushAscii = () => {
            if (asciiBuffer.length > 0) {
                script += `type ${asciiBuffer}\n`
                asciiBuffer = ""
            }
        }

        // Iterate over the string by Unicode code points (safely handles emojis)
        for (const char of text) {
            const codePoint = char.codePointAt(0)
            if (!codePoint) continue

            // Handle Newlines
            if (codePoint === 10) {
                flushAscii()
                script += `key enter\n`
            }
            // Handle standard printable ASCII (a-z, 0-9, basic punctuation)
            else if (codePoint >= 32 && codePoint <= 126) {
                asciiBuffer += char
            }
            // Handle Accents, Dead Keys, Emojis, and CJK (Chinese/Japanese)
            else {
                flushAscii()
                const hex = codePoint.toString(16)

                // GNOME/GTK Unicode Hex Input Sequence using chord notation
                script += `key ctrl+shift+u\n`

                // Type the hex code
                for (const hexChar of hex) {
                    script += `key ${hexChar}\n`
                }

                // Confirm the hex input
                script += `key enter\n`
            }
        }

        flushAscii()

        // Send the entire sequence to dotool instantly
        this.dotool.stdin.write(script)
    }

    public destroy() {
        this.dotool.kill("SIGTERM")
    }

    constructor() {
        super()
        this.dotool = this.initDotool()
    }
}

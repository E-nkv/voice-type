import { spawn, type ChildProcessWithoutNullStreams } from "child_process"
import { log } from "console"
import { DiffEnum } from "./types.js"

export default class TypingController {
    private prevText: string = ""
    private dotool: ChildProcessWithoutNullStreams

    constructor() {
        this.dotool = this.initDotool()
    }

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
        this.dotool.stdin.write(`type ${text}\n`)
    }

    public applyDiff(currText: string, diffResult: DiffEnum) {
        switch (diffResult) {
            case DiffEnum.NoChange:
                // Do nothing
                break

            case DiffEnum.ChangeRes:
                let charsToAdd = currText
                if (this.prevText === "") {
                    this.typeText(charsToAdd)
                } else {
                    const commonPrefixLen = findCommonPrefixLen(currText, this.prevText)
                    const charsToDelete = this.prevText.length - commonPrefixLen
                    charsToAdd = charsToAdd.slice(commonPrefixLen)
                    this.sendBackspaces(charsToDelete)
                    this.typeText(charsToAdd)
                }
                this.prevText = currText

                break

            case DiffEnum.ChangeResAndClear:
                this.reset()
                break
        }
    }

    public calculateDiff(currText: string): DiffEnum {
        if (currText === this.prevText) {
            return DiffEnum.NoChange
        }

        if (currText.trim() === "") {
            return DiffEnum.ChangeResAndClear
        }

        return DiffEnum.ChangeRes
    }

    public reset() {
        this.prevText = ""
    }

    public destroy() {
        this.dotool.kill("SIGTERM")
    }

    public calculateAndApplyDiff(str: string) {
        const diffRes = this.calculateDiff(str)

        this.applyDiff(str, diffRes)
    }
}

function findCommonPrefixLen(currText: string, prevText: string) {
    let i = 0
    while (currText[i] === prevText[i]) i++
    return i
}

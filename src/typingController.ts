import { log } from "./logger.js"
import { type DiffAction } from "./types.js"

export abstract class TypingController {
    hasStopped: boolean = false
    previousText: string = ""

    abstract typeText(text: string): void
    abstract sendBackspaces(count: number): void
    abstract destroy(): void

    resetInternalBuffer() {
        this.previousText = ""
    }

    applyDiff(currText: string, diffAction: DiffAction) {
        if (this.hasStopped) return
        switch (diffAction) {
            case "NO_CHANGE":
                break

            case "CHANGE":
                let charsToAdd = currText
                if (this.previousText === "") {
                    this.typeText(charsToAdd)
                } else {
                    const commonPrefixLen = findCommonPrefixLen(currText, this.previousText)
                    const charsToDelete = this.previousText.length - commonPrefixLen
                    charsToAdd = charsToAdd.slice(commonPrefixLen)
                    this.sendBackspaces(charsToDelete)
                    this.typeText(charsToAdd)
                }
                this.previousText = currText

                break

            case "CHANGE_AND_CLEAR":
                this.resetInternalBuffer()
                break
        }
    }
    calculateDiffAction(currText: string): DiffAction {
        if (currText === this.previousText) {
            return "NO_CHANGE"
        }

        if (currText.trim() === "") {
            return "CHANGE_AND_CLEAR"
        }

        return "CHANGE"
    }

    public calculateAndApplyDiff(str: string) {
        const diffRes = this.calculateDiffAction(str)
        if (diffRes == "CHANGE_AND_CLEAR") log(`[SpeechUpdate] "${this.previousText}"`)
        this.applyDiff(str, diffRes)
    }
}

function findCommonPrefixLen(currText: string, prevText: string) {
    let i = 0
    while (currText[i] === prevText[i]) i++
    return i
}

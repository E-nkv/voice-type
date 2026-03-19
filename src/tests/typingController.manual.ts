import TypingController from "../typingController.js"

async function test() {
    const tC = new TypingController()
    console.log("move to textbox")
    await zzz(2000)

    tC.calculateAndApplyDiff("hello world")
    tC.calculateAndApplyDiff("hello world yay")

    await zzz(1000)
    tC.destroy()
}

test().catch((err) => console.error)
async function zzz(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

import Daemon from "./daemon.js"
//import { flags } from "./cli.js"

process.title = "voice-type"
process.argv[0] = "voice-type"

const PORT = Number(process.env.PORT) || 3232

//TODO: pass flags via cli
// hardcoded flags for now.
const flags = { textNotifs: true, soundNotifs: true, lang: "en-US" }

const daemon = new Daemon(flags.textNotifs, flags.soundNotifs, flags.lang)
process.on("SIGTERM", async () => {
    await daemon.destroy()
    process.exit(0)
})

process.on("SIGKILL", async () => {
    await daemon.destroy()
    process.exit(0)
})
process.on("SIGINT", async () => {
    await daemon.destroy()
    process.exit(0)
})

daemon.start(PORT).catch(console.error)

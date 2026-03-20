import Daemon from "./daemon.js"

process.title = "wraith"
process.argv[0] = "wraith"

const PORT = Number(process.env.PORT) || 3232
const daemon = new Daemon(true, true, "es-ES")
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

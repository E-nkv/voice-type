import Daemon from "./daemon.js"

process.title = "wraith"
const PORT = Number(process.env.PORT) || 3232
const daemon = new Daemon()
//daemon.testInsertion().catch((e) => console.error)
daemon.start(PORT).catch(console.error)

// Handle graceful shutdown
async function shutdown(signal: string) {
    console.log(`Received ${signal}, shutting down gracefully...`)
    await daemon.destroy()
    process.exit(0)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

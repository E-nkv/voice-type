import Daemon from "./daemon.js"

process.title = "wraith-daemon"
process.argv[0] = "wraith-daemon"

const PORT = Number(process.env.PORT) || 3232
const daemon = new Daemon()

daemon.start(PORT).catch(console.error)

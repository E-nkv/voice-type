import Daemon from "./daemon.js"

process.title = "Wraith-server"
const PORT = process.env.PORT || 3232
const daemon = new Daemon()
//daemon.testInsertion().catch((e) => console.error)
daemon.start(PORT).catch(console.error)

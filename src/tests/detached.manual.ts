import express from "express"
import { spawn } from "child_process"

import { parseArgs, type ParseArgsOptionsConfig } from "node:util"

process.title = "wraith"
const HELP_TEXT = `
WRAITH - Real-Time Dictation Daemon

Usage: wraith [options]

Options:
  --lang <lang>     Set Web Speech API language (e.g., en-US, es-ES). Default: en-US
  -d, --detached    Run the daemon in the background (detached mode)
  -h, --help        Show this help message
    `
function parseFlags() {
    // 1. Define your expected flags
    const options = {
        lang: {
            type: "string",
            short: "l",
            default: "en-US", // Default language
        },
        detached: {
            type: "boolean",
            short: "d",
            default: false,
        },
        help: {
            type: "boolean",
            short: "h",
            default: false,
        },
    }

    // 2. Parse the arguments
    const { values } = parseArgs({
        args: process.argv.slice(2), // In Bun, you can also use Bun.argv.slice(2)
        options: options as ParseArgsOptionsConfig,
        strict: true, // Throws an error if the user passes an unknown flag
    })
    return values
}

const flags = parseFlags()
if (flags.help) {
    console.log(HELP_TEXT)
    process.exit(0)
}

// 3. Handle Detached Mode (Daemonization)
if (flags.detached) {
    const childArgs = process.argv.slice(1).filter((arg) => arg !== "--detached" && arg !== "-d")

    // Spawn the exact same binary, but detached from the current terminal
    const child = spawn(process.argv[0], childArgs, {
        detached: true,
        stdio: "ignore", // Disconnect standard I/O so the terminal can be closed
    })

    // Unreference the child so the parent process can exit immediately
    child.unref()

    console.log(`Wraith daemon started in detached mode. PID: ${child.pid}`)
    process.exit(0)
}

async function main() {
    const app = express()
    app.get("/", (req, res) => {
        res.send("hi!")
    })

    app.listen("3232", () => {
        console.log("srv started on 3232")
    })

    // Keep the event loop alive in compiled binaries
    process.stdin.resume()
    console.log("log from main")
}

main().catch(console.error)

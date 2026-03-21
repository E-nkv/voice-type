import { spawn } from "child_process"
import { parseArgs, type ParseArgsOptionsConfig } from "node:util"
import { WORKING_WSA_LANGUAGES } from "./constants.js"
import type { CliFlags } from "./types.js"

process.title = "wraith"

const HELP_TEXT = `
WRAITH - Real-Time Dictation Daemon

Usage: wraith [options]

Options:
  -l, --lang <lang>       Set Web Speech API language (e.g., en-US, es-ES). Default: en-US
  --no-text                Disable text notifications
  --no-sound               Disable sound notifications
  -d, --detached           Run the daemon in the background (detached mode)
  -h, --help               Show this help message

Supported Languages:
  English: en-US, en-GB, en-AU, en-CA, en-IN
  Spanish: es-ES, es-MX, es-AR, es-CO
  Russian: ru-RU
`

function isValidLanguage(lang: string): boolean {
    return Object.values(WORKING_WSA_LANGUAGES).includes(lang as any)
}

function parseFlags(): CliFlags {
    // Check for --no-text and --no-sound flags manually
    const args = process.argv.slice(2)
    const hasNoText = args.includes("--no-text")
    const hasNoSound = args.includes("--no-sound")

    // Filter out --no-text and --no-sound from args before parsing
    const filteredArgs = args.filter((arg) => arg !== "--no-text" && arg !== "--no-sound")

    const options = {
        lang: {
            type: "string",
            default: "en-US", // Default language
            short: "l",
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

    // Parse the arguments
    const { values } = parseArgs({
        args: filteredArgs,
        options: options as ParseArgsOptionsConfig,
        strict: true, // Throws an error if the user passes an unknown flag
    })

    // Validate language
    const lang = values.lang as string
    if (!isValidLanguage(lang)) {
        console.error(`Error: Invalid language '${lang}'`)
        console.error(`Supported languages: ${Object.values(WORKING_WSA_LANGUAGES).join(", ")}`)
        process.exit(1)
    }

    return {
        lang: lang as any,
        textNotifs: !hasNoText,
        soundNotifs: !hasNoSound,
        detached: values.detached as boolean,
        help: values.help as boolean,
    }
}

export const flags = parseFlags()

if (flags.help) {
    console.log(HELP_TEXT)
    process.exit(0)
}

// Handle Detached Mode (Daemonization)
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

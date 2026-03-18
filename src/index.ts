import puppeteer from "puppeteer"
import { initWSA, startListening, stopListening } from "./browser.js"
import express, { type Express } from "express"
import { log } from "./logger.js"

process.title = "Wraith-server"
const PORT = process.env.PORT || 3232

class Daemon {
    private browser: puppeteer.Browser | null = null
    private page: puppeteer.Page | null = null
    private isListening: boolean = false
    private app: Express
    private port: string | number

    constructor(port: string | number) {
        this.port = port
        this.app = express()
        this.setupRoutes()
    }

    private setupRoutes() {
        this.app.get("/start", async (req, res) => {
            if (!this.isBrowserReady()) {
                log("Browser not ready - cannot start transcription")
                return
            }
            if (this.isListening) {
                log("Already listening.")
                return
            }
            log("Starting transcription...")
            this.isListening = true
            await this.page!.evaluate(startListening)
        })

        this.app.get("/stop", async (req, res) => {
            if (!this.isBrowserReady()) {
                log("Browser not ready - cannot stop transcription")
                return
            }
            if (!this.isListening) {
                log("Cannot call stop before start")
                return
            }
            log("Stopping transcription...")
            this.isListening = false
            await this.page!.evaluate(stopListening)
        })
    }

    private isBrowserReady(): boolean {
        return this.page !== null && this.browser !== null
    }

    private async initBrowser() {
        this.browser = await puppeteer.launch({
            executablePath: "/usr/bin/google-chrome-stable",
            // @ts-ignore
            headless: "new",
            args: [
                "--use-fake-ui-for-media-stream",
                "--disable-background-timer-throttling",
                "--user-data-dir=/tmp/stt-chrome-profile",
                "--log-level=0",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-software-rasterizer",
                "--disable-background-networking",
                "--disable-default-apps",
                "--disable-extensions",
                "--disable-sync",
                "--disable-translate",
                "--metrics-recording-only",
                "--no-first-run",
                "--safebrowsing-disable-auto-update",
                "--disable-features=IsolateOrigins,site-per-process",
            ],
            name: "Wraith-browser",
        })

        this.page = await this.browser.newPage()
        this.page.on("console", (msg) => console.log("[BROWSER]", msg.text()))

        await this.page.goto("data:text/html,<html><body><h1>Wraith</h1></body></html>")
        await this.page.exposeFunction("onSpeechUpdate", this.handleSpeechUpdate.bind(this))
        await this.page.exposeFunction("onSpeechError", this.handleSpeechError.bind(this))
        await this.page.evaluate(initWSA)
    }

    private handleSpeechUpdate(payload: { totalText: string; interimResults: string }) {
        log(`Total: "${payload.totalText}", Interim: "${payload.interimResults}"`)
    }

    private handleSpeechError(payload: { error: string; message: string }) {
        const isWarning = ["network", "not-allowed", "permission-denied"].includes(payload.error)
        log(`${isWarning ? "WARNING" : "ERROR"}: ${payload.message}`)
    }

    public async start() {
        await this.initBrowser()

        this.app.listen(this.port, () => {
            log(`SERVER STARTED ON PORT: ${this.port}`)
        })
    }
}

const daemon = new Daemon(PORT)
daemon.start().catch(console.error)

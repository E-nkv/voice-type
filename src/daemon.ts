import puppeteer from "puppeteer"
import { startListening, stopListening, initWSA } from "./browser.js"
import TypingController from "./typingController.js"
import { log } from "./logger.js"
import express, { type Express } from "express"

export default class Daemon {
    private browser: puppeteer.Browser | null = null
    private page: puppeteer.Page | null = null
    private isWSAListening: boolean = false
    private app: Express

    private typingController: TypingController
    private stopCooldown: boolean = false
    private stopCooldownTimeout: NodeJS.Timeout | null = null

    constructor() {
        this.app = express()
        this.setupRoutes()
        this.typingController = new TypingController()
    }

    private setupRoutes() {
        this.app.get("/start", async (req, res) => {
            if (!this.isBrowserReady()) {
                log("Browser not ready - cannot start transcription")
                return
            }
            if (this.isWSAListening) {
                log("Already listening.")
                return
            }
            log("Starting transcription...")
            this.isWSAListening = true
            await this.page!.evaluate(startListening)
        })

        this.app.get("/stop", async (req, res) => {
            await this.stopTranscription("intentional")
            res.send("Stopped")
        })
    }

    private async stopTranscription(reason: string) {
        if (this.stopCooldown) {
            log(`Stop request ignored - still in cooldown period (reason: ${reason})`)
            return
        }

        if (!this.isBrowserReady()) {
            log("Browser not ready - cannot stop transcription")
            return
        }
        if (!this.isWSAListening) {
            log(`Cannot call stop before start (reason: ${reason})`)
            return
        }
        log(`Stopping transcription... Reason: ${reason}`)
        this.isWSAListening = false
        this.typingController.reset()

        // Set cooldown to prevent rapid successive stop requests
        this.stopCooldown = true
        if (this.stopCooldownTimeout) {
            clearTimeout(this.stopCooldownTimeout)
        }
        this.stopCooldownTimeout = setTimeout(() => {
            this.stopCooldown = false
        }, 1000)

        await this.page!.evaluate(stopListening)
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
        await this.page.exposeFunction("handleWsaClose", this.handleWsaClose.bind(this))
        await this.page.evaluate(initWSA)
    }

    private handleSpeechUpdate(payload: { text: string }) {
        const diffResult = this.typingController.calculateDiff(payload.text)
        log(`[SpeechUpdate] "${payload.text}" | ${diffResult}`)
        //DEBUG END

        this.typingController.calculateAndApplyDiff(payload.text)
    }

    private handleSpeechError(payload: { error: string; message: string }) {
        const isWarning = ["network", "not-allowed", "permission-denied"].includes(payload.error)
        log(`${isWarning ? "WARNING" : "ERROR"}: ${payload.message}`)
    }

    private async handleWsaClose(reason: string) {
        if (!this.isWSAListening) return
        await this.stopTranscription(reason)
    }

    //start spawns browser and server listener
    public async start(port: number | string) {
        await this.initBrowser()

        this.app.listen(port, () => {
            log(`SERVER STARTED ON PORT: ${port}`)
        })
    }
}

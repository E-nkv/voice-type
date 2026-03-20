import puppeteer, { Browser, Page } from "puppeteer-core"
import { startListening, stopListening, initWSA } from "./browser.js"
import TypingController from "./typingController.js"
import { log } from "./logger.js"
import express, { type Express } from "express"
import Notifier from "./notifier.js"

export default class Daemon {
    private wsaLanguage: string = "en-US"
    private browser: Browser | null = null
    private page: Page | null = null
    private isWSAListening: boolean = false
    private app: Express

    private typingController: TypingController = new TypingController()
    private notifier: Notifier
    private stopCooldown: boolean = false
    private stopCooldownTimeout: NodeJS.Timeout | null = null

    constructor(textNotifsEnabled: boolean, soundsNotifsEnabled: boolean, wsaLanguage?: string) {
        this.app = express()
        this.setupRoutes()
        this.notifier = new Notifier({ textNotifsEnabled, soundsNotifsEnabled })
        if (wsaLanguage !== undefined) this.wsaLanguage = wsaLanguage
    }

    private setupRoutes() {
        this.app.get("/start", async (req, res) => {
            if (!this.isBrowserReady()) {
                log("Browser not ready - cannot start transcription")
                this.notifier.notifyError("Browser not ready yet.")
                res.status(503).send("Wait for browser")
                return
            }
            if (this.isWSAListening) {
                log("Already listening.")
                return
            }
            log("Starting transcription...")
            this.isWSAListening = true
            this.notifier.notifyMicStart()
            await this.page!.evaluate(startListening)
            res.send("Listening")
        })

        this.app.get("/stop", async (req, res) => {
            await this.stopTranscription("intentional")
            res.send("Stopped")
        })
    }

    private async stopTranscription(reason: "intentional" | "offline") {
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

        // Trigger corresponding notification
        if (reason === "intentional") {
            this.notifier.notifyMicStop()
        } else if (reason === "offline") {
            this.notifier.notifyOffline()
        }

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
                "--user-data-dir=/tmp/wraith-browser",
                "--process-per-site",
            ],
            name: "Wraith-browser",
        })

        this.page = await this.browser.newPage()
        this.page.on("console", (msg) => console.log("[BROWSER]", msg.text()))

        await this.page.goto("data:text/html,<html><body><h1>Wraith</h1></body></html>")
        await this.page.exposeFunction("onSpeechUpdate", this.handleSpeechUpdate.bind(this))
        await this.page.exposeFunction("onOffline", this.handleOffline.bind(this))
        await this.page.evaluate(initWSA, this.wsaLanguage)
    }

    private handleSpeechUpdate(payload: { text: string }) {
        this.typingController.calculateAndApplyDiff(payload.text)
    }

    private async handleOffline(payload: {}) {
        log("Offline. Please connect to network")
        await this.stopTranscription("offline")
    }

    //start spawns browser and server listener
    public async start(port: number) {
        try {
            await this.initBrowser()
            this.app.listen(port, "127.0.0.1", () => {
                log(`SERVER STARTED ON PORT: ${port}`)
                // Notify that the daemon is ready for user's hotkey
                this.notifier.notifyDaemonStart("F9")
            })
        } catch (e) {
            this.notifier.notifyError("Failed to initialize Wraith daemon.")
            log(`Startup error: ${e}`)
        }
    }

    /**
     * Cleanup resources when shutting down the daemon
     */
    public async destroy() {
        log("Shutting down daemon...")
        this.notifier.destroy()
        this.page?.close()
        this.browser?.close()
        this.typingController.destroy()
        clearTimeout(this.stopCooldownTimeout ?? undefined)
    }
}

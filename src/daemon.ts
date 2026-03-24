import puppeteer, { Browser, Page } from "puppeteer-core"
import { startListening, stopListening, initWSA } from "./browser.js"
import TypingController from "./typingController.js"
import { log } from "./logger.js"
import express, { type Express } from "express"
import Notifier from "./notifier.js"

type DaemonStatus = "initializing" | "listening" | "stopped"

export default class Daemon {
    private wsaLanguage: string
    private browser: Browser | null = null
    private page: Page | null = null
    private status: DaemonStatus = "initializing"
    private isDestroying: boolean = false
    private app: Express
    // Serialises all state mutations. Tail kept non-rejecting so a failed op
    // never poisons subsequent calls.
    private opLock: Promise<unknown> = Promise.resolve()

    private typingController: TypingController = new TypingController()
    private notifier: Notifier

    constructor(
        textNotifsEnabled: boolean,
        soundsNotifsEnabled: boolean,
        wsaLanguage: string = "en-US"
    ) {
        this.app = express()
        this.wsaLanguage = wsaLanguage
        this.notifier = new Notifier({ textNotifsEnabled, soundsNotifsEnabled })
        this.setupRoutes()
    }

    private withLock<T>(fn: () => Promise<T>): Promise<T> {
        const next = this.opLock.then(fn, fn) as Promise<T>
        this.opLock = next.then(() => { }, () => { })
        return next
    }

    // Routes

    private setupRoutes() {
        this.app.get("/status", (_req, res) => {
            res.send(this.status)
        })

        this.app.get("/toggle", async (_req, res) => {
            try {
                const r = await this.withLock(() =>
                    this.status === "listening"
                        ? this.stopTranscription("intentional")
                        : this.startTranscription()
                )
                res.status(r.status).send(r.message)
            } catch (err) {
                res.status(500).send(String(err))
            }
        })

        this.app.get("/exit", (_req, res) => {
            // Flush response before exit — process.exit can race the TCP write.
            res.on("finish", async () => {
                this.notifier.notifyDaemonStop()
                await this.withLock(() => this.destroy())
                process.exit(0)
            })
            res.send("Stopped daemon")
        })
    }

    private async startTranscription(): Promise<{ status: number; message: string }> {
        if (!this.isBrowserReady()) {
            this.notifier.notifyError("Browser not ready yet.")
            return { status: 503, message: "Wait for browser" }
        }

        await this.getPage().evaluate(startListening)
        // Flip only after browser confirms — avoids false-listening state on failure.
        this.status = "listening"
        this.notifier.notifyMicStart()
        return { status: 200, message: "Listening" }
    }

    private async stopTranscription(reason: "intentional" | "offline"): Promise<{ status: number; message: string }> {
        // Stop browser before flipping — late onSpeechUpdate events are dropped
        // by the handleSpeechUpdate guard once status changes.
        await this.getPage().evaluate(stopListening)
        this.status = "stopped"
        this.typingController.reset()

        reason === "intentional" ? this.notifier.notifyMicStop() : this.notifier.notifyOffline()

        return { status: 200, message: "Stopped" }
    }

    private handleSpeechUpdate(payload: { text: string }) {
        if (this.status !== "listening") return
        this.typingController.calculateAndApplyDiff(payload.text)
    }

    private handleOffline() {
        this.withLock(() => this.stopTranscription("offline")).catch((err) =>
            log(`Error handling offline event: ${err}`)
        )
    }

    private isBrowserReady(): boolean {
        return this.browser !== null && this.page !== null
    }

    private getPage(): Page {
        if (!this.page) throw new Error("Page is not initialised")
        return this.page
    }

    private async initBrowser() {
        if (this.browser) return

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
                "--process-per-site",
            ],
            name: "Voice-Type-browser",
        })

        this.page = await this.browser.newPage()
        this.page.on("console", (msg) => log(`[BROWSER] ${msg.text()}`))

        await this.page.goto("data:text/html,<html><body></body></html>")
        await this.page.exposeFunction("onSpeechUpdate", this.handleSpeechUpdate.bind(this))
        await this.page.exposeFunction("onOffline", this.handleOffline.bind(this))
        await this.page.evaluate(initWSA, this.wsaLanguage)

        this.status = "stopped"
    }

    public async start(port: number) {
        try {
            await new Promise<void>((resolve) => {
                this.app.listen(port, "127.0.0.1", () => {
                    log(`Server started on port: ${port}`)
                    resolve()
                })
            })
            await this.initBrowser()
            this.notifier.notifyDaemonStart("F9")
        } catch (err) {
            log(`Startup error: ${err}`)
            this.notifier.notifyError("Failed to initialise Voice Type daemon.")
            process.exit(1)
        }
    }

    public async destroy() {
        if (this.isDestroying) return
        this.isDestroying = true

        this.notifier.destroy()
        this.typingController.destroy()

        // Null out first so isBrowserReady() returns false for concurrent
        // callers before the async close calls run.
        const page = this.page
        const browser = this.browser
        this.page = null
        this.browser = null

        await page?.close()
        await browser?.close()
    }
}
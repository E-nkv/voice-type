// enhanced logger with inbuilt rotation once buffer size reaches maxMB
export class Logger {
    private buffer: string[] = []
    private maxSize: number
    private currentSize = 0

    constructor(maxMB = 10) {
        this.maxSize = maxMB * 1024 * 1024
    }

    log(message: string): void {
        const size = Buffer.byteLength(message, "utf8")

        while (this.currentSize + size > this.maxSize && this.buffer.length > 0) {
            this.currentSize -= Buffer.byteLength(this.buffer.shift()!, "utf8")
        }

        this.buffer.push(message)
        this.currentSize += size
        console.log(message)
    }
}
const logger = new Logger()

export function log(msg: string) {
    logger.log(msg)
}

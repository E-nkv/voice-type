import Notifier from "../notifier.js"
import { SoundNotifier } from "../soundNotifier.js"
import { TextNotifier } from "../textNotifier.js"

const not = new Notifier({})

// Helper function for delays
async function zzz(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

// Run individual tests by uncommenting:
async function m() {
    not.notifyDaemonStart("F9")
    await zzz(1000)
    not.notifyMicStart()
    await zzz(1000)
    not.notifyMicStop()
    await zzz(1000)
    not.notifyOffline()
    await zzz(1000)
    not.notifyError("unknown error")
    await zzz(1000)
    // Force exit after cleanup to ensure no lingering processes
}

m().catch(console.error)

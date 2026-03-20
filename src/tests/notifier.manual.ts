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
    not.notifyMicStop()

    // Force exit after cleanup to ensure no lingering processes
}

m().catch(console.error)

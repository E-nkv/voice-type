const ERROR_MESSAGES = {
    network: "Network unavailable - Web Speech API requires internet connection",
    "not-allowed": "Microphone access denied - check browser settings",
    "permission-denied": "Microphone access denied - check browser settings",
    "audio-capture": "No microphone found - check audio input devices",
    aborted: "Speech recognition was aborted",
}

export function initWSA() {
    console.log("initWSA script is running inside the browser!")

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRec) {
        console.error("FATAL: Web Speech API is not supported in this browser context.")
        return
    }

    const rec = new SpeechRec()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = "en-EN"

    window.isIntentionalStop = true
    window.hasNetworkError = false

    rec.onstart = () => {
        console.log("Listening for audio...")
    }

    rec.onresult = (event) => {
        let interimText = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (!event.results[i].isFinal) {
                interimText += event.results[i][0].transcript
            }
        }

        if (window.onSpeechUpdate) {
            window.onSpeechUpdate({ text: interimText })
        }
    }

    rec.onerror = (event) => {
        if (event.error === "no-speech") return

        const message = ERROR_MESSAGES[event.error] || `Speech recognition error: ${event.error}`
        if (event.error === "network") window.hasNetworkError = true

        console.error(message)
        if (window.onSpeechError) {
            window.onSpeechError({ error: event.error, message })
        }
    }

    rec.onend = () => {
        let reason = "intentional"

        if (!window.isIntentionalStop && !window.hasNetworkError) {
            reason = "silence"
        } else if (window.hasNetworkError) {
            reason = "network-error"
        }

        if (window.handleWsaClose) {
            window.handleWsaClose(reason)
        }
    }

    window.recognition = rec
}

export function startListening() {
    if (!window.recognition) {
        const message = "Speech recognition not initialized"
        console.error(message)
        if (window.onSpeechError) {
            window.onSpeechError({ error: "not-initialized", message })
        }
        return
    }

    // Check network connectivity before starting
    if (!navigator.onLine) {
        const message = ERROR_MESSAGES.network
        console.error(message)
        if (window.onSpeechError) {
            window.onSpeechError({ error: "network", message })
        }
        return
    }

    window.isIntentionalStop = false
    window.hasNetworkError = false

    try {
        window.recognition.start()
    } catch (e) {
        const message = `Error starting: ${e.message || e}`
        console.error(message)
        if (window.onSpeechError) {
            window.onSpeechError({ error: "start-failed", message })
        }
    }
}

export function stopListening() {
    if (!window.recognition) {
        const message = "Speech recognition not initialized"
        console.error(message)
        if (window.onSpeechError) {
            window.onSpeechError({ error: "not-initialized", message })
        }
        return
    }

    window.isIntentionalStop = true

    try {
        window.recognition.stop()
    } catch (e) {
        const message = `Error stopping: ${e.message || e}`
        console.error(message)
        if (window.onSpeechError) {
            window.onSpeechError({ error: "stop-failed", message })
        }
    }
}

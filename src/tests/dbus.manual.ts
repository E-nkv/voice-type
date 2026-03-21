import { sessionBus, Variant } from "dbus-next"

async function runTest() {
    console.log("Connecting to D-Bus...")
    const bus = sessionBus()

    // Get the Notification interface
    const obj = await bus.getProxyObject("org.freedesktop.Notifications", "/org/freedesktop/Notifications")
    const notify = obj.getInterface("org.freedesktop.Notifications")

    // Hints to tell GNOME: "This is a real-time status update, don't save to history"
    const hints = {
        transient: new Variant("b", true),
        "x-canonical-private-synchronous": new Variant("s", "voice-type-dictation"),
    }

    console.log("Sending first notification...")

    // D-Bus Signature: app_name (s), replaces_id (u), app_icon (s), summary (s), body (s), actions (as), hints (a{sv}), timeout (i)
    const id1 = await notify.Notify(
        "Voice Type",
        0, // 0 means "create a new notification"
        "microphone-sensitivity-high",
        "🟢 123",
        "123",
        [], // actions (empty array)
        hints,
        5000, // 5 seconds timeout
    )

    console.log(`Notification 1 sent. ID: ${id1}`)
    console.log("Waiting 500ms...")

    // Wait 500ms, then replace it instantly
    setTimeout(async () => {
        console.log("Sending instant replacement...")

        try {
            const id2 = await notify.Notify(
                "Voice Type",
                id1, // Pass the ID of the first notification to replace it!
                "microphone-sensitivity-high",
                "🟢 567",
                "567",
                [], // actions (empty array)
                hints,
                5000, // 5 seconds timeout
            )
            console.log(`Notification 2 sent (replacing ${id1}). ID: ${id2}`)
        } catch (error) {
            console.error("Error sending replacement notification:", error)
        } finally {
            // Clean up and disconnect the bus after the test
            bus.disconnect()
            console.log("D-Bus connection closed. Test complete.")
        }
    }, 500)
}

runTest().catch((err) => {
    console.error("An error occurred during the test:", err)
    process.exit(1)
})

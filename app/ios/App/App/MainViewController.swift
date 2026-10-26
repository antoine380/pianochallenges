import UIKit
import Capacitor

/// Hosts the web app and registers the local plugins (MIDI, sign-in, remote web updates).
class MainViewController: CAPBridgeViewController {
    /// Serves the web version downloaded by LiveUpdatePlugin (Library/NoCloud/live/<version>) instead of the
    /// embedded public/ folder when one is ready. Same capacitor://localhost origin: the player's data stays.
    override func instanceDescriptor() -> InstanceDescriptor {
        let descriptor = super.instanceDescriptor()
        if let dir = LiveUpdateStore.bootLocation() {
            descriptor.appLocation = dir
            CAPLog.print("⚡️  Piano Challenges: web version \(LiveUpdateStore.running ?? "?") from \(dir.lastPathComponent)")
        }
        return descriptor
    }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MidiPlugin())
        bridge?.registerPluginInstance(AuthPlugin())
        bridge?.registerPluginInstance(LiveUpdatePlugin())
        CAPLog.print("⚡️  Piano Challenges: Midi, Auth and LiveUpdate plugins registered")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // Same night violet as the web app (--bg #15122e) and capacitor.config.json backgroundColor.
        view.backgroundColor = UIColor(red: 0x15 / 255, green: 0x12 / 255, blue: 0x2e / 255, alpha: 1)
        webView?.isOpaque = false
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // Keep the screen awake while practising.
        UIApplication.shared.isIdleTimerDisabled = true
    }

    // Full-screen game: no status bar on iPhone or iPad (matches UIStatusBarHidden in Info.plist;
    // UIViewControllerBasedStatusBarAppearance is true, so this controller decides).
    override var prefersStatusBarHidden: Bool {
        return true
    }

}

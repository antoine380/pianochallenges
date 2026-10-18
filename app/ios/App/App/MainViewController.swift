import UIKit
import Capacitor

/// Hosts the web app and registers the local MIDI plugin.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MidiPlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0x16 / 255, green: 0x19 / 255, blue: 0x20 / 255, alpha: 1)
        webView?.isOpaque = false
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // Keep the screen awake while practising.
        UIApplication.shared.isIdleTimerDisabled = true
    }

}

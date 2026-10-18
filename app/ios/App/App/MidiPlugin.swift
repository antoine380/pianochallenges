import Foundation
import UIKit
import Capacitor
import CoreMIDI
import CoreAudioKit

/// Native MIDI for Piano Challenges.
/// Receives notes from every CoreMIDI source (USB-C / Lightning keyboards, Bluetooth LE MIDI,
/// network sessions) and forwards them to the web page, which wraps them in a Web MIDI-like API.
///
/// JS name: `Midi`
///   start()          -> { inputs: [{ id, name }] }
///   listInputs()     -> { inputs: [{ id, name }] }
///   showBluetooth()  -> opens Apple's Bluetooth MIDI pairing sheet
/// Events:
///   "midi"        { id, data: [status, data1, data2] }
///   "statechange" { inputs: [{ id, name }] }
@objc(MidiPlugin)
public class MidiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MidiPlugin"
    public let jsName = "Midi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listInputs", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showBluetooth", returnType: CAPPluginReturnPromise)
    ]

    private var client = MIDIClientRef()
    private var inputPort = MIDIPortRef()
    private var started = false
    private var connected = Set<MIDIUniqueID>()
    private var bluetoothNav: UINavigationController?

    // MARK: - JS methods

    @objc func start(_ call: CAPPluginCall) {
        if !started {
            var status = MIDIClientCreateWithBlock("Piano Challenges" as CFString, &client) { [weak self] notification in
                if notification.pointee.messageID == .msgSetupChanged {
                    DispatchQueue.main.async { self?.refresh(notify: true) }
                }
            }
            guard status == noErr else { call.reject("Could not start MIDI (\(status))"); return }

            status = MIDIInputPortCreateWithBlock(client, "Input" as CFString, &inputPort) { [weak self] packetList, refCon in
                self?.receive(packetList, refCon)
            }
            guard status == noErr else { call.reject("Could not open MIDI input (\(status))"); return }
            started = true
        }
        call.resolve(["inputs": refresh(notify: false)])
    }

    @objc func listInputs(_ call: CAPPluginCall) {
        call.resolve(["inputs": started ? refresh(notify: false) : []])
    }

    @objc func showBluetooth(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else { call.reject("No view"); return }
            let central = CABTMIDICentralViewController()
            central.navigationItem.title = "Bluetooth MIDI"
            central.navigationItem.rightBarButtonItem = UIBarButtonItem(
                barButtonSystemItem: .done, target: self, action: #selector(self.closeBluetooth))
            let nav = UINavigationController(rootViewController: central)
            nav.modalPresentationStyle = .formSheet
            self.bluetoothNav = nav
            presenter.present(nav, animated: true)
            call.resolve()
        }
    }

    @objc private func closeBluetooth() {
        bluetoothNav?.dismiss(animated: true)
        bluetoothNav = nil
        refresh(notify: true)
    }

    // MARK: - Sources

    /// Connects any new source and returns the current list of inputs.
    @discardableResult
    private func refresh(notify: Bool) -> [[String: Any]] {
        var inputs: [[String: Any]] = []
        var present = Set<MIDIUniqueID>()
        for i in 0..<MIDIGetNumberOfSources() {
            let source = MIDIGetSource(i)
            if source == 0 { continue }
            var uid: MIDIUniqueID = 0
            MIDIObjectGetIntegerProperty(source, kMIDIPropertyUniqueID, &uid)
            present.insert(uid)
            var offline: Int32 = 0
            MIDIObjectGetIntegerProperty(source, kMIDIPropertyOffline, &offline)
            if offline != 0 { continue }
            if started && !connected.contains(uid) {
                if MIDIPortConnectSource(inputPort, source, MidiPlugin.refCon(for: uid)) == noErr {
                    connected.insert(uid)
                }
            }
            inputs.append(["id": String(uid), "name": MidiPlugin.name(of: source)])
        }
        // Sources that disappeared are disconnected by CoreMIDI; forget them so they reconnect later.
        connected = connected.intersection(present)
        if notify { notifyListeners("statechange", data: ["inputs": inputs]) }
        return inputs
    }

    private static func name(of object: MIDIObjectRef) -> String {
        var cf: Unmanaged<CFString>?
        if MIDIObjectGetStringProperty(object, kMIDIPropertyDisplayName, &cf) == noErr, let s = cf?.takeRetainedValue() {
            return s as String
        }
        if MIDIObjectGetStringProperty(object, kMIDIPropertyName, &cf) == noErr, let s = cf?.takeRetainedValue() {
            return s as String
        }
        return "MIDI"
    }

    /// The source's unique id is stored in the connection refCon (offset by 1 so it is never nil).
    private static func refCon(for uid: MIDIUniqueID) -> UnsafeMutableRawPointer? {
        UnsafeMutableRawPointer(bitPattern: Int(UInt32(bitPattern: uid)) + 1)
    }

    private static func uid(from refCon: UnsafeMutableRawPointer?) -> MIDIUniqueID {
        guard let p = refCon else { return 0 }
        return MIDIUniqueID(bitPattern: UInt32(truncatingIfNeeded: Int(bitPattern: p) - 1))
    }

    // MARK: - Receiving

    private func receive(_ packetList: UnsafePointer<MIDIPacketList>, _ refCon: UnsafeMutableRawPointer?) {
        let id = String(MidiPlugin.uid(from: refCon))
        var messages: [[Int]] = []
        let dataOffset = MemoryLayout<MIDIPacket>.offset(of: \MIDIPacket.data) ?? 10
        for packet in packetList.unsafeSequence() {
            let length = Int(packet.pointee.length)
            let bytes = UnsafeRawPointer(packet).advanced(by: dataOffset).assumingMemoryBound(to: UInt8.self)
            messages.append(contentsOf: MidiPlugin.split(UnsafeBufferPointer(start: bytes, count: length)))
        }
        if messages.isEmpty { return }
        DispatchQueue.main.async {
            for m in messages { self.notifyListeners("midi", data: ["id": id, "data": m]) }
        }
    }

    /// Splits raw bytes into channel messages (note on/off, CC…), skipping SysEx and real-time bytes.
    private static func split(_ bytes: UnsafeBufferPointer<UInt8>) -> [[Int]] {
        var out: [[Int]] = []
        var current: [Int] = []
        var expected = 0
        var inSysEx = false
        for b in bytes {
            if b >= 0xF8 { continue }                       // clock, active sensing…
            if b == 0xF0 { inSysEx = true; continue }
            if b == 0xF7 { inSysEx = false; continue }
            if inSysEx { continue }
            if b & 0x80 != 0 {
                let kind = b & 0xF0
                current = [Int(b)]
                switch kind {
                case 0xC0, 0xD0: expected = 2
                case 0xF0: expected = 0; current = []       // other system common: ignore
                default: expected = 3
                }
            } else if !current.isEmpty {
                current.append(Int(b))
                if current.count == expected {
                    out.append(current)
                    current = [current[0]]                  // running status
                }
            }
        }
        return out
    }
}

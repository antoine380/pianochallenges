import Foundation
import UIKit
import Capacitor
import CryptoKit

// Mise à jour à distance (« live update ») de la partie web de Piano Challenges, sans service tiers.
//
// - Au lancement (après `LiveUpdate.ready()` de la page) et au retour au premier plan (au plus une fois par heure),
//   l'app lit https://pianochallenges.com/live/manifest.json (écrit par tools/build.py → tools/live_manifest.mjs).
// - Version plus récente que celle qui tourne, et `native_min` <= NATIVE_VERSION : les fichiers sont copiés
//   (inchangés : depuis la version embarquée ou active) ou téléchargés (modifiés), vérifiés (taille + SHA-256)
//   dans Library/NoCloud/live/<version>/, puis la version est mise EN ATTENTE : elle sert au lancement suivant
//   (jamais de rechargement en pleine partie).
// - Au lancement suivant, MainViewController.instanceDescriptor() sert ce dossier à la place de public/.
//   L'adresse reste capacitor://localhost : localStorage (état du joueur), IndexedDB et cookies sont les mêmes.
// - Une nouvelle version doit appeler `LiveUpdate.ready()` dans les 20 s ; sinon retour à la version précédente
//   (ou embarquée), et la version fautive n'est plus jamais reprise.
// - `LiveUpdate.reset()` revient à la version embarquée (la version publiée actuelle est écartée).
// En cas de doute (réseau, fichier, JSON), on ne change rien : la version embarquée reste toujours disponible.

enum LiveUpdateConfig {
    /// Version du code natif. À augmenter avec NATIVE_MIN de app/scripts/web-files.mjs quand le web a besoin d'un nouveau natif.
    static let nativeVersion = 1
    static let host = "pianochallenges.com"
    static let manifestPath = "/live/manifest.json"
    static let readyTimeout: TimeInterval = 20
    static let checkEvery: TimeInterval = 3600
    static let maxManifestSize = 2_000_000
    static let maxFileSize = 30_000_000
    static let maxTotalSize = 100_000_000
    static let maxFiles = 3000
    static let maxBad = 20
    static let defaultsKey = "pcLiveUpdate"
}

/// Un fichier du manifeste : `path` dans l'app, `src` sur le site (par défaut = path).
struct LiveFile {
    let path: String
    let src: String
    let sha256: String
    let size: Int
}

struct LiveManifest {
    let version: String
    let nativeMin: Int
    let files: [LiveFile]

    private static let nameChars = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-")
    private static let versionChars = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._:-")
    private static let hexChars = CharacterSet(charactersIn: "0123456789abcdef")

    static func validVersion(_ v: String) -> Bool {
        guard !v.isEmpty, v.count <= 64, let first = v.unicodeScalars.first else { return false }
        // une construction publiée commence par sa date (2026-10-26T18:27Z) ; « dev » n'est jamais une mise à jour
        guard CharacterSet.decimalDigits.contains(first) else { return false }
        return v.unicodeScalars.allSatisfy { versionChars.contains($0) }
    }

    /// Chemin relatif sûr : morceaux simples séparés par « / », sans « .. », sans fichier caché.
    static func validPath(_ p: String) -> Bool {
        guard !p.isEmpty, p.count <= 200, !p.hasPrefix("/"), !p.hasSuffix("/") else { return false }
        let parts = p.split(separator: "/", omittingEmptySubsequences: false)
        for part in parts {
            guard let first = part.unicodeScalars.first, first != "." else { return false }
            guard part.unicodeScalars.allSatisfy({ nameChars.contains($0) }) else { return false }
        }
        return true
    }

    static func validSha(_ s: String) -> Bool {
        return s.count == 64 && s.unicodeScalars.allSatisfy { hexChars.contains($0) }
    }

    static func parse(_ data: Data) -> LiveManifest? {
        guard data.count <= LiveUpdateConfig.maxManifestSize,
              let obj = try? JSONSerialization.jsonObject(with: data, options: []),
              let dict = obj as? [String: Any],
              let version = dict["version"] as? String, validVersion(version),
              let list = dict["files"] as? [Any], !list.isEmpty, list.count <= LiveUpdateConfig.maxFiles
        else { return nil }
        let nativeMin = (dict["native_min"] as? NSNumber)?.intValue ?? 1
        var files: [LiveFile] = []
        var seen = Set<String>()
        var total = 0
        for item in list {
            guard let f = item as? [String: Any],
                  let path = f["path"] as? String, validPath(path), !path.hasPrefix("live/"),
                  let sha = f["sha256"] as? String, validSha(sha),
                  let sizeNum = f["size"] as? NSNumber
            else { return nil }
            let size = sizeNum.intValue
            let src = (f["src"] as? String) ?? path
            guard size >= 0, size <= LiveUpdateConfig.maxFileSize, validPath(src), !seen.contains(path) else { return nil }
            seen.insert(path)
            total += size
            files.append(LiveFile(path: path, src: src, sha256: sha, size: size))
        }
        guard total <= LiveUpdateConfig.maxTotalSize, seen.contains("index.html") else { return nil }
        return LiveManifest(version: version, nativeMin: nativeMin, files: files)
    }
}

/// État gardé dans UserDefaults (petit dictionnaire, jamais de données du joueur).
struct LiveState {
    var active: String?      // version confirmée (a appelé ready)
    var pending: String?     // téléchargée, servira au prochain lancement
    var trial: String?       // lancée mais pas encore confirmée
    var trialCount: Int = 0  // lancements sans ready
    var bad: [String] = []   // versions écartées (jamais reprises)
    var lastCheck: Double = 0

    static func load() -> LiveState {
        var st = LiveState()
        guard let d = UserDefaults.standard.dictionary(forKey: LiveUpdateConfig.defaultsKey) else { return st }
        st.active = d["active"] as? String
        st.pending = d["pending"] as? String
        st.trial = d["trial"] as? String
        st.trialCount = (d["trialCount"] as? NSNumber)?.intValue ?? 0
        st.bad = (d["bad"] as? [String]) ?? []
        st.lastCheck = (d["lastCheck"] as? NSNumber)?.doubleValue ?? 0
        return st
    }

    func save() {
        var d: [String: Any] = ["trialCount": trialCount, "bad": Array(bad.suffix(LiveUpdateConfig.maxBad)), "lastCheck": lastCheck]
        if let v = active { d["active"] = v }
        if let v = pending { d["pending"] = v }
        if let v = trial { d["trial"] = v }
        UserDefaults.standard.set(d, forKey: LiveUpdateConfig.defaultsKey)
    }

    mutating func markBad(_ v: String) {
        if !bad.contains(v) { bad.append(v) }
        if active == v { active = nil }
        if pending == v { pending = nil }
        if trial == v { trial = nil; trialCount = 0 }
    }
}

/// Toute la logique (sans le pont Capacitor) : choix de la version au démarrage, téléchargement, retour en arrière.
/// L'état n'est modifié que sur le fil principal ; le téléchargement se fait sur une file à part.
final class LiveUpdateStore {
    /// Version servie par ce lancement (nil = version embarquée).
    private(set) static var running: String?
    /// Ce lancement essaie une nouvelle version : elle doit appeler ready().
    private(set) static var runningIsTrial = false
    private(set) static var checking = false
    private static let queue = DispatchQueue(label: "com.pianochallenges.liveupdate", qos: .utility)

    // MARK: Dossiers

    static func rootDir() -> URL? {
        guard let lib = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first else { return nil }
        let root = lib.appendingPathComponent("NoCloud", isDirectory: true).appendingPathComponent("live", isDirectory: true)
        if !FileManager.default.fileExists(atPath: root.path) {
            do {
                try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true, attributes: nil)
                var values = URLResourceValues()
                values.isExcludedFromBackup = true
                var r = root
                try? r.setResourceValues(values)
            } catch {
                return nil
            }
        }
        return root
    }

    static func dirName(_ version: String) -> String {
        return String(version.map { $0 == ":" ? "-" : $0 })
    }

    static func dir(_ version: String) -> URL? {
        return rootDir()?.appendingPathComponent(dirName(version), isDirectory: true)
    }

    static func embeddedDir() -> URL? {
        return Bundle.main.resourceURL?.appendingPathComponent("public", isDirectory: true)
    }

    static func readManifest(in base: URL?) -> LiveManifest? {
        guard let base = base,
              let data = try? Data(contentsOf: base.appendingPathComponent("live/manifest.json")) else { return nil }
        return LiveManifest.parse(data)
    }

    /// Version embarquée (« » si inconnue : toute version publiée est alors plus récente).
    static func embeddedVersion() -> String {
        return readManifest(in: embeddedDir())?.version ?? ""
    }

    /// Les deux versions sont des dates ISO (2026-10-26T18:27Z) : l'ordre alphabétique est l'ordre du temps.
    static func isNewer(_ a: String, than b: String) -> Bool {
        guard LiveManifest.validVersion(a) else { return false }
        guard LiveManifest.validVersion(b) else { return true }
        return a > b
    }

    /// Version téléchargée complète, utilisable par ce code natif, plus récente que l'embarquée, jamais écartée.
    static func usable(_ v: String, _ st: LiveState, embedded: String) -> Bool {
        guard !st.bad.contains(v), isNewer(v, than: embedded), let d = dir(v) else { return false }
        guard let data = try? Data(contentsOf: d.appendingPathComponent(".complete")),
              let obj = try? JSONSerialization.jsonObject(with: data, options: []),
              let marker = obj as? [String: Any],
              (marker["version"] as? String) == v,
              let nativeMin = (marker["native_min"] as? NSNumber)?.intValue,
              nativeMin <= LiveUpdateConfig.nativeVersion
        else { return false }
        return FileManager.default.fileExists(atPath: d.appendingPathComponent("index.html").path)
    }

    // MARK: Démarrage (appelé par MainViewController.instanceDescriptor, avant le chargement de la page)

    static func bootLocation() -> URL? {
        var st = LiveState.load()
        let embedded = embeddedVersion()
        // deux lancements de suite sans ready (plantage, app tuée au démarrage) : version écartée
        if let t = st.trial, st.trialCount >= 2 { st.markBad(t) }
        // une version en attente devient l'essai de ce lancement
        if st.trial == nil, let p = st.pending {
            st.pending = nil
            if usable(p, st, embedded: embedded) { st.trial = p; st.trialCount = 0 }
        }
        if let t = st.trial {
            if usable(t, st, embedded: embedded), let d = dir(t) {
                st.trialCount += 1
                st.save()
                running = t
                runningIsTrial = true
                return d
            }
            st.trial = nil
            st.trialCount = 0
        }
        if let a = st.active {
            if usable(a, st, embedded: embedded), let d = dir(a) {
                st.save()
                running = a
                runningIsTrial = false
                return d
            }
            st.active = nil // plus ancienne que l'embarquée (nouvelle app installée) ou abîmée
        }
        st.save()
        running = nil
        runningIsTrial = false
        return nil
    }

    /// La page a démarré sans erreur : l'essai devient la version active.
    static func confirmRunning() {
        guard runningIsTrial, let v = running else { return }
        var st = LiveState.load()
        if st.trial == v {
            st.active = v
            st.trial = nil
            st.trialCount = 0
            st.save()
        }
        runningIsTrial = false
    }

    /// Pas de ready à temps : l'essai est écarté ; renvoie le dossier à servir à la place.
    static func rollback() -> URL? {
        var st = LiveState.load()
        if let v = running { st.markBad(v) }
        let embedded = embeddedVersion()
        runningIsTrial = false
        if let a = st.active, usable(a, st, embedded: embedded), let d = dir(a) {
            st.save()
            running = a
            return d
        }
        st.active = nil
        st.save()
        running = nil
        return embeddedDir()
    }

    /// Retour à la version embarquée : les versions téléchargées actuelles sont écartées (seule une publication plus récente reviendra).
    static func reset() -> URL? {
        var st = LiveState.load()
        for v in [running, st.active, st.pending, st.trial].compactMap({ $0 }) { st.markBad(v) }
        st.lastCheck = Date().timeIntervalSince1970
        st.save()
        running = nil
        runningIsTrial = false
        return embeddedDir()
    }

    static func info() -> [String: Any] {
        let st = LiveState.load()
        let embedded = embeddedVersion()
        var out: [String: Any] = [
            "version": running ?? embedded,
            "embedded": embedded,
            "source": running == nil ? "embedded" : "live",
            "native": LiveUpdateConfig.nativeVersion,
            "trial": runningIsTrial,
            "checking": checking,
            "lastCheck": st.lastCheck
        ]
        if let p = st.pending, usable(p, st, embedded: embedded) { out["pending"] = p }
        return out
    }

    // MARK: Vérification et téléchargement

    /// `completion` est appelé sur le fil principal avec un statut : uptodate, pending:<v>, native, recent, busy, trial, error.
    static func check(force: Bool, completion: @escaping (String) -> Void) {
        guard Thread.isMainThread else {
            DispatchQueue.main.async { LiveUpdateStore.check(force: force, completion: completion) }
            return
        }
        if checking { completion("busy"); return }
        if runningIsTrial { completion("trial"); return } // d'abord confirmer la version qui tourne
        var st = LiveState.load()
        let now = Date().timeIntervalSince1970
        if !force && st.lastCheck > 0 && now >= st.lastCheck && now - st.lastCheck < LiveUpdateConfig.checkEvery {
            completion("recent")
            return
        }
        st.lastCheck = now
        st.save()
        checking = true
        let embedded = embeddedVersion()
        let runningNow = running
        var newest = embedded
        for v in [runningNow, st.active, st.pending].compactMap({ $0 }) where isNewer(v, than: newest) { newest = v }
        let bad = st.bad
        let newestV = newest
        // fichiers déjà sur l'appareil, réutilisables s'ils ont le même SHA-256
        var sources: [(URL, LiveManifest)] = []
        if let d = embeddedDir(), let m = readManifest(in: d) { sources.append((d, m)) }
        if let v = runningNow, let d = dir(v), let m = readManifest(in: d) { sources.append((d, m)) }
        queue.async {
            let result = LiveUpdateStore.download(newest: newestV, bad: bad, sources: sources, keep: runningNow)
            DispatchQueue.main.async {
                LiveUpdateStore.checking = false
                if result.hasPrefix("pending:") {
                    let v = String(result.dropFirst("pending:".count))
                    var s = LiveState.load()
                    s.pending = v
                    s.save()
                    LiveUpdateStore.purge(keep: [runningNow, s.active, v].compactMap { $0 })
                }
                completion(result)
            }
        }
    }

    /// Sur la file à part : ne touche pas à l'état, seulement aux fichiers de Library/NoCloud/live.
    private static func download(newest: String, bad: [String], sources: [(URL, LiveManifest)], keep: String?) -> String {
        guard let root = rootDir(),
              let manifestURL = siteURL(LiveUpdateConfig.manifestPath, query: String(Int(Date().timeIntervalSince1970))),
              let raw = fetch(manifestURL), let man = LiveManifest.parse(raw)
        else { return "error" }
        if !isNewer(man.version, than: newest) || bad.contains(man.version) { return "uptodate" }
        if man.nativeMin > LiveUpdateConfig.nativeVersion { return "native" }
        let fm = FileManager.default
        let staging = root.appendingPathComponent(".tmp", isDirectory: true)
        try? fm.removeItem(at: staging)
        do {
            try fm.createDirectory(at: staging, withIntermediateDirectories: true, attributes: nil)
        } catch {
            return "error"
        }
        var local: [String: URL] = [:]
        for (base, m) in sources {
            for f in m.files where local[f.sha256] == nil { local[f.sha256] = base.appendingPathComponent(f.path) }
        }
        for f in man.files {
            var data: Data?
            if let u = local[f.sha256], let d = try? Data(contentsOf: u), d.count == f.size, sha256Hex(d) == f.sha256 {
                data = d
            } else if let u = siteURL("/" + f.src, query: String(f.sha256.prefix(12))), let d = fetch(u),
                      d.count == f.size, sha256Hex(d) == f.sha256 {
                data = d
            }
            guard let ok = data else {
                try? fm.removeItem(at: staging)
                return "error"
            }
            let dest = staging.appendingPathComponent(f.path)
            do {
                try fm.createDirectory(at: dest.deletingLastPathComponent(), withIntermediateDirectories: true, attributes: nil)
                try ok.write(to: dest, options: .atomic)
            } catch {
                try? fm.removeItem(at: staging)
                return "error"
            }
        }
        do {
            let liveDir = staging.appendingPathComponent("live", isDirectory: true)
            try fm.createDirectory(at: liveDir, withIntermediateDirectories: true, attributes: nil)
            try raw.write(to: liveDir.appendingPathComponent("manifest.json"), options: .atomic)
            let markerObj: [String: Any] = ["version": man.version, "native_min": man.nativeMin]
            let marker = try JSONSerialization.data(withJSONObject: markerObj, options: [])
            try marker.write(to: staging.appendingPathComponent(".complete"), options: .atomic)
            let finalDir = root.appendingPathComponent(dirName(man.version), isDirectory: true)
            if let k = keep, dirName(k) == finalDir.lastPathComponent { // ne jamais effacer le dossier servi
                try? fm.removeItem(at: staging)
                return "uptodate"
            }
            try? fm.removeItem(at: finalDir)
            try fm.moveItem(at: staging, to: finalDir)
        } catch {
            try? fm.removeItem(at: staging)
            return "error"
        }
        return "pending:" + man.version
    }

    /// Garde au plus les versions utiles (celle qui tourne, l'active, l'attente) : 2 en temps normal.
    static func purge(keep: [String]) {
        guard !checking, let root = rootDir(),
              let names = try? FileManager.default.contentsOfDirectory(atPath: root.path) else { return }
        let keepNames = Set(keep.map { LiveUpdateStore.dirName($0) })
        for n in names where !keepNames.contains(n) && n != ".tmp" {
            try? FileManager.default.removeItem(at: root.appendingPathComponent(n))
        }
    }

    // MARK: Réseau (HTTPS, pianochallenges.com seulement)

    private static let session: URLSession = {
        let c = URLSessionConfiguration.ephemeral
        c.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        c.urlCache = nil
        c.timeoutIntervalForRequest = 30
        c.timeoutIntervalForResource = 120
        c.waitsForConnectivity = false
        return URLSession(configuration: c)
    }()

    static func siteURL(_ path: String, query: String) -> URL? {
        var c = URLComponents()
        c.scheme = "https"
        c.host = LiveUpdateConfig.host
        c.path = path
        c.queryItems = [URLQueryItem(name: "v", value: query)]
        return c.url
    }

    /// Téléchargement synchrone (appelé seulement depuis la file à part). nil si erreur, code ≠ 200 ou autre domaine.
    private static func fetch(_ url: URL) -> Data? {
        var req = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData, timeoutInterval: 30)
        req.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        let sem = DispatchSemaphore(value: 0)
        var out: Data?
        let task = session.dataTask(with: req) { data, response, error in
            if error == nil, let d = data, let http = response as? HTTPURLResponse, http.statusCode == 200,
               http.url?.scheme == "https", http.url?.host == LiveUpdateConfig.host {
                out = d
            }
            sem.signal()
        }
        task.resume()
        if sem.wait(timeout: .now() + 150) == .timedOut {
            task.cancel()
            return nil
        }
        return out
    }

    static func sha256Hex(_ data: Data) -> String {
        return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }
}

/// Pont avec la page. JS name: `LiveUpdate`
///   ready() -> info   la page a démarré (à appeler une fois) ; confirme une nouvelle version
///   info() -> { version, embedded, source: "live"|"embedded", pending?, native, trial, checking, lastCheck }
///   check() -> { status }   vérifie tout de suite (sans attendre l'heure)
///   reset()                 revient à la version embarquée et recharge la page
@objc(LiveUpdatePlugin)
public class LiveUpdatePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveUpdatePlugin"
    public let jsName = "LiveUpdate"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "ready", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "info", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "check", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reset", returnType: CAPPluginReturnPromise)
    ]

    private var readyTimer: Timer?
    private var gotReady = false

    override public func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(appDidBecomeActive),
                                               name: UIApplication.didBecomeActiveNotification, object: nil)
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if LiveUpdateStore.runningIsTrial { self.armReadyTimer(LiveUpdateConfig.readyTimeout) }
            // filet : une page qui n'appelle pas ready (version embarquée ancienne) vérifie quand même
            DispatchQueue.main.asyncAfter(deadline: .now() + 60) { [weak self] in
                guard let self = self, !self.gotReady else { return }
                LiveUpdateStore.check(force: false) { _ in }
            }
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
        readyTimer?.invalidate()
    }

    private func armReadyTimer(_ delay: TimeInterval) {
        readyTimer?.invalidate()
        readyTimer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            self?.readyTimedOut()
        }
    }

    private func readyTimedOut() {
        readyTimer = nil
        guard LiveUpdateStore.runningIsTrial, !gotReady else { return }
        // app en arrière-plan : la page n'a pas pu démarrer, on attend le retour
        if UIApplication.shared.applicationState != .active {
            armReadyTimer(10)
            return
        }
        CAPLog.print("⚡️  LiveUpdate: no ready() from \(LiveUpdateStore.running ?? "?"), going back")
        guard let target = LiveUpdateStore.rollback(),
              let vc = bridge?.viewController as? CAPBridgeViewController else { return }
        vc.setServerBasePath(path: target.path)
    }

    @objc private func appDidBecomeActive() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if LiveUpdateStore.runningIsTrial && !self.gotReady {
                self.armReadyTimer(15) // laisser à la page le temps de reprendre
                return
            }
            guard self.gotReady else { return } // au lancement : la vérification suit ready()
            LiveUpdateStore.check(force: false) { _ in }
        }
    }

    @objc func ready(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.gotReady = true
            self?.readyTimer?.invalidate()
            self?.readyTimer = nil
            LiveUpdateStore.confirmRunning()
            let st = LiveState.load()
            LiveUpdateStore.purge(keep: [LiveUpdateStore.running, st.active, st.pending].compactMap { $0 }) // anciennes versions
            call.resolve(LiveUpdateStore.info())
            // vérifier après le démarrage, sans le ralentir
            DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                LiveUpdateStore.check(force: false) { status in self?.notifyPending(status) }
            }
        }
    }

    @objc func info(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(LiveUpdateStore.info())
        }
    }

    @objc func check(_ call: CAPPluginCall) {
        LiveUpdateStore.check(force: true) { [weak self] status in
            self?.notifyPending(status)
            call.resolve(["status": status])
        }
    }

    @objc func reset(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.readyTimer?.invalidate()
            self?.readyTimer = nil
            let target = LiveUpdateStore.reset()
            call.resolve(["version": LiveUpdateStore.embeddedVersion()])
            guard let path = target?.path else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
                (self?.bridge?.viewController as? CAPBridgeViewController)?.setServerBasePath(path: path)
                LiveUpdateStore.purge(keep: [])
            }
        }
    }

    private func notifyPending(_ status: String) {
        guard status.hasPrefix("pending:") else { return }
        notifyListeners("pending", data: ["version": String(status.dropFirst("pending:".count))])
    }
}

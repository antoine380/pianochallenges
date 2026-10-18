import Foundation
import UIKit
import Capacitor
import AuthenticationServices

/// Google / Apple / Facebook sign-in for Piano Challenges.
/// Google refuses sign-in inside an embedded web view, so the app opens the system sign-in sheet
/// (ASWebAuthenticationSession) and hands the page back the "pianochallenges://auth?code=…" address.
///
/// JS name: `Auth`
///   start({ url, scheme }) -> { url }
@objc(Auth)
public class AuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "AuthPlugin"
    public let jsName = "Auth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise)
    ]

    private var session: ASWebAuthenticationSession?

    @objc func start(_ call: CAPPluginCall) {
        guard let address = call.getString("url"), let url = URL(string: address) else {
            call.reject("Missing sign-in address")
            return
        }
        let scheme = call.getString("scheme") ?? "pianochallenges"
        DispatchQueue.main.async {
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { [weak self] callbackURL, error in
                self?.session = nil
                if let callbackURL = callbackURL {
                    call.resolve(["url": callbackURL.absoluteString])
                } else {
                    call.reject(error?.localizedDescription ?? "cancelled", "CANCELLED")
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self.session = session
            if !session.start() {
                self.session = nil
                call.reject("Could not open the sign-in window")
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}

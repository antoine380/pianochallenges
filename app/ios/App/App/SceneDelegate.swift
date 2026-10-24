import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // Info.plist names Main.storyboard for this scene (UISceneStoryboardFile), whose root is MainViewController:
        // UIKit has then already created the window and ONE bridge. Creating a second window and controller here
        // gave the app two Capacitor bridges (the plugins and native events could end up on the discarded one,
        // and MIDI vanished from the app). Only build the window ourselves when no storyboard did it.
        if window == nil {
            window = UIWindow(windowScene: windowScene)
            window?.rootViewController = MainViewController()
        }
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

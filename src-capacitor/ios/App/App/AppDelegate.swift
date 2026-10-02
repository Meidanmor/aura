import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    /// Firebase is set up only when GoogleService-Info.plist was bundled
    /// (it's kept out of git; CI adds it from a secret). Without it, push
    /// registration hands the plain APNs token to the app, as before.
    private var firebaseConfigured = false

    #if DEBUG
    /// Debug builds launched with `-PushSelfTest` (the CI simulator run)
    /// register for remote notifications right away — no permission prompt is
    /// needed for that — and log each step, without involving the web app.
    private let pushSelfTest = ProcessInfo.processInfo.arguments.contains("-PushSelfTest")
    private func selfTestLog(_ message: String) {
        if pushSelfTest { print("[push-selftest] \(message)") }
    }
    #else
    private func selfTestLog(_ message: String) {}
    #endif

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
            FirebaseApp.configure()
            firebaseConfigured = FirebaseApp.app() != nil
        }
        #if DEBUG
        if pushSelfTest {
            let options = FirebaseApp.app()?.options
            selfTestLog("firebase configured: \(firebaseConfigured ? "yes" : "no")"
                + (options.map { ", project \($0.projectID ?? "?"), app bundle \(Bundle.main.bundleIdentifier ?? "?"), plist bundle \($0.bundleID)" } ?? ""))
            application.registerForRemoteNotifications()
        }
        #endif
        return true
    }

    // Hand the registration result to @capacitor/push-notifications. With
    // Firebase, the app's backend sends through Firebase Cloud Messaging, so
    // it needs the FCM token (which Firebase derives from the APNs token), not
    // the APNs token itself.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        selfTestLog("APNs token received (\(deviceToken.count) bytes)")
        guard firebaseConfigured else {
            NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
            return
        }
        Messaging.messaging().apnsToken = deviceToken
        Messaging.messaging().token { token, error in
            if let token = token {
                self.selfTestLog("FCM token received: \(token.prefix(12))… (\(token.count) chars)")
                NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: token)
            } else {
                let error = error ?? NSError(domain: "FirebaseMessaging", code: -1, userInfo: [NSLocalizedDescriptionKey: "No FCM token"])
                self.selfTestLog("FCM token failed: \(error.localizedDescription)")
                NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
            }
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        selfTestLog("APNs registration failed: \(error.localizedDescription)")
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

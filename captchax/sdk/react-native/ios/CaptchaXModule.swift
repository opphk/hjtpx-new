import Foundation
import React

@objc(CaptchaXModule)
class CaptchaXModule: NSObject {

  private var baseUrl: String = "https://captchax.example.com"
  private var timeout: Int = 30000

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func setBaseUrl(_ url: String) {
    baseUrl = url
  }

  @objc
  func setTimeout(_ timeout: Int) {
    self.timeout = timeout
  }

  @objc
  func getCaptcha(_ type: String,
                  resolver resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let url = URL(string: "\(baseUrl)/api/v1/captcha/\(type)") else {
      reject("INVALID_URL", "Invalid base URL", nil)
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.timeoutInterval = TimeInterval(timeout)

    let task = URLSession.shared.dataTask(with: request) { data, response, error in
      if let error = error {
        reject("NETWORK_ERROR", error.localizedDescription, error)
        return
      }

      guard let data = data else {
        reject("NO_DATA", "No data received", nil)
        return
      }

      do {
        let json = try JSONSerialization.jsonObject(with: data, options: [])
        resolve(json)
      } catch {
        reject("PARSE_ERROR", "Failed to parse response", error)
      }
    }

    task.resume()
  }

  @objc
  func verifyCaptcha(_ captchaId: String,
                     captchaType: String,
                     userResponse: NSDictionary,
                     track: NSArray,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let url = URL(string: "\(baseUrl)/api/v1/captcha/\(captchaType)/verify") else {
      reject("INVALID_URL", "Invalid base URL", nil)
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.timeoutInterval = TimeInterval(timeout)

    let body: [String: Any] = [
      "captchaId": captchaId,
      "userResponse": userResponse as! [String: Any],
      "track": track as! [[String: Any]]
    ]

    do {
      request.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
    } catch {
      reject("SERIALIZATION_ERROR", "Failed to serialize request body", error)
      return
    }

    let task = URLSession.shared.dataTask(with: request) { data, response, error in
      if let error = error {
        reject("NETWORK_ERROR", error.localizedDescription, error)
        return
      }

      guard let data = data else {
        reject("NO_DATA", "No data received", nil)
        return
      }

      do {
        let json = try JSONSerialization.jsonObject(with: data, options: [])
        resolve(json)
      } catch {
        reject("PARSE_ERROR", "Failed to parse response", error)
      }
    }

    task.resume()
  }

  @objc
  func trackUserAction(_ x: Double,
                       y: Double,
                       timestamp: Double) -> NSDictionary {
    return [
      "x": x,
      "y": y,
      "timestamp": timestamp
    ]
  }
}

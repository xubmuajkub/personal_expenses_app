import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

  override func viewDidLoad() {
    super.viewDidLoad()
    extractSharedText { [weak self] text in
      DispatchQueue.main.async {
        self?.openHostApp(with: text)
      }
    }
  }

  private func extractSharedText(completion: @escaping (String) -> Void) {
    guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
          let attachments = item.attachments else {
      completion("")
      return
    }

    let textType: String
    if #available(iOS 14.0, *) {
      textType = UTType.plainText.identifier
    } else {
      textType = kUTTypePlainText as String
    }

    for provider in attachments {
      if provider.hasItemConformingToTypeIdentifier(textType) {
        provider.loadItem(forTypeIdentifier: textType, options: nil) { data, _ in
          let text = (data as? String) ?? ""
          completion(text)
        }
        return
      }
    }
    completion("")
  }

  private func openHostApp(with text: String) {
    guard let encoded = text.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
          let url = URL(string: "personalexpenses://share?text=\(encoded)") else {
      self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
      return
    }

    var responder: UIResponder? = self
    while let next = responder?.next {
      if let app = next as? UIApplication {
        app.open(url, options: [:], completionHandler: nil)
        break
      }
      responder = next
    }

    extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
  }
}

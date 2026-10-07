import Foundation
import Vision

// macOS's independent decoder, exercised against exported vector modules.
for path in CommandLine.arguments.dropFirst() {
  do {
    let request = VNDetectBarcodesRequest()
    request.symbologies = [.qr]
    try VNImageRequestHandler(url: URL(fileURLWithPath: path)).perform([request])
    guard let payload = request.results?.first?.payloadStringValue else {
      fputs("Could not decode \(path)\n", stderr); exit(1)
    }
    print(payload)
  } catch { fputs("QR decoder unavailable: \(error)\n", stderr); exit(1) }
}

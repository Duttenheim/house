/// Convert tour movies to H.264 MP4, and write the first frame as a poster JPEG.
import AppKit
import AVFoundation
import Foundation

struct ConvertError: Error {
  let message: String
}

let root = URL(fileURLWithPath: #filePath)
  .deletingLastPathComponent()
  .deletingLastPathComponent()
let videoDir = root.appendingPathComponent("public/videos")
let imageDir = root.appendingPathComponent("public/images")

func movieFiles() -> [URL] {
  guard let files = try? FileManager.default.contentsOfDirectory(
    at: videoDir,
    includingPropertiesForKeys: nil
  ) else {
    return []
  }
  var seen = Set<String>()
  return files.compactMap { url in
    guard url.pathExtension.lowercased() == "mov" else { return nil }
    let key = url.standardizedFileURL.path
    guard seen.insert(key).inserted else { return nil }
    return url
  }.sorted { $0.lastPathComponent < $1.lastPathComponent }
}

func modified(_ url: URL) -> Date? {
  try? FileManager.default.attributesOfItem(atPath: url.path)[.modificationDate] as? Date
}

func needsConvert(_ source: URL, _ destination: URL) -> Bool {
  guard FileManager.default.fileExists(atPath: destination.path) else { return true }
  guard let sourceDate = modified(source), let destinationDate = modified(destination) else { return true }
  return sourceDate > destinationDate
}

func displaySize(natural: CGSize, transform: CGAffineTransform) -> CGSize {
  let rect = CGRect(origin: .zero, size: natural).applying(transform)
  return CGSize(width: abs(rect.width), height: abs(rect.height))
}

func even(_ value: CGFloat) -> Int {
  let rounded = Int(value.rounded())
  return max(rounded - (rounded % 2), 2)
}

func fitted(_ size: CGSize) -> CGSize {
  let maxEdge: CGFloat = 1920
  let longEdge = max(size.width, size.height)
  let scale = longEdge > maxEdge ? maxEdge / longEdge : 1
  return CGSize(
    width: CGFloat(even(size.width * scale)),
    height: CGFloat(even(size.height * scale))
  )
}

func compositionTransform(natural: CGSize, preferred: CGAffineTransform, render: CGSize) -> CGAffineTransform {
  let rect = CGRect(origin: .zero, size: natural).applying(preferred)
  let upright = preferred.translatedBy(x: -rect.origin.x, y: -rect.origin.y)
  return upright.scaledBy(x: render.width / abs(rect.width), y: render.height / abs(rect.height))
}

final class Once {
  private let lock = NSLock()
  private var done = false

  func run(_ body: () -> Void) {
    lock.lock()
    let first = !done
    done = true
    lock.unlock()
    if first { body() }
  }
}

func transcode(source: URL, destination: URL) async throws {
  let asset = AVURLAsset(url: source)
  guard let track = try await asset.loadTracks(withMediaType: .video).first else {
    throw ConvertError(message: "\(source.lastPathComponent) has no video track")
  }
  let natural = try await track.load(.naturalSize)
  let preferred = try await track.load(.preferredTransform)
  let duration = try await asset.load(.duration)
  let nominal = try await track.load(.nominalFrameRate)
  let render = fitted(displaySize(natural: natural, transform: preferred))
  let fps = nominal > 1 ? nominal : 30

  let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: track)
  layer.setTransform(
    compositionTransform(natural: natural, preferred: preferred, render: render),
    at: .zero
  )
  let instruction = AVMutableVideoCompositionInstruction()
  instruction.timeRange = CMTimeRange(start: .zero, duration: duration)
  instruction.layerInstructions = [layer]

  let composition = AVMutableVideoComposition()
  composition.instructions = [instruction]
  composition.renderSize = render
  composition.frameDuration = CMTime(value: 1, timescale: CMTimeScale(max(1, fps.rounded())))
  composition.colorPrimaries = AVVideoColorPrimaries_ITU_R_709_2
  composition.colorTransferFunction = AVVideoTransferFunction_ITU_R_709_2
  composition.colorYCbCrMatrix = AVVideoYCbCrMatrix_ITU_R_709_2

  let reader = try AVAssetReader(asset: asset)
  let videoOutput = AVAssetReaderVideoCompositionOutput(videoTracks: [track], videoSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange
  ])
  videoOutput.videoComposition = composition
  videoOutput.alwaysCopiesSampleData = false
  guard reader.canAdd(videoOutput) else {
    throw ConvertError(message: "Could not read \(source.lastPathComponent)")
  }
  reader.add(videoOutput)

  let temp = destination.appendingPathExtension("part")
  if FileManager.default.fileExists(atPath: temp.path) {
    try FileManager.default.removeItem(at: temp)
  }
  let writer = try AVAssetWriter(outputURL: temp, fileType: .mp4)
  writer.shouldOptimizeForNetworkUse = true
  let bitrate = max(2_500_000, Int(Double(render.width * render.height) / (1920 * 1080) * 10_000_000))
  let videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: Int(render.width),
    AVVideoHeightKey: Int(render.height),
    AVVideoCompressionPropertiesKey: [
      AVVideoAverageBitRateKey: bitrate,
      AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
      AVVideoExpectedSourceFrameRateKey: Int(fps.rounded()),
      AVVideoMaxKeyFrameIntervalKey: Int(fps.rounded())
    ],
    AVVideoColorPropertiesKey: [
      AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
      AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
      AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2
    ]
  ])
  videoInput.expectsMediaDataInRealTime = false
  guard writer.canAdd(videoInput) else {
    throw ConvertError(message: "Could not write \(destination.lastPathComponent)")
  }
  writer.add(videoInput)

  let keepAudio = source.deletingPathExtension().lastPathComponent.lowercased() != "hero"
  var audioOutput: AVAssetReaderTrackOutput?
  var audioInput: AVAssetWriterInput?
  if keepAudio, let audioTrack = try await asset.loadTracks(withMediaType: .audio).first {
    let output = AVAssetReaderTrackOutput(track: audioTrack, outputSettings: [
      AVFormatIDKey: kAudioFormatLinearPCM,
      AVLinearPCMBitDepthKey: 16,
      AVLinearPCMIsFloatKey: false,
      AVLinearPCMIsBigEndianKey: false,
      AVLinearPCMIsNonInterleaved: false
    ])
    output.alwaysCopiesSampleData = false
    if reader.canAdd(output) {
      reader.add(output)
      audioOutput = output
      var channels = 2
      var sampleRate = 44_100.0
      if let description = try await audioTrack.load(.formatDescriptions).first,
         let basic = CMAudioFormatDescriptionGetStreamBasicDescription(description) {
        channels = max(1, Int(basic.pointee.mChannelsPerFrame))
        if basic.pointee.mSampleRate > 0 { sampleRate = basic.pointee.mSampleRate }
      }
      let input = AVAssetWriterInput(mediaType: .audio, outputSettings: [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVNumberOfChannelsKey: channels,
        AVSampleRateKey: sampleRate,
        AVEncoderBitRateKey: 128_000
      ])
      input.expectsMediaDataInRealTime = false
      if writer.canAdd(input) {
        writer.add(input)
        audioInput = input
      }
    }
  }

  guard reader.startReading() else {
    throw ConvertError(message: reader.error?.localizedDescription ?? "Could not read \(source.lastPathComponent)")
  }
  guard writer.startWriting() else {
    throw ConvertError(message: writer.error?.localizedDescription ?? "Could not write \(destination.lastPathComponent)")
  }
  writer.startSession(atSourceTime: .zero)

  let group = DispatchGroup()
  let videoOnce = Once()
  group.enter()
  videoInput.requestMediaDataWhenReady(on: DispatchQueue(label: "tour-video")) {
    while videoInput.isReadyForMoreMediaData {
      if let sample = videoOutput.copyNextSampleBuffer() {
        if !videoInput.append(sample) {
          reader.cancelReading()
          videoOnce.run {
            videoInput.markAsFinished()
            group.leave()
          }
          return
        }
      } else {
        videoOnce.run {
          videoInput.markAsFinished()
          group.leave()
        }
        return
      }
    }
  }

  if let audioInput, let audioOutput {
    let audioOnce = Once()
    group.enter()
    audioInput.requestMediaDataWhenReady(on: DispatchQueue(label: "tour-audio")) {
      while audioInput.isReadyForMoreMediaData {
        if let sample = audioOutput.copyNextSampleBuffer() {
          if !audioInput.append(sample) {
            audioOnce.run {
              audioInput.markAsFinished()
              group.leave()
            }
            return
          }
        } else {
          audioOnce.run {
            audioInput.markAsFinished()
            group.leave()
          }
          return
        }
      }
    }
  }

  await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
    group.notify(queue: .global()) { continuation.resume() }
  }
  await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
    writer.finishWriting { continuation.resume() }
  }

  if writer.status != .completed || reader.status == .failed {
    try? FileManager.default.removeItem(at: temp)
    let message = writer.error?.localizedDescription
      ?? reader.error?.localizedDescription
      ?? "Could not convert \(source.lastPathComponent)"
    throw ConvertError(message: message)
  }
  if FileManager.default.fileExists(atPath: destination.path) {
    try FileManager.default.removeItem(at: destination)
  }
  try FileManager.default.moveItem(at: temp, to: destination)
  let audioNote = keepAudio ? "" : " without audio"
  print("converted \(source.lastPathComponent) -> \(destination.lastPathComponent) \(Int(render.width))x\(Int(render.height))\(audioNote)")
}

func writePoster(from movie: URL, to destination: URL) async throws {
  let generator = AVAssetImageGenerator(asset: AVURLAsset(url: movie))
  generator.appliesPreferredTrackTransform = true
  generator.requestedTimeToleranceBefore = .zero
  generator.requestedTimeToleranceAfter = .zero
  let (image, _) = try await generator.image(at: .zero)
  let bitmap = NSBitmapImageRep(cgImage: image)
  guard let jpeg = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.82]) else {
    throw ConvertError(message: "Could not encode \(destination.lastPathComponent)")
  }
  try jpeg.write(to: destination)
  print("poster \(destination.lastPathComponent) \(image.width)x\(image.height)")
}

func run() async throws {
  var isDirectory: ObjCBool = false
  guard FileManager.default.fileExists(atPath: videoDir.path, isDirectory: &isDirectory), isDirectory.boolValue else {
    throw ConvertError(message: "No video directory at \(videoDir.path)")
  }
  let movies = movieFiles()
  if movies.isEmpty {
    print("No tour movies to convert")
    return
  }
  for source in movies {
    let mp4 = source.deletingPathExtension().appendingPathExtension("mp4")
    let poster = imageDir
      .appendingPathComponent(source.deletingPathExtension().lastPathComponent)
      .appendingPathExtension("jpg")
    if needsConvert(source, mp4) {
      try await transcode(source: source, destination: mp4)
    } else {
      print("up to date \(mp4.lastPathComponent)")
    }
    if needsConvert(source, poster) {
      try await writePoster(from: mp4, to: poster)
    } else {
      print("up to date \(poster.lastPathComponent)")
    }
  }
}

do {
  try await run()
} catch let error as ConvertError {
  fputs("\(error.message)\n", stderr)
  exit(1)
} catch {
  fputs("\(error.localizedDescription)\n", stderr)
  exit(1)
}

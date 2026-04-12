import UIKit
import MapKit

// MARK: - Cluster annotation view (CoreGraphics-rendered, no UILabel/AutoLayout)

final class ChurchClusterView: MKAnnotationView {

    static let reuseID = "ChurchCluster"

    private let goldColor = UIColor(named: "Gold") ?? UIColor(red: 0.82, green: 0.68, blue: 0.21, alpha: 1)

    // Pre-rendered badge layer
    private let badgeLayer = CALayer()
    // Outer halo layers
    private let outerHalo = CAShapeLayer()
    private let middleHalo = CAShapeLayer()
    // Open-now indicator ring
    private let openRingLayer = CAShapeLayer()

    override init(annotation: MKAnnotation?, reuseIdentifier: String?) {
        super.init(annotation: annotation, reuseIdentifier: reuseIdentifier)
        collisionMode = .circle
        displayPriority = .defaultHigh
        setupLayers()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError() }

    // MARK: - Setup

    private func setupLayers() {
        backgroundColor = .clear

        layer.addSublayer(outerHalo)
        layer.addSublayer(middleHalo)
        layer.addSublayer(openRingLayer)
        layer.addSublayer(badgeLayer)

        outerHalo.fillColor = goldColor.withAlphaComponent(0.08).cgColor
        middleHalo.fillColor = goldColor.withAlphaComponent(0.15).cgColor
        openRingLayer.fillColor = UIColor.clear.cgColor
        openRingLayer.lineWidth = 2.5
    }

    // MARK: - Display

    override func prepareForDisplay() {
        super.prepareForDisplay()
        guard let cluster = annotation as? MKClusterAnnotation else { return }

        let count = cluster.memberAnnotations.count
        let openCount = cluster.memberAnnotations.compactMap { $0 as? ChurchAnnotation }.filter(\.isOpenNow).count

        configure(count: count, openCount: openCount)
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        badgeLayer.contents = nil
        outerHalo.opacity = 0
        middleHalo.opacity = 0
        openRingLayer.opacity = 0
        layer.removeAllAnimations()
    }

    // MARK: - Configuration

    private func configure(count: Int, openCount: Int) {
        let coreSize = Self.coreSize(for: count)
        let outerSize = coreSize + 28
        let middleSize = coreSize + 14

        // Frame
        let frameSize = outerSize + 8
        frame = CGRect(x: 0, y: 0, width: frameSize, height: frameSize)
        centerOffset = .zero

        let center = CGPoint(x: frameSize / 2, y: frameSize / 2)

        // Halos (only for clusters >= 5)
        if count >= 5 {
            outerHalo.path = UIBezierPath(ovalIn: CGRect(
                x: center.x - outerSize / 2, y: center.y - outerSize / 2,
                width: outerSize, height: outerSize
            )).cgPath
            outerHalo.opacity = 1

            middleHalo.path = UIBezierPath(ovalIn: CGRect(
                x: center.x - middleSize / 2, y: center.y - middleSize / 2,
                width: middleSize, height: middleSize
            )).cgPath
            middleHalo.opacity = 1
        } else {
            outerHalo.opacity = 0
            middleHalo.opacity = 0
        }

        // Open-now ring
        if openCount > 0 {
            let ringSize = coreSize + 6
            let ringPath = UIBezierPath(ovalIn: CGRect(
                x: center.x - ringSize / 2, y: center.y - ringSize / 2,
                width: ringSize, height: ringSize
            ))
            openRingLayer.path = ringPath.cgPath
            openRingLayer.strokeColor = UIColor.systemGreen.cgColor
            openRingLayer.opacity = 1
            animateOpenRing()
        } else {
            openRingLayer.opacity = 0
            openRingLayer.removeAllAnimations()
        }

        // Render badge bitmap
        let badgeImage = renderBadge(size: coreSize, count: count, openCount: openCount)
        badgeLayer.contents = badgeImage.cgImage
        badgeLayer.contentsScale = UIScreen.main.scale
        badgeLayer.frame = CGRect(
            x: center.x - coreSize / 2, y: center.y - coreSize / 2,
            width: coreSize, height: coreSize
        )

        // Shadow on badge
        let shadowPath = UIBezierPath(ovalIn: badgeLayer.bounds)
        badgeLayer.shadowPath = shadowPath.cgPath
        badgeLayer.shadowColor = goldColor.cgColor
        badgeLayer.shadowOpacity = 0.3
        badgeLayer.shadowOffset = CGSize(width: 0, height: 3)
        badgeLayer.shadowRadius = 6

        // Appear animation (suppress during initial entrance wait)
        if ChurchAnnotationView.waitingForEntrance {
            transform = CGAffineTransform(scaleX: 0.01, y: 0.01)
            alpha = 0
        } else {
            animateAppear()
        }
    }

    // MARK: - CoreGraphics badge rendering

    private func renderBadge(size: CGFloat, count: Int, openCount: Int) -> UIImage {
        let scale = UIScreen.main.scale
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: size, height: size))

        return renderer.image { ctx in
            let gc = ctx.cgContext
            let rect = CGRect(x: 0, y: 0, width: size, height: size)

            // Gradient circle fill
            gc.saveGState()
            gc.addEllipse(in: rect)
            gc.clip()

            let colors = [
                goldColor.withAlphaComponent(0.55).cgColor,
                goldColor.withAlphaComponent(0.35).cgColor
            ] as CFArray
            let colorSpace = CGColorSpaceCreateDeviceRGB()
            if let gradient = CGGradient(colorsSpace: colorSpace, colors: colors, locations: [0, 1]) {
                gc.drawLinearGradient(gradient, start: .zero, end: CGPoint(x: size, y: size), options: [])
            }
            gc.restoreGState()

            // Border stroke
            gc.setStrokeColor(goldColor.withAlphaComponent(0.4).cgColor)
            gc.setLineWidth(1.5)
            gc.strokeEllipse(in: rect.insetBy(dx: 0.75, dy: 0.75))

            // Count text — CoreGraphics text rendering (no UILabel)
            let countStr = "\(count)" as NSString
            let fontSize = Self.fontSize(for: count)
            let font = UIFont.systemFont(ofSize: fontSize, weight: .heavy).rounded()

            let attrs: [NSAttributedString.Key: Any] = [
                .font: font,
                .foregroundColor: UIColor.white
            ]
            let textSize = countStr.size(withAttributes: attrs)
            let textRect = CGRect(
                x: (size - textSize.width) / 2,
                y: (size - textSize.height) / 2,
                width: textSize.width,
                height: textSize.height
            )

            // Text shadow
            gc.saveGState()
            gc.setShadow(offset: CGSize(width: 0, height: 1), blur: 2, color: UIColor.black.withAlphaComponent(0.3).cgColor)
            countStr.draw(in: textRect, withAttributes: attrs)
            gc.restoreGState()

            // Mini crosses around edge
            let crossCount = min(count, 4)
            if crossCount > 0 {
                let crossSize: CGFloat = 7
                let radius = size / 2 + 2
                let config = UIImage.SymbolConfiguration(pointSize: crossSize, weight: .bold)
                let crossImage = UIImage(systemName: "cross.fill", withConfiguration: config)?
                    .withTintColor(.white.withAlphaComponent(0.85), renderingMode: .alwaysOriginal)

                for i in 0..<crossCount {
                    let angle = (2 * .pi / Double(crossCount)) * Double(i) - .pi / 2
                    let cx = size / 2 + cos(angle) * radius
                    let cy = size / 2 + sin(angle) * radius
                    let dotRect = CGRect(x: cx - 8, y: cy - 8, width: 16, height: 16)

                    // Mini dot background
                    gc.setFillColor(goldColor.cgColor)
                    gc.fillEllipse(in: dotRect)

                    // Cross icon
                    crossImage?.draw(in: CGRect(
                        x: cx - crossSize / 2, y: cy - crossSize / 2,
                        width: crossSize, height: crossSize
                    ))
                }
            }
        }
    }

    // MARK: - Sizing

    static func coreSize(for count: Int) -> CGFloat {
        switch count {
        case ..<5:   return 38
        case ..<15:  return 44
        case ..<50:  return 50
        case ..<100: return 56
        default:     return 62
        }
    }

    private static func fontSize(for count: Int) -> CGFloat {
        switch count {
        case ..<10:  return 14
        case ..<100: return 15
        default:     return 14
        }
    }

    // MARK: - Animations

    private func animateAppear() {
        // Elastic scale-in (cluster merge)
        let spring = CASpringAnimation(keyPath: "transform.scale")
        spring.fromValue = 0.3
        spring.toValue = 1.0
        spring.damping = 10
        spring.stiffness = 200
        spring.mass = 0.8
        spring.duration = spring.settlingDuration
        layer.add(spring, forKey: "appear")

        // Fade in
        let fade = CABasicAnimation(keyPath: "opacity")
        fade.fromValue = 0
        fade.toValue = 1
        fade.duration = 0.2
        layer.add(fade, forKey: "fadeIn")
    }

    /// Animate dissolve when cluster expands on zoom-in.
    func animateDissolve(completion: (() -> Void)? = nil) {
        CATransaction.begin()
        CATransaction.setCompletionBlock(completion)

        // Elastic expansion
        let expand = CASpringAnimation(keyPath: "transform.scale")
        expand.fromValue = 1.0
        expand.toValue = 1.4
        expand.damping = 12
        expand.stiffness = 180
        expand.mass = 0.6
        expand.duration = expand.settlingDuration
        expand.isRemovedOnCompletion = false
        expand.fillMode = .forwards

        // Opacity fade out
        let fade = CABasicAnimation(keyPath: "opacity")
        fade.fromValue = 1.0
        fade.toValue = 0.0
        fade.duration = 0.25
        fade.isRemovedOnCompletion = false
        fade.fillMode = .forwards

        layer.add(expand, forKey: "dissolveScale")
        layer.add(fade, forKey: "dissolveFade")

        CATransaction.commit()
    }

    /// Parallax micro-offset during cluster expansion.
    func applyParallaxOffset(dx: CGFloat, dy: CGFloat, animated: Bool = true) {
        let offset = CGPoint(x: centerOffset.x + dx, y: centerOffset.y + dy)
        if animated {
            CATransaction.begin()
            CATransaction.setAnimationDuration(0.15)
            centerOffset = offset
            CATransaction.commit()
        } else {
            centerOffset = offset
        }
    }

    private func animateOpenRing() {
        // Pulsing stroke opacity
        let pulse = CABasicAnimation(keyPath: "opacity")
        pulse.fromValue = 1.0
        pulse.toValue = 0.4
        pulse.duration = 1.0
        pulse.autoreverses = true
        pulse.repeatCount = .infinity
        pulse.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        openRingLayer.add(pulse, forKey: "openPulse")
    }
}

// MARK: - UIFont rounded helper

private extension UIFont {
    func rounded() -> UIFont {
        guard let descriptor = fontDescriptor.withDesign(.rounded) else { return self }
        return UIFont(descriptor: descriptor, size: pointSize)
    }
}

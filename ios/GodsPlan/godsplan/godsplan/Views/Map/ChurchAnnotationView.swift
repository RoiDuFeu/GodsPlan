import UIKit
import MapKit

// MARK: - Church annotation view (glass-style circular marker, CALayer-based)

final class ChurchAnnotationView: MKAnnotationView {

    static let reuseID = "ChurchAnnotation"

    // Layers
    private let glassLayer = CAShapeLayer()
    private let borderLayer = CAShapeLayer()
    private let iconLayer = CALayer()
    private let shadowLayer = CAShapeLayer()
    private let pulseLayer = CAShapeLayer()
    private let openDotLayer = CAShapeLayer()

    // Sizing
    private let markerRadius: CGFloat = 16
    private let selectedMarkerRadius: CGFloat = 20

    // Colors
    private let goldColor = UIColor(named: "Gold") ?? UIColor(red: 0.82, green: 0.68, blue: 0.21, alpha: 1)

    // State
    private var currentChurchType: ChurchType = .parish

    /// Shared flag: when true, annotation views start hidden (scale 0 + alpha 0)
    /// and wait for the controller to trigger the entrance animation after splash.
    static var waitingForEntrance = true

    override init(annotation: MKAnnotation?, reuseIdentifier: String?) {
        super.init(annotation: annotation, reuseIdentifier: reuseIdentifier)
        collisionMode = .circle
        clusteringIdentifier = nil
        setupLayers()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError() }

    // MARK: - Layer setup

    private func setupLayers() {
        let size = (selectedMarkerRadius + 8) * 2
        frame = CGRect(x: 0, y: 0, width: size, height: size)
        centerOffset = .zero
        backgroundColor = .clear

        // Shadow layer (below everything)
        shadowLayer.fillColor = UIColor.black.withAlphaComponent(0.25).cgColor
        shadowLayer.strokeColor = nil
        layer.addSublayer(shadowLayer)

        // Pulse ring (hidden by default)
        pulseLayer.fillColor = goldColor.withAlphaComponent(0.18).cgColor
        pulseLayer.strokeColor = nil
        pulseLayer.opacity = 0
        layer.addSublayer(pulseLayer)

        // Glass body circle
        glassLayer.strokeColor = nil
        layer.addSublayer(glassLayer)

        // Thin border stroke
        borderLayer.fillColor = UIColor.clear.cgColor
        borderLayer.lineWidth = 1.0
        layer.addSublayer(borderLayer)

        // Icon (rendered as bitmap)
        iconLayer.contentsGravity = .center
        iconLayer.contentsScale = UIScreen.main.scale
        layer.addSublayer(iconLayer)

        // Open-now dot indicator
        openDotLayer.opacity = 0
        layer.addSublayer(openDotLayer)

        renderNormal()
    }

    // MARK: - Configuration on reuse

    override func prepareForReuse() {
        super.prepareForReuse()
        pulseLayer.removeAllAnimations()
        pulseLayer.opacity = 0
        openDotLayer.opacity = 0
        if !Self.waitingForEntrance {
            transform = .identity
            alpha = 1
        }
        renderNormal()
    }

    override func prepareForDisplay() {
        super.prepareForDisplay()
        guard let church = annotation as? ChurchAnnotation else { return }

        currentChurchType = church.churchType
        displayPriority = church.churchType.displayPriority
        clusteringIdentifier = nil

        if church.isOpenNow {
            renderOpenDot()
        } else {
            openDotLayer.opacity = 0
        }

        if isSelected {
            renderSelected()
            startPulse()
        } else {
            renderNormal()
        }

        // Keep hidden until entrance animation is triggered
        if Self.waitingForEntrance {
            transform = CGAffineTransform(scaleX: 0.01, y: 0.01)
            alpha = 0
        }
    }

    override func setSelected(_ selected: Bool, animated: Bool) {
        super.setSelected(selected, animated: animated)

        if animated {
            CATransaction.begin()
            CATransaction.setAnimationDuration(0.25)
            CATransaction.setAnimationTimingFunction(CAMediaTimingFunction(name: .easeInEaseOut))
        }

        if selected {
            renderSelected()
            startPulse()
            if animated { animateSpringScale() }
        } else {
            renderNormal()
            stopPulse()
        }

        if animated {
            CATransaction.commit()
        }
    }

    // MARK: - Normal state (glass-style circle)

    private func renderNormal() {
        guard bounds.width > 0, bounds.height > 0 else { return }
        let r = markerRadius
        let cx = bounds.midX
        let cy = bounds.midY

        // Glass body
        let circlePath = UIBezierPath(ovalIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2))
        glassLayer.path = circlePath.cgPath
        glassLayer.fillColor = fillColor(for: currentChurchType, selected: false).cgColor

        // Border
        borderLayer.path = circlePath.cgPath
        borderLayer.strokeColor = UIColor.white.withAlphaComponent(0.6).cgColor

        // Shadow (offset toward bottom)
        let shadowPath = UIBezierPath(ovalIn: CGRect(x: cx - r + 1, y: cy - r + 3, width: r * 2, height: r * 2))
        shadowLayer.path = shadowPath.cgPath
        shadowLayer.fillColor = UIColor.black.withAlphaComponent(0.15).cgColor

        // Icon
        renderIcon(size: 10, color: iconColor(selected: false), center: CGPoint(x: cx, y: cy))

        centerOffset = .zero
    }

    // MARK: - Selected state

    private func renderSelected() {
        guard bounds.width > 0, bounds.height > 0 else { return }
        let r = selectedMarkerRadius
        let cx = bounds.midX
        let cy = bounds.midY

        let circlePath = UIBezierPath(ovalIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2))
        glassLayer.path = circlePath.cgPath
        glassLayer.fillColor = goldColor.cgColor

        borderLayer.path = circlePath.cgPath
        borderLayer.strokeColor = UIColor.white.withAlphaComponent(0.8).cgColor

        // Shadow — gold glow
        let shadowPath = UIBezierPath(ovalIn: CGRect(x: cx - r + 1, y: cy - r + 3, width: r * 2, height: r * 2))
        shadowLayer.path = shadowPath.cgPath
        shadowLayer.fillColor = goldColor.withAlphaComponent(0.3).cgColor

        // Pulse ring
        let pulseSize: CGFloat = r * 2.6
        let pulsePath = UIBezierPath(ovalIn: CGRect(
            x: cx - pulseSize / 2, y: cy - pulseSize / 2,
            width: pulseSize, height: pulseSize
        ))
        pulseLayer.path = pulsePath.cgPath

        renderIcon(size: 13, color: .white, center: CGPoint(x: cx, y: cy))

        centerOffset = .zero
    }

    // MARK: - Fill color by church type

    private func fillColor(for type: ChurchType, selected: Bool) -> UIColor {
        if selected { return goldColor }
        switch type {
        case .cathedral: return UIColor(white: 1.0, alpha: 0.95)
        case .basilica:  return UIColor(white: 0.97, alpha: 0.95)
        case .parish:    return UIColor(white: 0.95, alpha: 0.92)
        case .chapel:    return UIColor(white: 0.93, alpha: 0.88)
        }
    }

    private func iconColor(selected: Bool) -> UIColor {
        selected ? .white : goldColor
    }

    // MARK: - Open-now dot

    private func renderOpenDot() {
        let dotSize: CGFloat = 8
        let cx = bounds.midX + markerRadius - 2
        let cy = bounds.midY - markerRadius + 2
        let dotPath = UIBezierPath(ovalIn: CGRect(x: cx - dotSize / 2, y: cy - dotSize / 2, width: dotSize, height: dotSize))
        openDotLayer.path = dotPath.cgPath
        openDotLayer.fillColor = UIColor.systemGreen.cgColor
        openDotLayer.strokeColor = UIColor.white.cgColor
        openDotLayer.lineWidth = 1.5
        openDotLayer.opacity = 1
    }

    // MARK: - Icon rendering via CoreGraphics

    private func renderIcon(size: CGFloat, color: UIColor, center: CGPoint) {
        let imgSize = CGSize(width: size * 2, height: size * 2)
        let renderer = UIGraphicsImageRenderer(size: imgSize)
        let image = renderer.image { _ in
            let config = UIImage.SymbolConfiguration(pointSize: size, weight: .bold)
            if let symbol = UIImage(systemName: "cross.fill", withConfiguration: config)?
                .withTintColor(color, renderingMode: .alwaysOriginal) {
                let rect = CGRect(
                    x: (imgSize.width - symbol.size.width) / 2,
                    y: (imgSize.height - symbol.size.height) / 2,
                    width: symbol.size.width,
                    height: symbol.size.height
                )
                symbol.draw(in: rect)
            }
        }
        iconLayer.contents = image.cgImage
        iconLayer.frame = CGRect(x: center.x - size, y: center.y - size, width: size * 2, height: size * 2)
    }

    // MARK: - Pulse animation

    private func startPulse() {
        pulseLayer.opacity = 1
        let scaleAnim = CABasicAnimation(keyPath: "transform.scale")
        scaleAnim.fromValue = 1.0
        scaleAnim.toValue = 1.3

        let opacityAnim = CABasicAnimation(keyPath: "opacity")
        opacityAnim.fromValue = 1.0
        opacityAnim.toValue = 0.0

        let group = CAAnimationGroup()
        group.animations = [scaleAnim, opacityAnim]
        group.duration = 1.2
        group.repeatCount = .infinity
        group.timingFunction = CAMediaTimingFunction(name: .easeOut)
        pulseLayer.add(group, forKey: "pulse")
    }

    private func stopPulse() {
        pulseLayer.removeAnimation(forKey: "pulse")
        pulseLayer.opacity = 0
    }

    // MARK: - Spring scale animation

    private func animateSpringScale() {
        let anim = CASpringAnimation(keyPath: "transform.scale")
        anim.fromValue = 0.8
        anim.toValue = 1.0
        anim.damping = 8
        anim.stiffness = 300
        anim.mass = 0.6
        anim.duration = anim.settlingDuration
        layer.add(anim, forKey: "springScale")
    }
}

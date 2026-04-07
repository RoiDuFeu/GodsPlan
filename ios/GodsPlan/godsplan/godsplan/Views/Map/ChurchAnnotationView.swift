import SwiftUI

struct ChurchAnnotationView: View {
    let isSelected: Bool
    @State private var pulse = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Pulse ring when selected
            if isSelected {
                Circle()
                    .fill(Color("Gold").opacity(0.18))
                    .frame(width: 52, height: 52)
                    .scaleEffect(pulse ? 1.3 : 1.0)
                    .opacity(pulse ? 0 : 1)
                    .animation(.easeOut(duration: 1.2).repeatForever(autoreverses: false), value: pulse)
                    .onAppear { pulse = true }
                    .offset(y: -14)
            }

            VStack(spacing: 0) {
                // Pin head
                ZStack {
                    Circle()
                        .fill(isSelected
                              ? LinearGradient(colors: [Color("Gold"), Color("Gold").opacity(0.75)], startPoint: .topLeading, endPoint: .bottomTrailing)
                              : LinearGradient(colors: [.white, Color(.systemGray6)], startPoint: .topLeading, endPoint: .bottomTrailing))
                        .frame(width: isSelected ? 36 : 28, height: isSelected ? 36 : 28)
                        .shadow(color: isSelected ? Color("Gold").opacity(0.5) : .black.opacity(0.2),
                                radius: isSelected ? 8 : 4,
                                y: isSelected ? 3 : 2)

                    Image(systemName: "cross.fill")
                        .font(.system(size: isSelected ? 14 : 11, weight: .bold))
                        .foregroundStyle(isSelected ? .white : Color("Gold"))
                }

                // Pin tail
                Triangle()
                    .fill(isSelected ? Color("Gold") : .white)
                    .frame(width: isSelected ? 12 : 9, height: isSelected ? 8 : 6)
                    .shadow(color: .black.opacity(0.1), radius: 1, y: 1)
            }
        }
        .scaleEffect(isSelected ? 1.15 : 1.0)
        .animation(.spring(response: 0.35, dampingFraction: 0.55), value: isSelected)
    }
}

private struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        Path { p in
            p.move(to: CGPoint(x: rect.midX, y: rect.maxY))
            p.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
            p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
            p.closeSubpath()
        }
    }
}

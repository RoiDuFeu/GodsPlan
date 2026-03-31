import SwiftUI

struct ChurchAnnotationView: View {
    let isSelected: Bool

    var body: some View {
        ZStack {
            if isSelected {
                Circle()
                    .fill(Color("Gold").opacity(0.25))
                    .frame(width: 44, height: 44)
                    .scaleEffect(isSelected ? 1 : 0)
                    .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isSelected)
            }

            ZStack {
                Circle()
                    .fill(isSelected ? Color("Gold") : .white)
                    .frame(width: 28, height: 28)
                    .shadow(color: .black.opacity(0.2), radius: 4, y: 2)

                Image(systemName: "cross.fill")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(isSelected ? .white : Color("Gold"))
            }

            // Pin bottom
            Triangle()
                .fill(isSelected ? Color("Gold") : .white)
                .frame(width: 10, height: 7)
                .offset(y: 17)
                .shadow(color: .black.opacity(0.1), radius: 2, y: 2)
        }
        .scaleEffect(isSelected ? 1.2 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)
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

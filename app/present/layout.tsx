// Minimal layout for the projection display — no nav, no chrome
export default function PresentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {children}
    </div>
  )
}

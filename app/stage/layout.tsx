export default function StageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {children}
    </div>
  )
}

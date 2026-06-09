export default function StageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-black z-[100]">
      {children}
    </div>
  )
}

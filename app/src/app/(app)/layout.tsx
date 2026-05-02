import BottomNav from '@/components/layout/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="bg-orb orb-a" aria-hidden="true" />
      <div className="bg-orb orb-b" aria-hidden="true" />
      <main
        className="mx-auto w-full max-w-md flex-1 overflow-y-auto pb-24"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,249,240,0.94) 100%), ' +
            'repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(238,224,209,0.22) 24px, rgba(238,224,209,0.22) 25px)',
        }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

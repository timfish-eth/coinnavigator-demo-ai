import { Sidebar } from "@/components/app/sidebar"
import { Topbar } from "@/components/app/topbar"

export function AppShell({
  children,
  searchPlaceholder,
}: {
  children: React.ReactNode
  searchPlaceholder?: string
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar placeholder={searchPlaceholder} />
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

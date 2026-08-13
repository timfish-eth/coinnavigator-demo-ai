import { MarketingNav } from "@/components/marketing/nav"
import { CTA, Footer, Hero, HowItWorks, Membership } from "@/components/marketing/sections"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <main>
        <Hero />
        <HowItWorks />
        <Membership />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}

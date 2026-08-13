import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { AuthProvider } from '@/components/auth/auth-context'
import { UpgradeModal } from '@/components/payment/upgrade-modal'
import { PaymentModal } from '@/components/payment/payment-modal'
import { WelcomeToast } from '@/components/auth/welcome-toast'
import { Web3Provider } from '@/components/web3-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CoinNavigator — AI-powered Web3 Research Terminal',
  description:
    'CoinNavigator is an AI-powered Web3 research terminal. Connect your wallet to discover crypto narratives, research projects and generate AI-powered research reports.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#080b12',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-background font-sans antialiased">
        <Web3Provider>
          <AuthProvider>
            {children}
            <UpgradeModal />
            <PaymentModal />
            <WelcomeToast />
          </AuthProvider>
        </Web3Provider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

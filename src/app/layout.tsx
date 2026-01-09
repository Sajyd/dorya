import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dorya.gg'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#000000' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'DORYA! - Electric Wind God Fist Training',
    template: '%s | DORYA!',
  },
  description: 'Master the Electric Wind God Fist (EWGF) with DORYA! - the ultimate online training game. Practice frame-perfect inputs, compete on the global leaderboard, and unlock unique characters and stages inspired by legendary fighting games.',
  keywords: [
    'EWGF',
    'Electric Wind God Fist',
    'Dorya',
    'Tekken',
    'fighting game',
    'training mode',
    'frame data',
    'Mishima',
    'crouch dash',
    'just frame',
    'execution training',
    'fighting game practice',
    'Kazuya',
    'Jin',
    'Devil Jin',
    'Korean backdash',
    'wavedash',
  ],
  authors: [{ name: 'DORYA! Team' }],
  creator: 'DORYA! Team',
  publisher: 'DORYA!',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'DORYA!',
    title: 'DORYA! - Electric Wind God Fist Training',
    description: 'Master the Electric Wind God Fist (EWGF) with DORYA! - the ultimate online training game. Practice frame-perfect inputs and compete globally.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DORYA! - Electric Wind God Fist Training',
    description: 'Master the Electric Wind God Fist (EWGF) with DORYA! - the ultimate online training game. Practice frame-perfect inputs and compete globally.',
    creator: '@doryagg',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  category: 'games',
  classification: 'Fighting Game Training Tool',
  alternates: {
    canonical: siteUrl,
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'DORYA!',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#000000',
  },
}

// JSON-LD Structured Data
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'DORYA!',
  description: 'Master the Electric Wind God Fist (EWGF) with DORYA! - the ultimate online training game for fighting game enthusiasts.',
  url: siteUrl,
  genre: ['Fighting', 'Training', 'Skill Game'],
  gamePlatform: ['Web Browser'],
  applicationCategory: 'Game',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '1000',
    bestRating: '5',
    worstRating: '1',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-black text-white antialiased overflow-hidden">
        {children}
        <Analytics />
      </body>
    </html>
  )
}


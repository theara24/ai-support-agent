import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'Theara AI Support - Smart AI Customer Assistant by Chim Theara',
    template: '%s | Theara AI Support',
  },
  description:
    'A personal full-stack AI customer support platform built by Chim Theara (ជឺម ធារ៉ា). Features smart RAG document search, live human agent handoff, embeddable chat widgets, and Telegram bot integration.',
  keywords: [
    'Chim Theara',
    'ជឺម ធារ៉ា',
    'Theara AI Support',
    'AI Customer Support',
    'Personal AI Project',
    'Khmer AI Support',
    'RAG Knowledge Base',
    'Next.js 14',
    'NestJS',
    'PostgreSQL pgvector',
    'Socket.IO Live Chat',
    'Telegram AI Assistant',
  ],
  authors: [{ name: 'Chim Theara (ជឺម ធារ៉ា)', url: 'https://github.com/theara24' }],
  creator: 'Chim Theara (ជឺម ធារ៉ា)',
  publisher: 'Chim Theara (ជឺម ធារ៉ា)',
  applicationName: 'Theara AI Support Platform',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://theara-ai-support-agent.vercel.app'),
  openGraph: {
    title: 'Theara AI Support - Smart AI Customer Assistant',
    description:
      'A personal full-stack AI customer support project built by Chim Theara (ជឺម ធារ៉ា). Features RAG knowledge search, live human handoff, and website chat widgets.',
    siteName: 'Theara AI Support',
    locale: 'km_KH',
    alternateLocale: ['en_US'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Theara AI Support - Smart AI Customer Assistant',
    description:
      'A modern AI customer support platform built by Chim Theara (ជឺម ធារ៉ា).',
    creator: '@ChimTheara',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:ital,wght@0,100..700;1,100..700&family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans" suppressHydrationWarning>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

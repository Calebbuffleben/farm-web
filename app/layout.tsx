import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from 'next/font/google';
import './globals.css';
import { SwRegister } from './sw-register';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-plex-sans',
});

const plexSerif = IBM_Plex_Serif({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600'],
  display: 'swap',
  variable: '--font-plex-serif',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: 'Farm — inteligência comercial do agro',
  description:
    'Conversas de WhatsApp da revenda viram fatos comerciais: objeções, riscos, oportunidades e follow-ups por fazenda.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#f4f6f8',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable}`}>
      <body className={plexSans.className}>
        <SwRegister />
        {children}
      </body>
    </html>
  );
}

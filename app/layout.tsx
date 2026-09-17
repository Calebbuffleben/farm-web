import type { Metadata, Viewport } from 'next';
import { Fraunces, IBM_Plex_Mono, Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { SwRegister } from './sw-register';

const sourceSans = Source_Sans_3({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-source',
});

const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-fraunces',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-plex',
});

export const metadata: Metadata = {
  title: 'Farm — inteligência comercial do agro',
  description:
    'Conversas de WhatsApp da revenda viram fatos comerciais: objeções, riscos, oportunidades e follow-ups por fazenda.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#141914',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sourceSans.variable} ${fraunces.variable} ${plexMono.variable}`}>
      <body className={sourceSans.className}>
        <SwRegister />
        {children}
      </body>
    </html>
  );
}

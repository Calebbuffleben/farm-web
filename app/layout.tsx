import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Sora, Syne } from 'next/font/google';
import './globals.css';
import { SwRegister } from './sw-register';

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sora',
});

const syne = Syne({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-syne',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'Farm — inteligência comercial do agro',
  description:
    'Conversas de WhatsApp da revenda viram fatos comerciais: objeções, riscos, oportunidades e follow-ups por fazenda.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#070b10',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sora.variable} ${syne.variable} ${jetbrains.variable}`}>
      <body className={sora.className}>
        <SwRegister />
        {children}
      </body>
    </html>
  );
}

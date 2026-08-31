import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SwRegister } from './sw-register';

export const metadata: Metadata = {
  title: 'Farm — inteligência comercial do agro',
  description:
    'Conversas de WhatsApp da revenda viram fatos comerciais: objeções, riscos, oportunidades e follow-ups por fazenda.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#0f1a14',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <SwRegister />
        {children}
      </body>
    </html>
  );
}

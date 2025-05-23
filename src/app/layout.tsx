import type { ReactNode } from "react";
import { DM_Sans } from 'next/font/google';
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { Web3Providers } from './providers';
import Header from '@/shared/components/Header';

// Configure DM Sans font
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={dmSans.className}>
      <body style={{ margin: 0 }}>
        <Header />
        <Web3Providers>{children}</Web3Providers>
      </body>
    </html>
  );
}

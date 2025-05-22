import type { ReactNode } from "react";
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { Web3Providers } from './providers';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif' }}>
        <Web3Providers>{children}</Web3Providers>
      </body>
    </html>
  );
}

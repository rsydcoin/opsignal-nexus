import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/lib/walletContext';
import ParticleBackground from '@/components/ParticleBackground';

export const metadata: Metadata = {
  title: 'OPSIGNAL NEXUS — Signal Knights DeFi RPG',
  description: 'Forge signals. Scan risk. Conquer yield.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#020818]">
        <WalletProvider>
          <ParticleBackground />
          <div className="relative z-10">
            {children}
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}

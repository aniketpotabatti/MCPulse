import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ServerProvider } from '@/lib/sse';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'MCP Server Health Monitor',
  description:
    'Real-time Datadog-style observability dashboard for MCP servers — track liveness, latency, tool availability, and error rates.',
  keywords: ['MCP', 'monitoring', 'observability', 'health', 'dashboard'],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased min-h-screen flex flex-col">
        <ServerProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
        </ServerProvider>
      </body>
    </html>
  );
}
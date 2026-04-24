import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { ToastProvider } from '@/components/Toast';
import { InstallPrompt } from '@/components/InstallPrompt';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'PayrollAuto';

export const metadata: Metadata = {
  title: companyName + ' Time',
  description: 'Construction timekeeping',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: companyName },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192' }],
    apple: [{ url: '/icons/icon-192.png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#111111',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ToastProvider>
          {children}
          <InstallPrompt />
        </ToastProvider>
      </body>
    </html>
  );
}

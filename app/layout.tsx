import type { Metadata, Viewport } from 'next';
import { GOOGLE_FONTS_HREF } from '@/lib/designs';
import { AuthProvider } from '@/components/AuthProvider';
import { ToastProvider } from '@/components/ui/Toast';
import './globals.css';
import './cv.css';

export const metadata: Metadata = {
  title: { default: 'CV Engine — ATS-friendly CVs, cover letters & LinkedIn makeovers', template: '%s · CV Engine' },
  description:
    'Build ATS-friendly CVs in 468 professional designs, Europass and Canadian formats, cover letters, motivation letters, statements of purpose and LinkedIn makeover images — organised in projects, with an ATS checker and grammar checker built in.',
  applicationName: 'CV Engine',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#2349D3' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={`${GOOGLE_FONTS_HREF}`} />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

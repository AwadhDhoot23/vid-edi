import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vid-Edi — Open-Source AI Video Studio',
  description:
    'Describe edits in plain language. The AI proposes transparent changes on a real timeline. A deterministic media engine renders your video.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-[var(--accent-coral)]/20 selection:text-[var(--accent-coral)]">
        {children}
      </body>
    </html>
  );
}

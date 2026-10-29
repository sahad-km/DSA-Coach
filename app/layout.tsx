import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DSA Coach — Personal Adaptive DSA Coding Platform',
  description:
    'A personal adaptive Data Structures & Algorithms learning platform that dynamically schedules practice, estimates difficulty, and tracks mastery.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}

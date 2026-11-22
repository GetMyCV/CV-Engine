import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Choose your CV template',
  robots: { index: false, follow: false },
};

export default function ChooseLayout({ children }: { children: React.ReactNode }) {
  return children;
}

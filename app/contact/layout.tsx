import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact / Get Started',
  description:
    'Start an Active Credit Relationship with the ONYX fox, or continue to the existing application portal.',
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

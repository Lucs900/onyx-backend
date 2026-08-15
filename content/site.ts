export const site = {
  name: 'ONYX Direct',
  legalName: 'ONYX Direct',
  tagline: 'California residential mortgage. An ongoing credit relationship.',
  description:
    'ONYX Direct is a California residential mortgage company. The ONYX fox is your Active Credit Relationship — an ongoing membership-based advisor for debt, credit, and equity, with rewards after six mortgage payments.',
  floifyUrl: 'https://onyxdirect.floify.com/',
  advisorPath: '/advisor',
} as const;

export const navItems = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

export const contactGoals = [
  'Start an Active Credit Relationship',
  'Purchase a home',
  'Rate/term refinance',
  'Cash-out refinance or HELOC',
  'Understand rewards after six payments',
  'Credit, debt, or equity planning',
  'Something else',
] as const;

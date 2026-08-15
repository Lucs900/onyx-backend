export type Product = {
  slug: string;
  name: string;
  category: string;
  summary: string;
  details: string;
};

export const productCategories = [
  'Home financing',
  'Government programs',
  'Specialty residential',
  'Commercial & private capital',
] as const;

export const products: Product[] = [
  {
    slug: 'purchase',
    name: 'Purchase',
    category: 'Home financing',
    summary: 'Buy a California home with an advisor who stays after closing.',
    details:
      'Whether you are buying a first home or the next one, the fox helps you choose a structure you can live with — then keeps watching credit, debt, and equity so the relationship does not end at funding.',
  },
  {
    slug: 'rate-term-refinance',
    name: 'Rate/Term Refinance',
    category: 'Home financing',
    summary: 'Restructure the loan you already have without taking cash out.',
    details:
      'A rate/term refinance can lower the payment, change the term, or simplify the note. The Active Credit Relationship is about what happens next: staying approval-ready and putting the savings to work on debt or equity goals.',
  },
  {
    slug: 'cash-out-refinance',
    name: 'Cash-Out Refinance',
    category: 'Home financing',
    summary: 'Replace the first mortgage and pull equity in one new loan.',
    details:
      'Cash-out can consolidate high-interest debt or fund a planned use of equity. The fox treats the proceeds as part of a longer credit plan, not a one-time withdrawal.',
  },
  {
    slug: 'heloc',
    name: 'HELOC',
    category: 'Home financing',
    summary: 'A flexible line against home equity, quoted by the same advisor you already know.',
    details:
      'A home equity line of credit can sit behind your first mortgage and be drawn as needed. The existing ONYX Advisor can walk through occupancy, line size, and payment structure. HELOC is one tool inside the broader Active Credit Relationship — not the whole product.',
  },
  {
    slug: 'fha',
    name: 'FHA',
    category: 'Government programs',
    summary: 'A government-backed path that can help more buyers qualify.',
    details:
      'FHA financing is designed for borrowers who need more flexible credit or down-payment room. After closing, the fox still works the same membership loop: payments, rewards, credit strength, and the next decision.',
  },
  {
    slug: 'va',
    name: 'VA',
    category: 'Government programs',
    summary: 'Financing for eligible veterans, service members, and surviving spouses.',
    details:
      'VA loans are a benefit earned through service. ONYX Direct can help eligible California borrowers use that benefit, then keep the credit relationship active so the next move — refinance, equity, or debt — is planned rather than rushed.',
  },
  {
    slug: 'conventional',
    name: 'Conventional',
    category: 'Specialty residential',
    summary: 'Standard agency-eligible financing for purchase or refinance.',
    details:
      'Conventional loans remain the core of many California purchases and refinances. The fox’s job is to keep you in a strong conventional profile over time — credit, debt load, and equity — not only to get one file approved.',
  },
  {
    slug: 'tic',
    name: 'TIC (Tenants in Common)',
    category: 'Specialty residential',
    summary: 'Financing for shared-ownership homes common in parts of California.',
    details:
      'Tenants in common ownership lets multiple parties hold undivided interests in one property. These files need careful structure. The advisor relationship still applies: the loan is the start, and credit and equity management continue after it funds.',
  },
  {
    slug: 'non-qm',
    name: 'Non-QM',
    category: 'Specialty residential',
    summary: 'Options when income or credit does not fit a standard qualified-mortgage box.',
    details:
      'Non-QM programs can use bank statements, asset depletion, or other documentation when W-2 income is not the whole story. The fox helps you understand the tradeoffs and then works to strengthen the file for a future conventional or better-priced option.',
  },
  {
    slug: 'commercial',
    name: 'Commercial',
    category: 'Commercial & private capital',
    summary: 'Financing for investment and business-use real estate.',
    details:
      'Commercial property is underwritten differently from a primary residence. ONYX Direct can discuss commercial scenarios as part of a broader capital conversation, with the same advisor posture: structure the debt, then keep credit and equity visible.',
  },
  {
    slug: 'private-capital',
    name: 'Private Capital / Hard Money',
    category: 'Commercial & private capital',
    summary: 'Including fix & flip and construction — speed and structure when agency credit is not the fit.',
    details:
      'Private capital and hard money can fund acquisitions, fix & flip projects, and construction when timing or property condition sits outside conventional guidelines. These are short, purpose-built facilities. The fox’s longer job is to help you exit into cleaner, cheaper, more durable financing and protect credit along the way.',
  },
];

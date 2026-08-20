export type Product = {
  slug: string;
  name: string;
  description: string;
  bestFor: string;
};

export type ProductGroup = {
  id: string;
  heading: string;
  specialty?: boolean;
  products: Product[];
};

export const PRODUCT_GROUPS: ProductGroup[] = [
  {
    id: "core-residential",
    heading: "Core residential",
    products: [
      {
        slug: "conventional-purchase",
        name: "Conventional Purchase",
        description: "Buy a primary home with a standard loan.",
        bestFor:
          "Buyers with solid credit who want a straightforward purchase path.",
      },
      {
        slug: "conventional-rate-term-refinance",
        name: "Conventional Rate/Term Refinance",
        description:
          "Replace your current mortgage to lower the rate or improve the term.",
        bestFor:
          "Homeowners whose rate or loan structure is no longer working.",
      },
      {
        slug: "conventional-cash-out-refinance",
        name: "Conventional Cash-Out Refinance",
        description: "Refinance and take equity out in one loan.",
        bestFor:
          "Owners who need a larger sum and want to restructure the first mortgage.",
      },
      {
        slug: "jumbo",
        name: "Jumbo",
        description: "Financing above conforming loan limits.",
        bestFor: "Higher-value California purchases and refinances.",
      },
    ],
  },
  {
    id: "government",
    heading: "Government",
    products: [
      {
        slug: "fha",
        name: "FHA",
        description:
          "A more flexible purchase or refinance path with lower down-payment options.",
        bestFor: "Buyers who need more room on credit or down payment.",
      },
      {
        slug: "va",
        name: "VA",
        description:
          "Special financing benefits for eligible veterans and service members.",
        bestFor:
          "Eligible VA buyers and refinancers who want to use their benefit.",
      },
    ],
  },
  {
    id: "equity",
    heading: "Equity",
    products: [
      {
        slug: "heloc-heloan",
        name: "HELOC / HELOAN",
        description:
          "Use your home equity as a line of credit or fixed second loan.",
        bestFor:
          "Owners who want access to equity without replacing the first mortgage.",
      },
    ],
  },
  {
    id: "expanded-residential",
    heading: "Expanded residential",
    products: [
      {
        slug: "non-qm",
        name: "Non-QM",
        description: "Financing outside standard agency guidelines.",
        bestFor: "Self-employed, complex income, or non-standard situations.",
      },
      {
        slug: "investment-second-home",
        name: "Investment / Second Home",
        description: "Financing for rental properties or a second home.",
        bestFor: "Buyers focused on investment or second-home use.",
      },
      {
        slug: "tic",
        name: "TIC (Tenants in Common)",
        description: "Financing structured for TIC ownership.",
        bestFor: "Buyers in TIC arrangements who need a specialized path.",
      },
      {
        slug: "construction",
        name: "Construction",
        description: "Financing for new builds or major construction projects.",
        bestFor:
          "Borrowers building or substantially reconstructing a property.",
      },
    ],
  },
  {
    id: "specialty",
    heading: "Specialty",
    specialty: true,
    products: [
      {
        slug: "private-hard-money",
        name: "Private / Hard Money (Flip & Construction)",
        description:
          "Short-term or specialty capital for flips and faster construction needs.",
        bestFor:
          "Investors who need speed and flexibility more than long-term agency pricing.",
      },
      {
        slug: "commercial",
        name: "Commercial",
        description: "Financing for commercial properties.",
        bestFor: "Investors and owners of commercial real estate.",
      },
    ],
  },
];

export const PRODUCTS = PRODUCT_GROUPS.flatMap((group) => group.products);

export function getProduct(slug: string) {
  return PRODUCTS.find((product) => product.slug === slug);
}

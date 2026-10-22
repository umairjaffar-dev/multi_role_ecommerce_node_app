// Development seed data: realistic categories, products and users for manual testing.
// Prices are whole paisa (Rs 1,499.50 → 149950), exactly like the API.

export type SeedUserType = {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
};

export type SeedCategoryType = {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
};

export type SeedProductType = {
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  priceInPaisa: number;
  stock: number;
  isActive: boolean;
  isDeleted?: boolean;
  imageCount: number;
};

// Passwords follow the register rules (8+ chars, lower, upper, number)
export const SEED_USERS: Array<SeedUserType> = [
  {
    name: "Store Admin",
    email: "admin@shop.test",
    password: "Admin1234",
    role: "admin",
  },
  {
    name: "Ali Khan",
    email: "customer@shop.test",
    password: "Customer1234",
    role: "user",
  },
];

export const SEED_CATEGORIES: Array<SeedCategoryType> = [
  {
    name: "Men's Clothing",
    slug: "mens-clothing",
    description: "Shalwar kameez, kurtas, shirts and more for men.",
    isActive: true,
  },
  {
    name: "Women's Clothing",
    slug: "womens-clothing",
    description: "Lawn suits, kurtis and formal wear.",
    isActive: true,
  },
  {
    name: "Shoes",
    slug: "shoes",
    description: "Sneakers, peshawari chappals and formal shoes.",
    isActive: true,
  },
  {
    name: "Bags & Wallets",
    slug: "bags-wallets",
    description: "Leather wallets, handbags and backpacks.",
    isActive: true,
  },
  {
    name: "Electronics",
    slug: "electronics",
    description: "Earbuds, smartwatches, chargers and accessories.",
    isActive: true,
  },
  {
    name: "Home & Kitchen",
    slug: "home-kitchen",
    description: "Cookware, bedsheets and home decor.",
    isActive: true,
  },
  {
    name: "Watches",
    slug: "watches",
    description: "Analog and digital watches for every occasion.",
    isActive: true,
  },
  {
    name: "Beauty & Care",
    slug: "beauty-care",
    description: "Skincare, fragrances and grooming essentials.",
    isActive: true,
  },
  // Hidden on purpose: its products must NOT appear in the store (tests the category rule)
  {
    name: "Winter Collection (Draft)",
    slug: "winter-collection-draft",
    description: "Upcoming season, not launched yet.",
    isActive: false,
  },
];

export const SEED_PRODUCTS: Array<SeedProductType> = [
  // Men's Clothing
  {
    name: "Classic White Cotton Shalwar Kameez",
    slug: "classic-white-cotton-shalwar-kameez",
    categorySlug: "mens-clothing",
    description: "Breathable 100% cotton, perfect for Jummah and summer days.",
    priceInPaisa: 459900,
    stock: 25,
    isActive: true,
    imageCount: 3,
  },
  {
    name: "Embroidered Black Kurta",
    slug: "embroidered-black-kurta",
    categorySlug: "mens-clothing",
    description: "Wash-and-wear fabric with neck embroidery.",
    priceInPaisa: 329950,
    stock: 12,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "Slim Fit Oxford Shirt",
    slug: "slim-fit-oxford-shirt",
    categorySlug: "mens-clothing",
    description: "Button-down collar, wrinkle resistant.",
    priceInPaisa: 249900,
    stock: 40,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "Waistcoat Charcoal Grey",
    slug: "waistcoat-charcoal-grey",
    categorySlug: "mens-clothing",
    description: "Tailored waistcoat for weddings and events.",
    priceInPaisa: 599900,
    stock: 0,
    isActive: true,
    imageCount: 1,
  },
  {
    name: "Polo T-Shirt Navy",
    slug: "polo-t-shirt-navy",
    categorySlug: "mens-clothing",
    description: "Pique cotton polo with ribbed collar.",
    priceInPaisa: 149900,
    stock: 60,
    isActive: true,
    imageCount: 1,
  },

  // Women's Clothing
  {
    name: "Printed Lawn 3-Piece Suit",
    slug: "printed-lawn-3-piece-suit",
    categorySlug: "womens-clothing",
    description: "Unstitched lawn with chiffon dupatta.",
    priceInPaisa: 699900,
    stock: 18,
    isActive: true,
    imageCount: 3,
  },
  {
    name: "Chikankari Kurti Pink",
    slug: "chikankari-kurti-pink",
    categorySlug: "womens-clothing",
    description: "Hand-embroidered chikankari on soft cotton.",
    priceInPaisa: 389900,
    stock: 9,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "Formal Velvet Shawl",
    slug: "formal-velvet-shawl",
    categorySlug: "womens-clothing",
    description: "Embellished velvet shawl for winter weddings.",
    priceInPaisa: 849950,
    stock: 5,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "Everyday Cotton Kurti",
    slug: "everyday-cotton-kurti",
    categorySlug: "womens-clothing",
    description: "Comfortable straight-cut kurti.",
    priceInPaisa: 189900,
    stock: 0,
    isActive: true,
    imageCount: 1,
  },
  // Hidden product (draft) inside an active category
  {
    name: "Bridal Lehnga (Coming Soon)",
    slug: "bridal-lehnga-coming-soon",
    categorySlug: "womens-clothing",
    description: "Heavy bridal wear, launching next month.",
    priceInPaisa: 24999900,
    stock: 2,
    isActive: false,
    imageCount: 1,
  },

  // Shoes
  {
    name: "Peshawari Chappal Brown",
    slug: "peshawari-chappal-brown",
    categorySlug: "shoes",
    description: "Handmade genuine leather chappal.",
    priceInPaisa: 399900,
    stock: 30,
    isActive: true,
    imageCount: 3,
  },
  {
    name: "Running Sneakers Lite",
    slug: "running-sneakers-lite",
    categorySlug: "shoes",
    description: "Lightweight mesh upper with cushioned sole.",
    priceInPaisa: 549900,
    stock: 22,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "Formal Oxford Shoes Black",
    slug: "formal-oxford-shoes-black",
    categorySlug: "shoes",
    description: "Polished leather for office and events.",
    priceInPaisa: 799900,
    stock: 7,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "Kids Velcro Sneakers",
    slug: "kids-velcro-sneakers",
    categorySlug: "shoes",
    description: "Easy on, easy off, school friendly.",
    priceInPaisa: 219900,
    stock: 0,
    isActive: true,
    imageCount: 1,
  },
  {
    name: "Khussa Golden Embroidered",
    slug: "khussa-golden-embroidered",
    categorySlug: "shoes",
    description: "Traditional khussa with golden tilla work.",
    priceInPaisa: 279950,
    stock: 15,
    isActive: true,
    imageCount: 2,
  },

  // Bags & Wallets
  {
    name: "Leather Bifold Wallet",
    slug: "leather-bifold-wallet",
    categorySlug: "bags-wallets",
    description: "Genuine leather with 6 card slots.",
    priceInPaisa: 179900,
    stock: 50,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "Laptop Backpack 15.6 inch",
    slug: "laptop-backpack-15-6-inch",
    categorySlug: "bags-wallets",
    description: "Water resistant with USB charging port.",
    priceInPaisa: 459900,
    stock: 14,
    isActive: true,
    imageCount: 3,
  },
  {
    name: "Women's Tote Bag Beige",
    slug: "womens-tote-bag-beige",
    categorySlug: "bags-wallets",
    description: "Spacious faux-leather tote.",
    priceInPaisa: 349900,
    stock: 11,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "Travel Duffel Bag",
    slug: "travel-duffel-bag",
    categorySlug: "bags-wallets",
    description: "40L duffel with shoe compartment.",
    priceInPaisa: 529900,
    stock: 6,
    isActive: true,
    imageCount: 1,
  },

  // Electronics
  {
    name: "Wireless Earbuds Pro",
    slug: "wireless-earbuds-pro",
    categorySlug: "electronics",
    description: "Active noise cancellation, 30h battery with case.",
    priceInPaisa: 899900,
    stock: 20,
    isActive: true,
    imageCount: 3,
  },
  {
    name: "Smartwatch Fit 2",
    slug: "smartwatch-fit-2",
    categorySlug: "electronics",
    description: "Heart rate, SpO2 and 7-day battery.",
    priceInPaisa: 1249900,
    stock: 8,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "20W Fast Charger USB-C",
    slug: "20w-fast-charger-usb-c",
    categorySlug: "electronics",
    description: "PD fast charging, compact design.",
    priceInPaisa: 149950,
    stock: 100,
    isActive: true,
    imageCount: 1,
  },
  {
    name: "Power Bank 20000mAh",
    slug: "power-bank-20000mah",
    categorySlug: "electronics",
    description: "Dual output, charges two phones at once.",
    priceInPaisa: 499900,
    stock: 0,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "Bluetooth Speaker Mini",
    slug: "bluetooth-speaker-mini",
    categorySlug: "electronics",
    description: "Portable speaker with deep bass.",
    priceInPaisa: 349900,
    stock: 16,
    isActive: true,
    imageCount: 2,
  },
  // Soft-deleted product (tests the admin "Deleted" filter and restore)
  {
    name: "Wired Earphones (Discontinued)",
    slug: "wired-earphones-discontinued",
    categorySlug: "electronics",
    description: "Old model, no longer sold.",
    priceInPaisa: 49900,
    stock: 3,
    isActive: true,
    isDeleted: true,
    imageCount: 1,
  },

  // Home & Kitchen
  {
    name: "Non-Stick Cookware Set 7pc",
    slug: "non-stick-cookware-set-7pc",
    categorySlug: "home-kitchen",
    description: "Granite coated pots and pans.",
    priceInPaisa: 1599900,
    stock: 4,
    isActive: true,
    imageCount: 3,
  },
  {
    name: "Cotton Bedsheet King Size",
    slug: "cotton-bedsheet-king-size",
    categorySlug: "home-kitchen",
    description: "Pure cotton with 2 pillow covers.",
    priceInPaisa: 399900,
    stock: 19,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "Ceramic Dinner Set 32pc",
    slug: "ceramic-dinner-set-32pc",
    categorySlug: "home-kitchen",
    description: "Microwave safe, elegant floral design.",
    priceInPaisa: 1199900,
    stock: 3,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "Electric Kettle 1.8L",
    slug: "electric-kettle-1-8l",
    categorySlug: "home-kitchen",
    description: "Stainless steel with auto shut-off.",
    priceInPaisa: 329900,
    stock: 21,
    isActive: true,
    imageCount: 1,
  },

  // Watches
  {
    name: "Analog Steel Watch Silver",
    slug: "analog-steel-watch-silver",
    categorySlug: "watches",
    description: "Water resistant 50m, stainless steel strap.",
    priceInPaisa: 749900,
    stock: 10,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "Leather Strap Watch Brown",
    slug: "leather-strap-watch-brown",
    categorySlug: "watches",
    description: "Minimal dial with genuine leather strap.",
    priceInPaisa: 549950,
    stock: 13,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "Digital Sports Watch",
    slug: "digital-sports-watch",
    categorySlug: "watches",
    description: "Stopwatch, alarm and backlight.",
    priceInPaisa: 199900,
    stock: 0,
    isActive: true,
    imageCount: 1,
  },

  // Beauty & Care
  {
    name: "Oud Perfume 100ml",
    slug: "oud-perfume-100ml",
    categorySlug: "beauty-care",
    description: "Long-lasting oriental fragrance.",
    priceInPaisa: 499900,
    stock: 17,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "Vitamin C Face Serum",
    slug: "vitamin-c-face-serum",
    categorySlug: "beauty-care",
    description: "Brightening serum for all skin types.",
    priceInPaisa: 189950,
    stock: 33,
    isActive: true,
    imageCount: 1,
  },
  {
    name: "Beard Grooming Kit",
    slug: "beard-grooming-kit",
    categorySlug: "beauty-care",
    description: "Oil, balm, comb and scissors.",
    priceInPaisa: 259900,
    stock: 9,
    isActive: true,
    imageCount: 2,
  },

  // Hidden category: active products that customers still must not see
  {
    name: "Wool Overcoat Camel",
    slug: "wool-overcoat-camel",
    categorySlug: "winter-collection-draft",
    description: "Premium wool blend overcoat.",
    priceInPaisa: 1899900,
    stock: 6,
    isActive: true,
    imageCount: 2,
  },
  {
    name: "Knitted Muffler Set",
    slug: "knitted-muffler-set",
    categorySlug: "winter-collection-draft",
    description: "Muffler with matching beanie.",
    priceInPaisa: 149900,
    stock: 20,
    isActive: true,
    imageCount: 1,
  },
];

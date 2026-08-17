/* AmzLoss rate data — CDN-safe client-side dataset.
   current = published 2026 rate; before = representative pre-cut (2020-era) rate
   Update `current` whenever Amazon changes rates; keep the historical `before`
   so the calculator can show the gap. These are advisory estimates only.
*/
window.AMZLOSS_RATES = {
  us: {
    "Luxury Beauty": { current: 10, before: 10 },
    "Amazon Games": { current: 20, before: 5 },
    "Amazon Haul": { current: 25, before: 0 },
    "Handmade & Digital Music": { current: 5, before: 5 },
    "Physical Books": { current: 4.5, before: 4.5 },
    "Kitchen": { current: 4.5, before: 4.5 },
    "Automotive": { current: 4.5, before: 4.5 },
    "Clothing & Apparel": { current: 4, before: 4 },
    "Furniture & Home Improvement": { current: 3, before: 8 },
    "Home & Lawn & Garden": { current: 3, before: 8 },
    "Pet Products": { current: 3, before: 8 },
    "Beauty & Headphones": { current: 3, before: 6 },
    "Sports & Outdoors": { current: 3, before: 4.5 },
    "Baby Products": { current: 3, before: 4.5 },
    "Toys & Games": { current: 3, before: 3 },
    "PC & PC Components": { current: 2.5, before: 4.5 },
    "Televisions": { current: 2, before: 4 },
    "Digital Video Games": { current: 2, before: 3 },
    "Video Game Consoles": { current: 1, before: 3 },
    "Electronics": { current: 1, before: 2.5 },
    "Amazon Fresh & Grocery": { current: 1, before: 5 },
    "Health & Personal Care": { current: 1, before: 4.5 }
  },
  uk: {
    "Luxury Beauty": { current: 10, before: 8 },
    "Amazon Games": { current: 20, before: 5 },
    "Physical Books": { current: 4.5, before: 4.5 },
    "Kitchen": { current: 4.5, before: 4.5 },
    "Furniture & Home Improvement": { current: 3, before: 8 },
    "Beauty & Headphones": { current: 3, before: 6 },
    "Sports & Outdoors": { current: 3, before: 4.5 },
    "Electronics": { current: 1, before: 2.5 },
    "Amazon Fresh & Grocery": { current: 1, before: 5 }
  },
  ca: {
    "Luxury Beauty": { current: 10, before: 8 },
    "Physical Books": { current: 4.5, before: 4.5 },
    "Kitchen": { current: 4.5, before: 4.5 },
    "Furniture & Home Improvement": { current: 3, before: 8 },
    "Beauty & Headphones": { current: 3, before: 6 },
    "Toys & Games": { current: 3, before: 3 },
    "Electronics": { current: 1, before: 2.5 },
    "Amazon Fresh & Grocery": { current: 1, before: 5 }
  }
};
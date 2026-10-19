// "Men's Shoes & Boots!" → "mens-shoes-boots"
export function slugify(text: string): string {
  return text
    .normalize("NFKD") // split accented letters: "é" → "e" + accent mark
    .replace(/[\u0300-\u036f]/g, "") // drop the accent marks
    .toLowerCase()
    .replace(/['’]/g, "") // "men's" → "mens", not "men-s"
    .replace(/[^a-z0-9]+/g, "-") // every other run of symbols/spaces → one hyphen
    .replace(/^-+|-+$/g, "") // no hyphen at the start or end
    .slice(0, 120);
}

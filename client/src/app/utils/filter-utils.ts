import { GridProduct } from '../models/grid-product.model';

export function filterProducts(
  products: GridProduct[] = [],
  query: string,
  selectedCategory: string,
  likedIds?: Set<number>
): GridProduct[] {
  if (!Array.isArray(products)) {
    console.error('Error: products is not an array', products);
    return [];
  }

  const lowerQuery = query?.toLowerCase() || '';
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  if (selectedCategory === 'favorites') {
    if (!likedIds) return [];
    return products.filter((p) => likedIds.has(p.id));
  }

  if (selectedCategory === 'new') {
    return products.filter(p => {
      const d = new Date(p.publishingDate);
      if (isNaN(d.getTime())) return false;
      return d >= weekAgo && d <= now;
    }).filter(p =>
      !query || p.productName?.toLowerCase().includes(lowerQuery)
    );
  }

  return products.filter((product) => {
    const matchesQuery = !query || product?.productName?.toLowerCase().includes(lowerQuery);
    const matchesCategory =
      !selectedCategory || product?.categoryName?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesQuery && matchesCategory;
  });
}

export function sortProducts(products: GridProduct[] = [], sort: string): GridProduct[] {
  if (!Array.isArray(products)) {
    console.error('Error: products is not an array', products);
    return [];
  }

  return [...products].sort((a, b) => {
    if (sort === 'newest')
      return new Date(b.publishingDate).getTime() - new Date(a.publishingDate).getTime();
    if (sort === 'oldest')
      return new Date(a.publishingDate).getTime() - new Date(b.publishingDate).getTime();
    if (sort === 'highest') return b.price - a.price;
    if (sort === 'lowest') return a.price - b.price;
    return 0;
  });
}

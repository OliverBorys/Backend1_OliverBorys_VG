import { GridProduct } from '../models/grid-product.model';
import { getLikedProducts } from './local-storage-utils';

export function filterProducts(
  products: GridProduct[] = [],
  query: string,
  selectedCategory: string
): GridProduct[] {
  if (!Array.isArray(products)) {
    console.error('Error: products is not an array', products);
    return [];
  }

  const lowerQuery = query?.toLowerCase() || '';

  if (selectedCategory === 'favorites') {
    const liked = getLikedProducts();
    return products.filter((product) => liked.includes(product.id));
  }

  return products.filter((product) => {
    const matchesQuery =
      !query || product?.productName?.toLowerCase().includes(lowerQuery);
    const matchesCategory =
      !selectedCategory ||
      product?.categoryName?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesQuery && matchesCategory;
  });
}

export function sortProducts(products: GridProduct[] = [], sort: string): GridProduct[] {
  if (!Array.isArray(products)) {
    console.error('Error: products is not an array', products);
    return [];
  }

  return [...products].sort((a, b) => {
    if (sort === 'newest') return new Date(b.publishingDate).getTime() - new Date(a.publishingDate).getTime();
    if (sort === 'oldest') return new Date(a.publishingDate).getTime() - new Date(b.publishingDate).getTime();
    if (sort === 'highest') return b.price - a.price;
    if (sort === 'lowest') return a.price - b.price;
    return 0;
  });
}

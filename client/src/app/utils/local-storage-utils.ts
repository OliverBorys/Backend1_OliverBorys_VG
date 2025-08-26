import { CartItem } from '../models/cart-item.model';
import { Order } from '../models/order.model';

const CART_ITEMS_KEY = 'cartItems';
const CART_UPDATED_EVENT = 'cartUpdated';

export function getCartItems(): CartItem[] {
  return JSON.parse(localStorage.getItem(CART_ITEMS_KEY) || '[]');
}

export function saveCartItems(cartItems: CartItem[], openCart = false): void {
  localStorage.setItem(CART_ITEMS_KEY, JSON.stringify(cartItems));
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: { openCart } }));
}

export function addToCart(product: Omit<CartItem, 'quantity'>): void {
  let cartItems = getCartItems();
  const existingItem = cartItems.find(item => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cartItems.push({ ...product, quantity: 1 });
  }

  saveCartItems(cartItems, false);
}

export function removeFromCart(productId: number): void {
  const updated = getCartItems().filter(item => item.id !== productId);
  saveCartItems(updated, true);
}

export function updateCartQuantity(productId: number, quantity: number): void {
  const updated = getCartItems().map(item =>
    item.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
  );
  saveCartItems(updated, false);
}

export function clearCart(): void {
  localStorage.removeItem(CART_ITEMS_KEY);
  saveCartItems([], true);
}

const ORDER_HISTORY_KEY = 'orderHistory';

export function getOrderHistory(): Order[] {
  return JSON.parse(localStorage.getItem(ORDER_HISTORY_KEY) || '[]');
}

export function saveOrder(order: Order): void {
  const orders = getOrderHistory();
  orders.push(order);
  localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(orders));
}

export function clearOrderHistory(): void {
  localStorage.removeItem(ORDER_HISTORY_KEY);
}

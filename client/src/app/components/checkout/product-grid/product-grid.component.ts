import { Component, OnInit } from '@angular/core';
import {
  getCartItems,
  removeFromCart,
  updateCartQuantity
} from '../../../utils/local-storage-utils';
import { CartItem } from '../../../models/cart-item.model';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderService } from '../../header/header.service';

@Component({
  selector: 'app-product-grid',
  templateUrl: './product-grid.component.html',
  styleUrls: ['./product-grid.component.css'],
  standalone: true,
  imports: [NgIf, NgFor, CommonModule],
})
export class ProductGridComponent implements OnInit {
  cartItems: CartItem[] = [];

  constructor(private headerService: HeaderService, private router: Router) {}

  goToProduct(productId: number): void {
    this.router.navigate(['/product', productId]);
  }

  ngOnInit(): void {
    this.cartItems = getCartItems();

    this.headerService.cartChanged$.subscribe(() => {
      this.cartItems = getCartItems();
    });
  }

  changeQuantity(productId: number, quantity: number): void {
    if (quantity < 1) return;

    updateCartQuantity(productId, quantity);

    const item = this.cartItems.find((i) => i.id === productId);
    if (item) item.quantity = quantity;

    this.headerService.notifyCartChanged();
  }

  removeItem(productId: number): void {
    removeFromCart(productId);
    this.cartItems = this.cartItems.filter((item) => item.id !== productId);
    this.headerService.notifyCartChanged();
  }

  trackById(index: number, item: CartItem): number {
    return item.id;
  }

  get total(): string {
    return this.cartItems
      .reduce((sum, item) => sum + item.price * item.quantity, 0)
      .toFixed(2);
  }
}

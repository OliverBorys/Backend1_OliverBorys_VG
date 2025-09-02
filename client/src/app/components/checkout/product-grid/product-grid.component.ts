import { Component, OnDestroy, OnInit } from '@angular/core';
import { CartItem } from '../../../models/cart-item.model';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderService } from '../../header/header.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product-grid',
  templateUrl: './product-grid.component.html',
  styleUrls: ['./product-grid.component.css'],
  standalone: true,
  imports: [NgIf, NgFor, CommonModule],
})
export class ProductGridComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  total = 0;

  private sub?: Subscription;

  constructor(private headerService: HeaderService, private router: Router) {}

  ngOnInit(): void {
    this.sub = this.headerService.cart$.subscribe(({ items, total }) => {
      this.cartItems = items;
      this.total = total;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  goToProduct(productId: number): void {
    this.router.navigate(['/product', productId]);
  }

  async changeQuantity(productId: number, quantity: number): Promise<void> {
    if (quantity < 0) return;
    await this.headerService.setQuantity(productId, quantity);
  }

  async removeItem(productId: number): Promise<void> {
    await this.headerService.remove(productId);
  }

  trackById(index: number, item: CartItem): number {
    return item.id;
  }
}

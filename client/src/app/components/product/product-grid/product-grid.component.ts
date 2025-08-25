import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '../product-card/product-card.component';
import { NoProductsFoundComponent } from '../no-products-found/no-products-found.component';
import { GridProduct } from '../../../models/grid-product.model';

@Component({
  standalone: true,
  selector: 'app-product-grid',
  templateUrl: './product-grid.component.html',
  styleUrls: ['./product-grid.component.css'],
  imports: [CommonModule, ProductCardComponent, NoProductsFoundComponent]
})
export class ProductGridComponent {
  @Input() products: GridProduct[] = [];
  @Input() query: string = '';
  @Input() gridClass: string = '';
  @Output() likeToggled = new EventEmitter<void>();

  get visibleProducts(): GridProduct[] {
    const now = new Date();
    return this.products.filter(product => new Date(product.publishingDate) <= now);
  }

  onLikeToggle(): void {
    this.likeToggled.emit();
  }
}

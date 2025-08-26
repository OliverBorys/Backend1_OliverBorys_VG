import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '../product-card/product-card.component';
import { NoProductsFoundComponent } from '../no-products-found/no-products-found.component';
import { GridProduct } from '../../../models/grid-product.model';

import { FavoritesService } from '../../../services/favorites.services';
import { filterProducts } from '../../../utils/filter-utils';
import { Subscription } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-product-grid',
  templateUrl: './product-grid.component.html',
  styleUrls: ['./product-grid.component.css'],
  imports: [CommonModule, ProductCardComponent, NoProductsFoundComponent]
})
export class ProductGridComponent implements OnInit, OnDestroy {
  @Input() products: GridProduct[] = [];
  @Input() query: string = '';
  @Input() gridClass: string = '';
  @Input() selectedCategory: string = '';

  @Output() likeToggled = new EventEmitter<void>();

  private sub?: Subscription;
  likedIds: Set<number> = new Set<number>();

  constructor(private favs: FavoritesService) {}

  ngOnInit(): void {
    this.favs.load();
    this.sub = this.favs.likedSet$().subscribe(set => {
      this.likedIds = set;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get visibleProducts(): GridProduct[] {
    const now = new Date();

    const available = this.products.filter(p => new Date(p.publishingDate) <= now);

    return filterProducts(available, this.query, this.selectedCategory, this.likedIds);
  }

  onLikeToggle(): void {
    this.likeToggled.emit();
  }
}

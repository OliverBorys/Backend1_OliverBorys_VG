import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { SortDropdownComponent } from '../../product/sort-dropdown/sort-dropdown.component';
import { ProductGridComponent } from '../../product/product-grid/product-grid.component';

import { GridProduct } from '../../../models/grid-product.model';
import { FavoritesService } from '../../../services/favorites.services';
import { filterProducts, sortProducts } from '../../../utils/filter-utils';
import { Subscription } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-favorites.component',
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css'],
  imports: [CommonModule, SortDropdownComponent, ProductGridComponent],
})
export class FavoritesComponent implements OnInit, OnDestroy {
  pageTitle = 'Favorites';
  products: GridProduct[] = [];

  // identiskt beteende som i Shop
  sort: string = 'newest';
  query: string = '';
  readonly selectedCategory = 'favorites';

  likedIds = new Set<number>();
  private favSub?: Subscription;

  constructor(
    private http: HttpClient,
    private favs: FavoritesService
  ) {}

  ngOnInit(): void {
    // Hämta alla produkter (grid/filtrering löser favorites)
    this.http.get<GridProduct[]>('/api/products').subscribe((data) => (this.products = data));

    // Ladda och lyssna på favoriter (samma som Shop)
    this.favs.load();
    this.favSub = this.favs.likedSet$().subscribe((set) => {
      this.likedIds = set;
    });
  }

  ngOnDestroy(): void {
    this.favSub?.unsubscribe();
  }

  get filteredAndSortedProducts(): GridProduct[] {
    const filtered = filterProducts(
      this.products,
      this.query,
      this.selectedCategory,
      this.likedIds
    );
    return sortProducts(filtered, this.sort);
  }

  onSortChange(newSort: string) {
    this.sort = newSort;
  }
}

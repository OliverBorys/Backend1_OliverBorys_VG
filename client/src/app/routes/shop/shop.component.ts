import { Component } from '@angular/core';

import { CategoryFilterComponent } from '../../components/product/category-filter/category-filter.component';
import { SortDropdownComponent } from '../../components/product/sort-dropdown/sort-dropdown.component';
import { ProductGridComponent } from '../../components/product/product-grid/product-grid.component';
import { filterProducts, sortProducts } from '../../utils/filter-utils';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { GridProduct } from '../../models/grid-product.model';
import { Category } from '../../models/category.model';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../services/favorites.services';

@Component({
  standalone: true,
  selector: 'app-shop',
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.css'],
  imports: [
    CategoryFilterComponent,
    SortDropdownComponent,
    ProductGridComponent
],
})
export class ShopComponent {
  products: GridProduct[] = [];
  categories: Category[] = [];
  selectedCategory: string = '';
  sort: string = 'newest';
  query: string = '';
  likedIds = new Set<number>();
  private favSub?: Subscription;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private titleService: Title,
    private favs: FavoritesService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.query = params['q'] || '';
      this.selectedCategory = params['category'] || '';
      this.updateTitle();
    });

    this.http.get<GridProduct[]>('/api/products').subscribe((data) => (this.products = data));
    this.http.get<Category[]>('/api/categories/public').subscribe((data) => (this.categories = data));

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

  onCategoryChange(newCategory: string) {
    this.router.navigate([], {
      queryParams: {
        ...this.route.snapshot.queryParams,
        category: newCategory || null,
      },
      queryParamsHandling: 'merge',
    });
    this.selectedCategory = newCategory;
    this.updateTitle();
  }

pageTitle = 'Shop';

updateTitle(): void {
  if (this.selectedCategory === 'favorites') {
    this.pageTitle = 'Favorites';
    this.titleService.setTitle('Favorites');
    return;
  }

  if (this.selectedCategory === 'new') {
    this.pageTitle = 'New in';
    this.titleService.setTitle('New in');
    return;
  }

  this.pageTitle = this.selectedCategory
    ? `${this.selectedCategory.charAt(0).toUpperCase() + this.selectedCategory.slice(1)}`
    : 'Shop';

  this.titleService.setTitle(this.pageTitle);
}
}

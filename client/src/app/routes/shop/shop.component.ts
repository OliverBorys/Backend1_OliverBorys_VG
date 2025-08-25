import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryFilterComponent } from '../../components/product/category-filter/category-filter.component';
import { SortDropdownComponent } from '../../components/product/sort-dropdown/sort-dropdown.component';
import { ProductGridComponent } from '../../components/product/product-grid/product-grid.component';
import { filterProducts, sortProducts } from '../../utils/filter-utils';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { GridProduct } from '../../models/grid-product.model';
import { Category } from '../../models/category.model';

@Component({
  standalone: true,
  selector: 'app-shop',
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.css'],
  imports: [
    CommonModule,
    HttpClientModule,
    CategoryFilterComponent,
    SortDropdownComponent,
    ProductGridComponent,
  ]
})
export class ShopComponent {
  products: GridProduct[] = [];
  categories: Category[] = [];
  selectedCategory: string = '';
  sort: string = 'newest';
  query: string = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.query = params['q'] || '';
      this.selectedCategory = params['category'] || '';
      this.updateTitle();
    });

    this.http.get<GridProduct[]>('/api/products').subscribe(data => this.products = data);
    this.http.get<Category[]>('/api/categories').subscribe(data => this.categories = data);
  }

  get filteredAndSortedProducts(): GridProduct[] {
    const filtered = filterProducts(this.products, this.query, this.selectedCategory);
    return sortProducts(filtered, this.sort);
  }

  onSortChange(newSort: string) {
    this.sort = newSort;
  }

  onCategoryChange(newCategory: string) {
    this.router.navigate([], {
      queryParams: {
        ...this.route.snapshot.queryParams,
        category: newCategory || null
      },
      queryParamsHandling: 'merge'
    });
    this.selectedCategory = newCategory;
    this.updateTitle();
  }

  onLikeToggled() {
    this.products = [...this.products];
  }

  updateTitle(): void {
    const title = this.selectedCategory
      ? `Shop: ${this.selectedCategory.charAt(0).toUpperCase() + this.selectedCategory.slice(1)}`
      : 'Shop: All';
    this.titleService.setTitle(title);
  }
}

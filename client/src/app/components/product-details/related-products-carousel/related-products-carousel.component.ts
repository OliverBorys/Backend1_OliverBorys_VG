import { Component, Input, OnInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

import { RouterModule } from '@angular/router';
import { ProductCardComponent } from '../../product/product-card/product-card.component';
import { RelatedProduct } from '../../../models/related-products.model';

@Component({
  selector: 'app-related-products-carousel',
  standalone: true,
  imports: [RouterModule, ProductCardComponent],
  templateUrl: './related-products-carousel.component.html',
  styleUrls: ['./related-products-carousel.component.css'],
})
export class RelatedProductsCarouselComponent implements OnInit {
  @Input() currentId!: number;
  @Input() categoryId!: number;
  filteredProducts: RelatedProduct[] = [];
  loading = true;
  error = '';
  currentIndex = 0;
  slidesPerView = 2;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id = this.currentId ?? +this.route.snapshot.paramMap.get('id')!;
    this.fetchProducts(id);
    this.updateSlidesPerView();
  }

  @HostListener('window:resize', [])
  onResize(): void {
    this.updateSlidesPerView();
  }

  updateSlidesPerView(): void {
    const width = window.innerWidth;
    if (width >= 1024) this.slidesPerView = 4;
    else if (width >= 768) this.slidesPerView = 3;
    else if (width >= 500) this.slidesPerView = 2;
    else this.slidesPerView = 2;
  }


  fetchProducts(id: number): void {
    this.http.get<RelatedProduct[]>('/api/products').subscribe({
      next: (data) => {
        const currentProduct = data.find((product) => product.id === id);
        if (!currentProduct) {
          this.error = 'Product not found';
          this.loading = false;
          return;
        }
        this.filteredProducts = data.filter(
          (product) =>
            product.categoryId === (this.categoryId ?? currentProduct.categoryId) &&
            product.id !== id
        );
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to fetch products';
        this.loading = false;
      },
    });
  }

  slideNext(): void {
    const maxIndex = Math.max(0, this.filteredProducts.length - this.slidesPerView);
    if (this.currentIndex >= maxIndex) {
      this.currentIndex = 0;
    } else {
      this.currentIndex++;
    }
  }

  slidePrev(): void {
    const maxIndex = Math.max(0, this.filteredProducts.length - this.slidesPerView);
    if (this.currentIndex <= 0) {
      this.currentIndex = maxIndex;
    } else {
      this.currentIndex--;
    }
  }

  canSlideNext(): boolean {
    return this.currentIndex < this.filteredProducts.length - this.slidesPerView;
  }

  canSlidePrev(): boolean {
    return this.currentIndex > 0;
  }
}

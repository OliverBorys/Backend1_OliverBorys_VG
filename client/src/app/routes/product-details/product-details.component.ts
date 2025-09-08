import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { HttpClient } from '@angular/common/http';
import { ProductImageComponent } from '../../components/product-details/product-image/product-image.component';
import { ProductInfoComponent } from '../../components/product-details/product-info/product-info.component';
import { MissingProductComponent } from '../../components/product-details/missing-product/missing-product.component';
import { RelatedProductsCarouselComponent } from '../../components/product-details/related-products-carousel/related-products-carousel.component';
import { GridProduct } from '../../models/grid-product.model';

@Component({
  standalone: true,
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.css'],
  imports: [
    RouterModule,
    ProductImageComponent,
    ProductInfoComponent,
    RelatedProductsCarouselComponent,
    MissingProductComponent
]
})
export class ProductDetailsComponent implements OnInit {
  product!: GridProduct;
  loading = true;
  error = false;
  id!: string;

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.id = id;
        this.fetchProduct(id);
      }
    });
  }

  fetchProduct(id: string): void {
    this.loading = true;
    this.http.get<GridProduct>(`/api/products/${id}`).subscribe({
      next: (res) => {
        this.product = res;
        this.loading = false;
        document.title = this.product.productName;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }
}

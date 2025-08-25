import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { ProductGridComponent } from '../../components/product/product-grid/product-grid.component';
import { HeroSectionComponent } from '../../components/home/hero-section/hero-section.component';
import { CategoryGridComponent } from '../../components/home/category-grid/category-grid.component';
import { AboutFindUsComponent } from '../../components/home/about-find-us/about-find-us.component';
import { Title } from '@angular/platform-browser';
import { GridProduct } from '../../models/grid-product.model';

@Component({
  standalone: true,
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [
    CommonModule,
    HttpClientModule,
    HeroSectionComponent,
    CategoryGridComponent,
    AboutFindUsComponent,
    ProductGridComponent
  ]
})
export class HomeComponent implements OnInit {
  products: GridProduct[] = [];
  trendingProducts: GridProduct[] = [];

  constructor(
    private http: HttpClient,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Home');
    this.http.get<GridProduct[]>('/api/products').subscribe(data => {
      this.products = data;
      this.trendingProducts = data
        .filter(p => p.isNew?.toLowerCase() === 'yes')
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);
    });
  }

  onLikeToggled() {
  }
}

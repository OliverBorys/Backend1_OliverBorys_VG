import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-category-grid',
  templateUrl: './category-grid.component.html',
  styleUrls: ['./category-grid.component.css'],
  imports: [CommonModule, RouterModule]
})
export class CategoryGridComponent {
  constructor(private router: Router) {}

  categories = [
    {
      name: 'New',
      img: 'https://images.unsplash.com/photo-1529720317453-c8da503f2051?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'Shoes',
      img: 'https://www.cafe.se/app/uploads/2024/11/IMG_1696.jpeg',
    },
    {
      name: 'Clothes',
      img: 'https://collectibledry.com/wp-content/uploads/2018/01/Gosha-x-Burberry-shot-by-Gosha-Rubchinskiy_001-1.jpg',
    },
    {
      name: 'Bags',
      img: 'https://mygemma.com/cdn/shop/articles/NEW-WPD-BLOG-Top-Image-12.png?v=1695912820',
    },
    {
      name: 'Watches',
      img: 'https://magazine.chrono24.com/cdn-cgi/image/f=auto,metadata=none,q=65/2022/11/Rolex-Datejust-Daytona-Explorer-2-1.jpg',
    },
    {
      name: 'Sunglasses',
      img: 'https://moscot.com/cdn/shop/files/lemtosh-tortoise-color-woodstock-orange-pos-2.jpg?v=1721853214&width=2295',
    },
  ];

  handleCategoryClick(categoryName: string): void {
    this.router.navigate(['/shop'], {
      queryParams: { category: categoryName.toLowerCase() },
    });
  }
}

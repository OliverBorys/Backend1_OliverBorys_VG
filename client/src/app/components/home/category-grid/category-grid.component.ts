import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

type PublicCategory = {
  id: number;
  categoryName: string;
  imageUrl?: string | null;
};

type GridCard = {
  name: string;
  img: string;
  isStatic?: boolean;
};

@Component({
  standalone: true,
  selector: 'app-category-grid',
  templateUrl: './category-grid.component.html',
  styleUrls: ['./category-grid.component.css'],
  imports: [CommonModule, RouterModule],
})
export class CategoryGridComponent implements OnInit {
  constructor(private router: Router, private http: HttpClient) {}

  loading = false;
  error: string | null = null;

  cards: GridCard[] = [];

  private readonly NEW_CARD: GridCard = {
    name: 'New',
    img: 'https://images.unsplash.com/photo-1529720317453-c8da503f2051?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    isStatic: true,
  };

  ngOnInit(): void {
    // Public endpoint that already excludes "Uncategorized" and requires an image
    this.http.get<PublicCategory[]>('/api/categories/public').subscribe({
      next: (rows) => {
        const mapped = (rows || [])
          .filter(c => !!c.categoryName && !!c.imageUrl && c.imageUrl!.trim() !== '')
          .map<GridCard>(c => ({
            name: c.categoryName,
            img: c.imageUrl!,
          }));

        // Put "New" first, then the DB categories
        this.cards = [this.NEW_CARD, ...mapped];
        this.loading = false;
      },
      error: () => {
        // Even if the API fails, still show the “New” card
        this.cards = [this.NEW_CARD];
        this.error = 'Failed to load categories';
        this.loading = false;
      },
    });
  }
}

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../../services/favorites.services';

@Component({
  standalone: true,
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css'],
  imports: [CommonModule, RouterModule]
})
export class ProductCardComponent implements OnInit, OnDestroy {
  @Input() product!: {
    id: number;
    productName: string;
    price: number;
    image: string;
    secondaryImage1?: string;
    brand?: string;
  };

  liked = false;
  private sub?: Subscription;

  constructor(private favs: FavoritesService) {}

  ngOnInit(): void {
    this.sub = this.favs.likedSet$().subscribe(set => {
      this.liked = set.has(this.product.id);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onLikeClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.favs.toggle(this.product.id);
  }

  getLikeIcon(): string {
    return this.liked ? '/images/heart-filled.svg' : '/images/heart.svg';
  }
}

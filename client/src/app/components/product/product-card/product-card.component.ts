import { Component, input, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../../services/favorites.services';

@Component({
  standalone: true,
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css'],
  imports: [CommonModule, RouterModule],
})
export class ProductCardComponent implements OnInit, OnDestroy {
  @Input() product!: {
    id: number;
    productName: string;
    price: number;
    image: string;
    secondaryImage1?: string;
    brand?: string;
    publishingDate?: string;
  };

  @Input() hideNewBadge: boolean = false;

  liked = false;
  private sub?: Subscription;

  constructor(private favs: FavoritesService) {}

  ngOnInit(): void {
    this.sub = this.favs.likedSet$().subscribe((set) => {
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

  isNewByDate(): boolean {
    if (!this.product?.publishingDate) return false;
    const now = new Date();
    const pub = new Date(this.product.publishingDate);
    if (isNaN(pub.getTime()) || pub > now) return false;

    const msInDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.floor((now.getTime() - pub.getTime()) / msInDay);
    return diffDays <= 7;
  }

  showNewBadge(): boolean {
    return this.isNewByDate() && !this.hideNewBadge;
  }
}

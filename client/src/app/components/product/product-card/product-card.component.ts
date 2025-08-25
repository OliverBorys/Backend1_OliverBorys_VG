import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { toggleLikeProduct, isProductLiked } from '../../../utils/local-storage-utils';

@Component({
  standalone: true,
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css'],
  imports: [CommonModule, RouterModule]
})
export class ProductCardComponent {
  @Input() product!: {
    id: number;
    productName: string;
    price: number;
    image: string;
    secondaryImage1?: string;
    brand?: string;
  };

  @Output() likeToggled = new EventEmitter<void>();

  liked: boolean = false;

  ngOnInit(): void {
    this.liked = isProductLiked(this.product.id);
  }

  onLikeClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const updatedLikes = toggleLikeProduct(this.product.id);
    this.liked = updatedLikes.includes(this.product.id);
    this.likeToggled.emit();
  }

  getLikeIcon(): string {
    return this.liked ? '/images/heart-filled.svg' : '/images/heart.svg';
  }
}

import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  ElementRef,
  Renderer2,
} from '@angular/core';
import { CartItem } from '../../../models/cart-item.model';
import { HeaderState } from '../../../models/header-state.model';
import { HeaderService } from '../header.service';
import { NgFor, NgIf } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cart-header',
  standalone: true,
  imports: [NgIf, NgFor, RouterModule],
  templateUrl: './cart-header.component.html',
  styleUrls: ['./cart-header.component.css'],
})
export class CartHeaderComponent implements OnInit, OnDestroy {
  @Input() isHeaderWhite = false;

  state!: HeaderState;
  cartItems: CartItem[] = [];
  total = 0;

  private stateSub?: Subscription;
  private cartSub?: Subscription;
  private removeClickListener: () => void = () => {};

  constructor(
    public headerService: HeaderService,
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    this.stateSub = this.headerService.state$.subscribe((state) => {
      this.state = state;
    });

    this.cartSub = this.headerService.cart$.subscribe(({ items, total }) => {
      this.cartItems = items;
      this.total = total;
    });

    this.removeClickListener = this.renderer.listen(
      'document',
      'mousedown',
      this.handleClickOutside
    );
  }

  ngOnDestroy() {
    this.stateSub?.unsubscribe();
    this.cartSub?.unsubscribe();
    this.removeClickListener();
  }

  handleClickOutside = (event: MouseEvent) => {
    setTimeout(() => {
      const cart = this.el.nativeElement.querySelector('.cart-drawer');
      if (this.state?.isCartOpen && cart && !cart.contains(event.target as Node)) {
        this.headerService.closeCart();
      }
    }, 0);
  };

  onCartButtonClick(event: MouseEvent) {
    event.stopPropagation();
    this.toggleCart();
  }

  toggleCart() { this.headerService.toggleCart(); }
  closeCart()  { this.headerService.closeCart(); }

  async handleRemove(event: Event, productId: number) {
    event.stopPropagation();
    await this.headerService.remove(productId);
  }

  async changeQuantity(event: Event, productId: number, quantity: number) {
    event.stopPropagation();
    // Låt 0 bli "ta bort"
    if (quantity < 0) return;
    await this.headerService.setQuantity(productId, quantity);
  }

  trackById(index: number, item: CartItem): number { return item.id; }
}

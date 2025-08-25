import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  ElementRef,
  Renderer2,
} from '@angular/core';
import {
  getCartItems,
  removeFromCart,
  updateCartQuantity,
} from '../../../utils/local-storage-utils';
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
  cartItems = getCartItems();
  state!: HeaderState;

  private stateSub!: Subscription;
  private cartChangedSub!: Subscription;
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

    this.cartChangedSub = this.headerService.cartChanged$.subscribe(() => {
      this.cartItems = getCartItems();
    });

    this.removeClickListener = this.renderer.listen(
      'document',
      'mousedown',
      this.handleClickOutside
    );
  }

  ngOnDestroy() {
    this.stateSub?.unsubscribe();
    this.cartChangedSub?.unsubscribe();
    this.removeClickListener();
  }

  handleClickOutside = (event: MouseEvent) => {
    setTimeout(() => {
      const cart = this.el.nativeElement.querySelector('.cart-drawer');
      if (
        this.state?.isCartOpen &&
        cart &&
        !cart.contains(event.target as Node)
      ) {
        this.headerService.closeCart();
      }
    }, 0);
  };

  onCartButtonClick(event: MouseEvent) {
    event.stopPropagation();
    this.toggleCart();
  }

  toggleCart() {
    this.headerService.toggleCart();
  }

  handleRemove(event: Event, productId: number) {
    event.stopPropagation();
    removeFromCart(productId);
    this.cartItems = getCartItems();
  }

  changeQuantity(event: Event, productId: number, quantity: number) {
    event.stopPropagation();
    updateCartQuantity(productId, quantity);
    this.cartItems = getCartItems();
  }

  closeCart() {
    this.headerService.closeCart();
  }

  trackById(index: number, item: CartItem): number {
    return item.id;
  }

  get total() {
    return this.cartItems
      .reduce((acc, item) => acc + item.price * item.quantity, 0)
      .toFixed(2);
  }
}

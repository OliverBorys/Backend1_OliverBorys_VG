import { Component } from '@angular/core';
import { ProductGridComponent } from '../../components/checkout/product-grid/product-grid.component';
import { PaymentFormComponent } from '../../components/checkout/payment-form/payment-form.component';
import { Title } from '@angular/platform-browser';
import { HeaderService } from '../../components/header/header.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-checkout',
  imports: [ProductGridComponent, PaymentFormComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
})
export class CheckoutComponent {
  processing = false;
  error?: string;

  constructor(private titleService: Title, private header: HeaderService, private router: Router) {}

  ngOnInit(): void {
    this.titleService.setTitle('Checkout');
  }

  async handlePaymentSuccess() {
    try {
      this.processing = true;

      if (this.header.isLoggedIn) {
        await this.header.checkout();
      } else {
        await this.header.checkoutGuest();
      }

      this.header.closeCart();
      await this.header.rehydrateAfterAuthChange();
    } catch (e: any) {
      if (e?.status === 401) {
        this.error = 'Du måste vara inloggad för att slutföra köpet.';
        this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      } else {
        this.error = e?.error?.error || e?.error?.message || 'Ett fel uppstod vid checkout.';
      }
    } finally {
      this.processing = false;
    }
  }

  handleBackFromModal() {
    this.router.navigate(['/']);
  }
}

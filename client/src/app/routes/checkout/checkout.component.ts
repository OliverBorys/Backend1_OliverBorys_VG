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
  constructor(private titleService: Title, private header: HeaderService, private router: Router) {}

  ngOnInit(): void {
    this.titleService.setTitle('Checkout');
  }

  async handlePaymentSuccess() {
    this.header.closeCart();
    this.header.notifyCartChanged();
  }

  handleBackFromModal() {
    this.router.navigate(['/']);
  }
}

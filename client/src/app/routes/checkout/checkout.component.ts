import { Component } from '@angular/core';
import { ProductGridComponent } from '../../components/checkout/product-grid/product-grid.component';
import { PaymentFormComponent } from '../../components/checkout/payment-form/payment-form.component';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-checkout',
  imports: [ProductGridComponent, PaymentFormComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent {
  constructor(
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Checkout');
  }
}

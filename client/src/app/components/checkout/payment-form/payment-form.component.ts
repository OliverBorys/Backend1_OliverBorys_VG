import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  clearCart,
  getCartItems,
  saveOrder,
} from '../../../utils/local-storage-utils';
import { Order } from '../../../models/order.model';
import { HeaderService } from '../../header/header.service';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './payment-form.component.html',
  styleUrls: ['./payment-form.component.css']
})
export class PaymentFormComponent implements OnInit {
  form!: FormGroup;
  showModal = false;

  paymentMethods = ['Card', 'Swish', 'Klarna', 'PayPal'];
  paymentIcons: Record<string, string> = {
    Card: '/images/card-icon.png',
    Swish: '/images/swish-icon.png',
    Klarna: '/images/klarna-icon.png',
    PayPal: '/images/paypal-icon.png'
  };

  constructor(private fb: FormBuilder, private headerService: HeaderService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobilePhone: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      postalCode: ['', Validators.required],
      paymentMethod: ['', Validators.required]
    });
  }

  handlePurchase(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const items = getCartItems();
    const formData = this.form.value;

    const newOrder: Order = {
      id: Date.now(),
      date: new Date().toISOString(),
      items,
      customer: formData,
    };

    saveOrder(newOrder);
    this.showModal = true;
  }

  handleBackToHome(): void {
    clearCart();
    this.headerService.notifyCartChanged();
    this.headerService.openCartTemporarily();
    this.showModal = false;
  }
}

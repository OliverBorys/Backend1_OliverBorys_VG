import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './payment-form.component.html',
  styleUrls: ['./payment-form.component.css'],
})
export class PaymentFormComponent implements OnInit {
  @Output() success = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  form!: FormGroup;
  showModal = false;
  isSubmitting = false;

  paymentMethods = ['Card', 'Swish', 'Klarna', 'PayPal'];
  paymentIcons: Record<string, string> = {
    Card: '/images/card-icon.png',
    Swish: '/images/swish-icon.png',
    Klarna: '/images/klarna-icon.png',
    PayPal: '/images/paypal-icon.png',
  };

  private successEmitted = false;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobilePhone: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      postalCode: ['', Validators.required],
      paymentMethod: ['', Validators.required],
      saveToProfile: [false],
    });

    this.prefillForLoggedInUser();
  }

  private prefillForLoggedInUser(): void {
    this.http.get<{ user: any }>('/api/auth/me', { withCredentials: true }).subscribe({
      next: (res) => {
        if (res?.user) this.loadProfile();
      },
      error: () => void 0,
    });
  }

  private loadProfile(): void {
    this.http.get<any>('/api/profile', { withCredentials: true }).subscribe((p) => {
      if (!p) return;
      this.form.patchValue({
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        email: p.email || '',
        mobilePhone: p.mobilePhone || '',
        address: p.address || '',
        city: p.city || '',
        postalCode: p.postalCode || '',
      });
    });
  }

  handlePurchase() {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const {
      firstName,
      lastName,
      email,
      mobilePhone,
      address,
      city,
      postalCode,
      paymentMethod,
      saveToProfile,
    } = this.form.value;

    const payload = {
      paymentMethod,
      firstName,
      lastName,
      email,
      mobilePhone,
      address,
      city,
      postalCode,
    };

    this.http.get<{ user: any }>('/api/auth/me', { withCredentials: true }).subscribe({
      next: (me) => {
        const isLoggedIn = !!me?.user;

        const afterProfileSave = () => {
          if (isLoggedIn) {
            this.http
              .post(
                '/api/orders/checkout',
                { paymentMethod: this.form.controls['paymentMethod'].value },
                { withCredentials: true }
              )
              .subscribe({
                next: () => this.finishPurchase(),
                error: () => this.finishPurchase(),
              });
          } else {
            this.http.post('/api/cart/guest/checkout', payload, { withCredentials: true }).subscribe({
              next: () => this.finishPurchase(),
              error: () => this.finishPurchase(),
            });
          }
        };

        if (isLoggedIn && saveToProfile) {
          this.http
            .put(
              '/api/profile',
              { firstName, lastName, email, mobilePhone, address, city, postalCode },
              { withCredentials: true }
            )
            .subscribe({
              next: afterProfileSave,
              error: afterProfileSave,
            });
        } else {
          afterProfileSave();
        }
      },
      error: () => this.finishPurchase(),
    });
  }

  private finishPurchase() {
    this.isSubmitting = false;
    this.emitSuccessOnce();
    this.showModal = true;
  }

  handleBackToHome(): void {
    this.back.emit();
    this.showModal = false;
  }

  private emitSuccessOnce() {
    if (this.successEmitted) return;
    this.successEmitted = true;
    this.success.emit();
  }
}

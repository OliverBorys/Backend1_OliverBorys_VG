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
    this.http
      .get<{ user: any; profile?: any }>('/api/auth/me', { withCredentials: true })
      .subscribe({
        next: (res) => {
          if (res?.user && (res as any).profile) {
            const p = (res as any).profile;
            this.form.patchValue({
              firstName: p.firstName || '',
              lastName: p.lastName || '',
              email: p.email || '',
              mobilePhone: p.mobilePhone || '',
              address: p.address || '',
              city: p.city || '',
              postalCode: p.postalCode || '',
            });
          } else if (res?.user) {
            this.loadProfile();
          }
        },
        error: () => this.loadProfile(),
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { firstName, lastName, email, mobilePhone, address, city, postalCode, saveToProfile } =
      this.form.value;

    // 1) Kolla om inloggad
    this.http.get<{ user: any }>('/api/auth/me', { withCredentials: true }).subscribe({
      next: (me) => {
        const isLoggedIn = !!me?.user;

        // 2) Om inloggad och ska spara → PUT /api/profile
        if (isLoggedIn && saveToProfile) {
          this.http
            .put(
              '/api/profile',
              { firstName, lastName, email, mobilePhone, address, city, postalCode },
              { withCredentials: true }
            )
            .subscribe({
              next: () => this.finishPurchase(),
              error: () => this.finishPurchase(), // även om sparning misslyckas går köpet vidare (din UX)
            });
        } else {
          this.finishPurchase();
        }
      },
      error: () => this.finishPurchase(),
    });
  }

  private finishPurchase() {
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

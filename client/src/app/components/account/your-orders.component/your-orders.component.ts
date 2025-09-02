import { Component, OnInit } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';

type RawOrderItem = {
  product_id: number;
  quantity: number;
  price_at_purchase?: number;
  product_name?: string;
  unit_price?: number;
  line_total?: number;
  productName?: string; // from JOIN p.productName
  image?: string | null;
};

type RawOrder = {
  id: number;
  user_id: number;
  status: string;
  created_at: string;
  payment_method?: string | null;
  items: RawOrderItem[];
};

type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  mobilePhone: string;
  address: string;
  city: string;
  postalCode: string;
};

type OrderItem = {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  image: string | null;
};

type OrderView = {
  id: number;
  createdAt: string;
  paymentMethod: string | null;
  items: OrderItem[];
  total: number;
};

@Component({
  selector: 'app-your-orders',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './your-orders.component.html',
  styleUrls: ['./your-orders.component.css'],
})
export class YourOrdersComponent implements OnInit {
  loading = false;
  errorMsg = '';
  orders: OrderView[] = [];
  profile: Profile | null = null;

  constructor(private http: HttpClient, private title: Title) {}

  ngOnInit(): void {
    this.title.setTitle('Your Orders');
    this.load();
  }

  private load() {
    this.loading = true;
    this.errorMsg = '';

    // Load profile (best-effort, not required)
    this.http.get<Profile>('/api/profile', { withCredentials: true }).subscribe({
      next: (p) => (this.profile = p),
      error: () => (this.profile = null),
    });

    // Load orders for the logged-in user
    this.http.get<RawOrder[]>('/api/orders', { withCredentials: true }).subscribe({
      next: (rows) => {
        // Only show created (exclude any carts)
        const created = (rows || []).filter((o) => o.status === 'created');

        this.orders = created.map((o) => {
          const items: OrderItem[] = (o.items || []).map((it) => {
            const name = it.product_name ?? it.productName ?? 'Product';
            const unit = (it.unit_price ?? it.price_at_purchase ?? 0);
            const qty = it.quantity ?? 0;
            const line = (it.line_total ?? unit * qty);
            return {
              productId: it.product_id,
              productName: name,
              unitPrice: unit,
              quantity: qty,
              lineTotal: line,
              image: it.image ?? null,
            };
          });

          const total = items.reduce((s, x) => s + (x.lineTotal || (x.unitPrice * x.quantity)), 0);

          return {
            id: o.id,
            createdAt: o.created_at,
            paymentMethod: o.payment_method ?? null,
            items,
            total,
          };
        });

        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.error || 'Could not load your orders';
        this.loading = false;
      },
    });
  }

  // Helpers
  asCurrency(v: number): string {
    return `$${(v ?? 0).toFixed(2)}`;
  }
}

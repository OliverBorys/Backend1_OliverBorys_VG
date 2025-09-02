import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Title } from '@angular/platform-browser';

type AdminOrderItem = {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  image?: string | null;
};

type AdminCustomer = {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobilePhone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
};

type AdminOrder = {
  id: number;
  userId: number;
  status: string;
  createdAt: string;            // ISO-ish from SQLite
  paymentMethod: string | null; // may be null
  customer: AdminCustomer;
  items: AdminOrderItem[];
};

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
})
export class OrdersComponent implements OnInit {
  constructor(private title: Title, private http: HttpClient) {}

  orders: AdminOrder[] = [];
  loading = false;
  // filters
  filter = {
    from: '',
    to: '',
    customer: '',
  };

  ngOnInit(): void {
    this.title.setTitle('Order history');
    this.load();
  }

  load() {
    this.loading = true;
    let params = new HttpParams();
    if (this.filter.from) params = params.set('from', this.filter.from);
    if (this.filter.to) params = params.set('to', this.filter.to);
    if (this.filter.customer) params = params.set('customer', this.filter.customer);

    this.http
      .get<AdminOrder[]>('/api/admin/orders', { params, withCredentials: true })
      .subscribe({
        next: (rows) => (this.orders = rows ?? []),
        complete: () => (this.loading = false),
        error: () => (this.loading = false),
      });
  }

  resetFilters() {
    this.filter = { from: '', to: '', customer: '' };
    this.load();
  }

  getOrderTotal(order: AdminOrder): string {
    const total = order.items.reduce((acc, it) => acc + (it.lineTotal ?? (it.unitPrice * it.quantity)), 0);
    return total.toFixed(2);
  }

  deleteOrder(orderId: number) {
    if (!confirm(`Delete order #${orderId}?`)) return;
    this.http
      .delete<{ message: string; id: number }>(`/api/admin/orders/${orderId}`, { withCredentials: true })
      .subscribe({
        next: () => (this.orders = this.orders.filter((o) => o.id !== orderId)),
        error: (err) => alert(err?.error?.error || 'Could not delete order'),
      });
  }
}

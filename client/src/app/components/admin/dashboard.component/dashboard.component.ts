import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { AdminOrder } from '../../../models/admin-order.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  constructor(
    private titleService: Title,
    private http: HttpClient
  ) {}

  totalRevenue = 0;
  totalSoldProducts = 0;
  topProducts: { name: string; quantity: number }[] = [];
  loading = false;
  error?: string;

  ngOnInit(): void {
    this.titleService.setTitle('Admin');
    this.loadStats();
  }

  private loadStats() {
    this.loading = true;
    this.error = undefined;

    this.http.get<AdminOrder[]>('/api/admin/orders', { withCredentials: true })
      .subscribe({
        next: (orders) => this.computeStats(orders ?? []),
        error: (err) => this.error = err?.error?.error || 'Could not load orders',
        complete: () => this.loading = false,
      });
  }

  private computeStats(orders: AdminOrder[]) {
    this.totalRevenue = 0;
    this.totalSoldProducts = 0;
    const productMap: Record<string, number> = {};

    for (const order of orders) {
      for (const item of order.items) {
        const qty = Number(item.quantity) || 0;
        const unit = Number(item.unitPrice) || 0;
        const line = typeof item.lineTotal === 'number' ? item.lineTotal : unit * qty;

        this.totalRevenue += line;
        this.totalSoldProducts += qty;

        const key = item.productName || `#${item.productId}`;
        productMap[key] = (productMap[key] || 0) + qty;
      }
    }

    this.topProducts = Object.entries(productMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
  }
}

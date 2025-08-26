import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getOrderHistory } from '../../../utils/local-storage-utils';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  constructor(
    private titleService: Title
  ) {}
  totalRevenue = 0;
  totalSoldProducts = 0;
  topProducts: { name: string, quantity: number }[] = [];

  ngOnInit(): void {
    this.titleService.setTitle('Admin');
    const orders = getOrderHistory();
    const productMap: Record<string, number> = {};

    for (const order of orders) {
      for (const item of order.items) {
        this.totalRevenue += item.price * item.quantity;
        this.totalSoldProducts += item.quantity;

        if (productMap[item.productName]) {
          productMap[item.productName] += item.quantity;
        } else {
          productMap[item.productName] = item.quantity;
        }
      }
    }

    this.topProducts = Object.entries(productMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getOrderHistory, clearOrderHistory } from '../../../utils/local-storage-utils';
import { Order } from '../../../models/order.model';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
})
export class OrdersComponent implements OnInit {
  constructor(
    private titleService: Title
  ) {}

  orders: Order[] = [];

  ngOnInit(): void {
    this.titleService.setTitle('Order history');
    this.orders = getOrderHistory().sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  getOrderTotal(order: Order): string {
    return order.items
      .reduce((acc, item) => acc + item.price * item.quantity, 0)
      .toFixed(2);
  }

  handleClearOrders(): void {
    clearOrderHistory();
    this.orders = [];
  }
}

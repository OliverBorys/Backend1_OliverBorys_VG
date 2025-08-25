import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-no-products-found',
  templateUrl: './no-products-found.component.html',
  styleUrls: ['./no-products-found.component.css'],
  imports: [CommonModule]
})
export class NoProductsFoundComponent {
  @Input() query: string = '';
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-product-info-accordion',
  imports: [CommonModule],
  templateUrl: './product-info-accordion.component.html',
  styleUrls: ['./product-info-accordion.component.css']
})
export class ProductInfoAccordionComponent {
  @Input() title: string = '';
  isOpen: boolean = false;

  toggle(): void {
    this.isOpen = !this.isOpen;
  }
}

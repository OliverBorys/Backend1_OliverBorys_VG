import { Component, Input } from '@angular/core';


@Component({
  standalone: true,
  selector: 'app-product-info-accordion',
  imports: [],
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

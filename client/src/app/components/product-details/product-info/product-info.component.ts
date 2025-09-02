import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductInfoAccordionComponent } from '../product-info-accordion/product-info-accordion.component';
import { HeaderService } from '../../header/header.service';
import { GridProduct } from '../../../models/grid-product.model';

@Component({
  standalone: true,
  selector: 'app-product-info',
  templateUrl: './product-info.component.html',
  styleUrls: ['./product-info.component.css'],
  imports: [CommonModule, ProductInfoAccordionComponent]
})
export class ProductInfoComponent implements OnInit {
  @Input() product!: GridProduct;
  @Output() cartUpdated = new EventEmitter<boolean>();

  selectedSize: string | null = null;
  sizeOptions: string[] = [];

  constructor(private headerService: HeaderService) {}

  ngOnInit(): void {
    this.setupSizeOptions();
  }

  setupSizeOptions(): void {
    const category = this.product?.categoryName?.toLowerCase();

    if (category === 'clothes') {
      this.sizeOptions = ['XS', 'S', 'M', 'L', 'XL'];
    } else if (category === 'shoes') {
      this.sizeOptions = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
    } else {
      this.sizeOptions = ['One Size'];
    }
  }

  async handleAddToCart(): Promise<void> {
    // Storleken används bara i UI just nu (order_items i backend lagrar inte size).
    // Vill du spara size i DB senare: utöka API:t och tabellen.
    await this.headerService.addToCart(this.product.id);   // POST /api/cart/:id
    this.headerService.openCartTemporarily();              // öppna lådan som innan
    this.cartUpdated.emit(true);
  }
}

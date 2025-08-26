import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Category } from '../../../models/category.model';
import { FullProduct } from '../../../models/full-product.model';


@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css'],
})
export class ProductFormComponent implements OnInit {
  @Input() product: FullProduct | null = null;
  @Input() categories: Category[] = [];
  @Output() save = new EventEmitter<FullProduct>();
  @Output() close = new EventEmitter<void>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    const isNewValue = this.product?.isNew === 'yes' ? true : false;

    this.form = this.fb.group({
      productName: [this.product?.productName || '', Validators.required],
      price: [this.product?.price || 0, [Validators.required, Validators.min(0)]],
      image: [this.product?.image || '', Validators.required],
      secondaryImage1: [this.product?.secondaryImage1 || ''],
      secondaryImage2: [this.product?.secondaryImage2 || ''],
      secondaryImage3: [this.product?.secondaryImage3 || ''],
      brand: [this.product?.brand || '', Validators.required],
      productDescription: [this.product?.productDescription || '', Validators.required],
      isNew: [isNewValue, Validators.required],
      categoryId: [this.product?.categoryId || '', Validators.required],
      publishingDate: [this.product?.publishingDate || '', Validators.required],
    });
  }

  submit() {
    if (this.form.valid) {
      const productData: FullProduct = {
        ...this.form.value,
        id: this.product?.id,
        price: Number(this.form.value.price),
        categoryId: Number(this.form.value.categoryId),
        isNew: this.form.value.isNew ? 'yes' : 'no',
      };
      console.log('Submitting Product:', productData);
      this.save.emit(productData);
      this.close.emit();
    } else {
      console.log('Form is invalid:', this.form.errors);
      this.markAllAsTouched();
    }
  }

  private markAllAsTouched() {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }
}

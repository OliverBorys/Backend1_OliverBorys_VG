import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { Category } from '../../../models/category.model';
import { FullProduct } from '../../../models/full-product.model';

type ImageKey = 'image' | 'secondaryImage1' | 'secondaryImage2' | 'secondaryImage3';


@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css'],
})
export class ProductFormComponent implements OnInit {
  @Input() product: FullProduct | null = null;
  @Input() categories: Category[] = [];
  @Output() save = new EventEmitter<FormData>();
  @Output() close = new EventEmitter<void>();

  form!: FormGroup;

  files: Record<ImageKey, File | null> = {
    image: null,
    secondaryImage1: null,
    secondaryImage2: null,
    secondaryImage3: null,
  };

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    const isTrendingValue = this.product?.isTrending === 'yes' ? true : false;

    this.form = this.fb.group({
      productName: [
        this.product?.productName || '',
        [Validators.required, Validators.maxLength(30)],
      ],
      price: [this.product?.price || 0, [Validators.required, Validators.min(0)]],
      brand: [this.product?.brand || '', Validators.required],
      productDescription: [this.product?.productDescription || '', Validators.required],
      isTrending: [isTrendingValue, Validators.required],
      categoryId: [this.product?.categoryId || '', Validators.required],
      publishingDate: [this.product?.publishingDate || '', Validators.required],
    });
  }

  onFileChange(evt: Event, key: ImageKey) {
    const input = evt.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.files[key] = file;
  }

  submit() {
    if (this.form.invalid) {
      this.markAllAsTouched();
      console.log('Form is invalid:', this.form.errors);
      return;
    }

    // Om vi skapar NY produkt: kräva primär bild
    if (!this.product && !this.files.image) {
      // enkel klientvalidering – du kan även visa fel i UI
      console.warn('Primary image is required when creating a product');
      return;
    }

    // Bygg FormData för multipart/form-data
    const fd = new FormData();

    // Textfält
    fd.append('productName', this.form.value.productName);
    fd.append('price', String(this.form.value.price));
    fd.append('brand', this.form.value.brand ?? '');
    fd.append('productDescription', this.form.value.productDescription ?? '');
    fd.append('isTrending', this.form.value.isTrending ? 'true' : 'false');
    fd.append('categoryId', String(this.form.value.categoryId));
    fd.append('publishingDate', this.form.value.publishingDate);

    // Filer (append bara de som valts)
    if (this.files.image) fd.append('image', this.files.image);
    if (this.files.secondaryImage1) fd.append('secondaryImage1', this.files.secondaryImage1);
    if (this.files.secondaryImage2) fd.append('secondaryImage2', this.files.secondaryImage2);
    if (this.files.secondaryImage3) fd.append('secondaryImage3', this.files.secondaryImage3);

    // Vid uppdatering kan föräldern använda product?.id för att välja PUT-endpoint
    if (this.product?.id != null) {
      fd.append('id', String(this.product.id));
    }

    // Emittera FormData till föräldern (service skickar POST/PUT)
    this.save.emit(fd);
    this.close.emit();
  }

  private markAllAsTouched() {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }
}

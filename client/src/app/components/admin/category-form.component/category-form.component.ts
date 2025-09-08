import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

export type CategoryFormResult = {
  categoryName: string;
  imageFile?: File | null;
};

type CategoryInput = {
  id: number;
  categoryName: string;
  imageUrl?: string | null;
  productCount: number;
};

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './category-form.component.html',
  styleUrls: ['./category-form.component.css'],
})
export class CategoryFormComponent implements OnChanges {
  @Input() open = false;
  @Input() category: CategoryInput | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<CategoryFormResult>();

  form: FormGroup;
  file: File | null = null;
  previewUrl: string | null = null;

  constructor(fb: FormBuilder) {
    this.form = fb.group({
      categoryName: ['', [Validators.required, Validators.maxLength(40)]],
    });
  }

  ngOnChanges(): void {
    if (this.category) {
      this.form.patchValue({ categoryName: this.category.categoryName });
      this.previewUrl = this.category.imageUrl || null;
      this.file = null;
    } else {
      this.form.reset();
      this.previewUrl = null;
      this.file = null;
    }
  }

  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.file = null;
      this.previewUrl = this.category?.imageUrl || null;
      return;
    }
    const f = input.files[0];
    this.file = f;

    const reader = new FileReader();
    reader.onload = () => (this.previewUrl = String(reader.result || ''));
    reader.readAsDataURL(f);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit({
      categoryName: this.form.value.categoryName.trim(),
      imageFile: this.file || undefined,
    });
  }
}

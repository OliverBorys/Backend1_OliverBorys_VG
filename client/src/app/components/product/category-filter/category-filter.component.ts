import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Category } from '../../../models/category.model';

@Component({
  standalone: true,
  selector: 'app-category-filter',
  templateUrl: './category-filter.component.html',
  styleUrls: ['./category-filter.component.css'],
  imports: [CommonModule, FormsModule],
})
export class CategoryFilterComponent {
  @Input() categories: Category[] = [];
  @Input() selectedCategory: string = '';
  @Output() categoryChange = new EventEmitter<string>();

  get visibleCategories() {
    return (this.categories || []).filter(
      (c) => (c.categoryName || '').trim().toLowerCase() !== 'uncategorized'
    );
  }

  onCategoryChange(value: string): void {
    this.categoryChange.emit(value);
  }
}

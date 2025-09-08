import { Component, OnInit } from '@angular/core';

import { HttpClient, HttpParams } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { CategoryFormComponent, CategoryFormResult } from '../category-form.component/category-form.component';
import { ConfirmDeleteModalComponent } from '../confirm-delete-modal.component/confirm-delete-modal.component';

type AdminCategory = {
  id: number;
  categoryName: string;
  imageUrl?: string | null;
  productCount: number;
};

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CategoryFormComponent, ConfirmDeleteModalComponent],
  templateUrl: './categories.component.html',
  styleUrls: ['../products.component/products.component.css']
})
export class CategoriesComponent implements OnInit {
  constructor(private http: HttpClient, private title: Title) {}

  loading = false;
  categories: AdminCategory[] = [];

  showForm = false;
  selectedCategory: AdminCategory | null = null;

  showDeleteModal = false;
  categoryToDelete: AdminCategory | null = null;

  ngOnInit(): void {
    this.title.setTitle('Categories');
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http.get<AdminCategory[]>('/api/categories', { withCredentials: true })
      .subscribe({
        next: (rows) => (this.categories = rows ?? []),
        complete: () => (this.loading = false),
        error: () => (this.loading = false),
      });
  }

  openAddModal() {
    this.selectedCategory = null;
    this.showForm = true;
  }

  openEditModal(cat: AdminCategory) {
    this.selectedCategory = cat;
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.selectedCategory = null;
  }

  handleSave(formResult: CategoryFormResult) {
    const fd = new FormData();
    fd.append('categoryName', formResult.categoryName);
    if (formResult.imageFile) fd.append('image', formResult.imageFile);

    if (!this.selectedCategory) {
      this.http.post('/api/categories', fd, { withCredentials: true }).subscribe({
        next: () => { this.closeForm(); this.load(); },
        error: (e) => alert(e?.error?.error || 'Could not create category')
      });
    } else {
      this.http.put(`/api/categories/${this.selectedCategory.id}`, fd, { withCredentials: true }).subscribe({
        next: () => { this.closeForm(); this.load(); },
        error: (e) => alert(e?.error?.error || 'Could not update category')
      });
    }
  }

  openDeleteModal(cat: AdminCategory) {
    this.categoryToDelete = cat;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.categoryToDelete = null;
    this.showDeleteModal = false;
  }

  confirmDelete() {
    if (!this.categoryToDelete) return;
    const force = this.categoryToDelete.productCount > 0 ? 'true' : 'false';

    const params = new HttpParams().set('force', force);
    this.http.delete(`/api/categories/${this.categoryToDelete.id}`, { params, withCredentials: true })
      .subscribe({
        next: () => { this.closeDeleteModal(); this.load(); },
        error: (e) => {
          const count = e?.error?.productCount;
          if (e?.status === 409 && typeof count === 'number' && count > 0) {
            const p = new HttpParams().set('force', 'true');
            this.http.delete(`/api/categories/${this.categoryToDelete!.id}`, { params: p, withCredentials: true })
              .subscribe({
                next: () => { this.closeDeleteModal(); this.load(); },
                error: (err) => { this.closeDeleteModal(); alert(err?.error?.error || 'Could not delete category'); }
              });
          } else {
            this.closeDeleteModal();
            alert(e?.error?.error || 'Could not delete category');
          }
        },
      });
  }
}

import { Component, OnInit } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeroImage } from '../../../models/hero-image.model';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-hero-images',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './hero-images.component.html',
  styleUrls: ['./hero-images.component.css'],
})
export class HeroImagesComponent implements OnInit {
  heroImages: HeroImage[] = [];
  loading = true;
  error = false;

  showModal = false;
  selectedHeroImage: HeroImage | null = null;
  form: FormGroup;
  errorMessage: string | null = null;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private titleService: Title
  ) {
    this.form = this.fb.group({
      image_url: [
        '',
        [Validators.required, Validators.pattern(/^https?:\/\/.+/)],
      ],
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle('Hero images');
    this.loadHeroImages();
  }

  loadHeroImages() {
    this.loading = true;
    this.http.get<HeroImage[]>('/api/hero-images').subscribe({
      next: (images = []) => {
        this.heroImages = images.filter((img) => img.id === 1 || img.id === 2);
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  openEditModal(heroImage: HeroImage) {
    this.selectedHeroImage = heroImage;
    this.form.patchValue({
      image_url: heroImage.image_url,
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedHeroImage = null;
    this.form.reset();
    this.errorMessage = null;
  }

  submit() {
    if (this.form.valid && this.selectedHeroImage) {
      this.errorMessage = null;
      const heroImageData: HeroImage = {
        id: this.selectedHeroImage.id,
        image_url: this.form.value.image_url,
      };

      const url = `/api/hero-images/${this.selectedHeroImage.id}`;
      this.http.put(url, heroImageData).subscribe({
        next: () => {
          this.closeModal();
          this.loadHeroImages();
        },
        error: (err) => {
          console.error('Failed to update hero image:', err);
          this.errorMessage = 'Failed to update hero image. Please try again.';
        },
      });
    } else {
      this.markAllAsTouched();
    }
  }

  private markAllAsTouched() {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  handleImageError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.style.display = 'none';
  }
}

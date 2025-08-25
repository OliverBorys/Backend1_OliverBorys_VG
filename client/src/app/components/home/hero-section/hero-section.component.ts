import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeroImage } from '../../../models/hero-image.model';

@Component({
  standalone: true,
  selector: 'app-hero-section',
  templateUrl: './hero-section.component.html',
  styleUrls: ['./hero-section.component.css'],
  imports: [CommonModule, RouterModule]
})
export class HeroSectionComponent implements OnInit {
  heroImages: HeroImage[] = [];
  loading = true;
  error: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<HeroImage[]>('http://localhost:8000/api/hero-images').subscribe({
      next: (data) => {
        this.heroImages = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load hero images';
        this.loading = false;
      }
    });
  }
}

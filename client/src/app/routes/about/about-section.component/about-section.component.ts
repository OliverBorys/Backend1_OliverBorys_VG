import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-about-section',
  templateUrl: './about-section.component.html',
  styleUrls: ['./about-section.component.css'],
  imports: [CommonModule]
})
export class AboutSectionComponent {
  @Input() title!: string;
  @Input() text!: string;
  @Input() image!: string;
  @Input() reverse: boolean = false;
}

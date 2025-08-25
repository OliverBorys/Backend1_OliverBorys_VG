import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-contact-accordion',
  templateUrl: './contact-accordion.component.html',
  styleUrls: ['./contact-accordion.component.css'],
  imports: [CommonModule]
})
export class ContactAccordionComponent {
  activePanel: string | null = null;

  togglePanel(panel: string): void {
    this.activePanel = this.activePanel === panel ? null : panel;
  }
}

import { Component } from '@angular/core';


@Component({
  standalone: true,
  selector: 'app-contact-accordion',
  templateUrl: './contact-accordion.component.html',
  styleUrls: ['./contact-accordion.component.css'],
  imports: []
})
export class ContactAccordionComponent {
  activePanel: string | null = null;

  togglePanel(panel: string): void {
    this.activePanel = this.activePanel === panel ? null : panel;
  }
}

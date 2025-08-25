import { Component } from '@angular/core';
import { ContactAccordionComponent } from '../../components/contact/contact-accordion.component';
import { Title } from '@angular/platform-browser';

@Component({
  standalone: true,
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css'],
  imports: [ContactAccordionComponent]
})

export class ContactComponent {
  constructor(
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Contact');
  }
}

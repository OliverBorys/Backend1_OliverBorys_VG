import { Component } from '@angular/core';


@Component({
  standalone: true,
  selector: 'app-not-found',
  imports: [],
  template: `
    <section class="not-found">
      <h1>404 Not Found</h1>
      <p>Sidan kunde inte hittas.</p>
    </section>
  `,
  styles: [`
    .not-found { padding: 10.5rem 0rem 10.5rem 0rem; text-align: center; }
  `]
})
export class NotFoundComponent {}

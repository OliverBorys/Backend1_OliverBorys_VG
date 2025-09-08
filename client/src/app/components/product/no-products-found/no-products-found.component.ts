import { Component, Input } from '@angular/core';


@Component({
  standalone: true,
  selector: 'app-no-products-found',
  templateUrl: './no-products-found.component.html',
  styleUrls: ['./no-products-found.component.css'],
  imports: []
})
export class NoProductsFoundComponent {
  @Input() query: string = '';
}

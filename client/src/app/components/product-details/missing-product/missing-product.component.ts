import { Component } from '@angular/core';
import { Router } from '@angular/router';


@Component({
  standalone: true,
  selector: 'app-missing-product',
  templateUrl: './missing-product.component.html',
  styleUrls: ['./missing-product.component.css'],
  imports: []
})
export class MissingProductComponent {
  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/']);
  }
}

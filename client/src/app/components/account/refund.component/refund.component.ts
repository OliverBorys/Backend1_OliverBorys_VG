import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';


@Component({
  standalone: true,
  selector: 'app-refund.component',
  imports: [CommonModule, RouterModule],
  templateUrl: './refund.component.html',
  styleUrls: ['./refund.component.css'],
})
export class RefundsComponent {
  constructor(
    private titleService: Title
  ) {}

  pageTitle = 'Returns & Refunds';


  ngOnInit(): void {
    this.titleService.setTitle('Returns & refunds');
  }
}

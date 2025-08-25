import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  navItems = [
    { label: 'Home', path: '/' },
    { label: 'Shop', path: '/shop' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ];

  socialLinks = [
    {
      href: 'https://www.facebook.com',
      label: 'Facebook',
      color: '#0866ff',
      icon: 'facebook',
    },
    {
      href: 'https://www.instagram.com',
      label: 'Instagram',
      color: '#f601b8',
      icon: 'instagram',
    },
    {
      href: 'https://twitter.com',
      label: 'Twitter',
      color: '#1c9cea',
      icon: 'twitter',
    },
    {
      href: 'https://github.com/OliverBorys/JavaScript3_Projekt',
      label: 'GitHub',
      color: 'black',
      icon: 'github',
    },
    {
      href: 'https://www.youtube.com/',
      label: 'YouTube',
      color: '#ff0033',
      icon: 'youtube',
    },
  ];
}

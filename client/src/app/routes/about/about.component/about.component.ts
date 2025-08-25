import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AboutSectionComponent } from '../about-section.component/about-section.component';
import { Title } from '@angular/platform-browser';

@Component({
  standalone: true,
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
  imports: [CommonModule, AboutSectionComponent ]
})
export class AboutComponent implements OnInit {
  constructor(
    private titleService: Title
  ) {}

  isMobile: boolean = false;

  mobileHeroImage = 'https://i.pinimg.com/736x/f3/0f/4e/f30f4ed97dc2b51e98547595b6e96957.jpg';
  desktopHeroImage = 'https://a.storyblok.com/f/273642/1920x595/626d5e48b9/hero-1-1920x595.webp';

  aboutSections = [
    {
      title: 'Luxury with Responsibility:',
      text: "True craftsmanship stands the test of time. We embrace ethical production and responsibly sourced materials, ensuring every piece reflects quality and care. Sustainability isn’t a trend—it’s our commitment to protecting the future while celebrating the artistry of the past.",
      image: 'https://a.storyblok.com/f/273642/1200x1200/e49272671b/morjas-was-born1-1200x1200.webp/m/1280x0/filters:quality(80)',
      reverse: true
    },
    {
      title: 'Where We Come From:',
      text: "Born in Italy, I grew up surrounded by craftsmanship, where fashion is legacy. Later in Sweden, I embraced minimalism and a deep connection to nature. This brand unites both worlds—Italian passion and Swedish innovation, creating luxury that is both responsible and refined.",
      image: 'https://amoureux-du-monde.com/wp-content/uploads/2023/08/Couv-Milan-1r-scaled.jpg',
      reverse: false
    },
    {
      title: 'A Heritage of Contrast:',
      text: "My grandfather believed beauty lay in simplicity, shaped by the wilderness. My nonna grew up in Milan, where fashion was expression. Their worlds collided, creating a balance of quiet nature and vibrant artistry—the same harmony that defines our brand today.",
      image: 'https://a.storyblok.com/f/286233/550x365/4286ab26bd/page-3.jpg',
      reverse: true
    }
  ];

  ngOnInit(): void {
    this.checkWidth();
    window.addEventListener('resize', this.checkWidth.bind(this));
    this.titleService.setTitle('About us');
  }

  checkWidth(): void {
    this.isMobile = window.innerWidth < 768;
  }
}

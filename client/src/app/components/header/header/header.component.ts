import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HeaderService } from '../header.service';
import { HeaderState } from '../../../models/header-state.model';
import { SidebarHeaderComponent } from '../sidebar-header/sidebar-header.component';
import { LoginHeaderComponent } from '../login-header/login-header.component';
import { CartHeaderComponent } from '../cart-header/cart-header.component';
import { NgClass, NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../../services/favorites.services';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterModule,
    SidebarHeaderComponent,
    LoginHeaderComponent,
    CartHeaderComponent,
    NgIf,
    NgClass,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  isHeaderWhite = true;
  state!: HeaderState;
  likedCount = 0;
  private favSub?: Subscription;

  constructor(
    public headerService: HeaderService,
    private router: Router,
    private favs: FavoritesService
  ) {}

  ngOnInit() {
    this.headerService.state$.subscribe((state) => {
      this.state = state;
      const isTransparentPage = this.router.url === '/' || this.router.url === '/about';
      this.isHeaderWhite =
        !isTransparentPage ||
        state.isScrolled ||
        state.isHovered ||
        state.isCartOpen ||
        state.isSidebarOpen;
    });
    this.favs.load();
    this.favSub = this.favs.likedSet$().subscribe((set) => {
      this.likedCount = set.size;
    });
  }

  ngOnDestroy(): void {
    this.favSub?.unsubscribe();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.headerService.setScrolled(window.scrollY > 50);
  }

  handleSearchSubmit(event: Event) {
    event.preventDefault();
    const input = (event.target as HTMLFormElement)['q'] as HTMLInputElement;
    const query = input.value.trim();
    if (query) {
      this.router.navigate(['/search'], { queryParams: { q: query } });
      input.value = '';
    }
  }
}

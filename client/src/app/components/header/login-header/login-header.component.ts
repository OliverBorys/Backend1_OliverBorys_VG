import { Component, Input, ElementRef, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HeaderService } from '../header.service';
import { HeaderState } from '../../../models/header-state.model';
import { NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { FormsModule, NgForm } from '@angular/forms';
import { LoginResponse } from '../../../models/login-response.model';
import { FavoritesService } from '../../../services/favorites.services';

@Component({
  selector: 'app-login-header',
  standalone: true,
  imports: [NgIf, FormsModule],
  templateUrl: './login-header.component.html',
  styleUrls: ['./login-header.component.css'],
})
export class LoginHeaderComponent implements OnInit, OnDestroy {
  @Input() isHeaderWhite = false;

  isPopupOpen = false;
  isRegisterMode = false;
  errorMsg = '';

  state!: HeaderState;
  private stateSub!: Subscription;
  private removeClickListener: () => void = () => {};

  constructor(
    public headerService: HeaderService,
    private el: ElementRef,
    private http: HttpClient,
    private renderer: Renderer2,
    private favs: FavoritesService
  ) {}

  ngOnInit(): void {
    this.stateSub = this.headerService.state$.subscribe((state) => {
      this.state = state;
    });
    this.removeClickListener = this.renderer.listen('document', 'mousedown', this.handleClickOutside);
  }

  ngOnDestroy(): void {
    this.stateSub?.unsubscribe();
    this.removeClickListener();
  }

  handleClickOutside = (e: MouseEvent) => {
    setTimeout(() => {
      const popup = this.el.nativeElement.querySelector('.popup');
      if (this.isPopupOpen && popup && !popup.contains(e.target as Node)) {
        this.isPopupOpen = false;
        this.isRegisterMode = false;
        this.errorMsg = '';
      }
    }, 0);
  };

  togglePopup(event?: MouseEvent) {
    event?.stopPropagation();
    this.isPopupOpen = !this.isPopupOpen;
    if (!this.isPopupOpen) {
      this.isRegisterMode = false;
      this.errorMsg = '';
    }
  }

  switchToRegister() {
    this.isRegisterMode = true;
    this.errorMsg = '';
  }

  switchToLogin() {
    this.isRegisterMode = false;
    this.errorMsg = '';
  }

  handleLogin(form: NgForm) {
    const { username, password } = form.value;
    if (!username || !password) {
      this.errorMsg = 'Please provide username and password';
      return;
    }
    this.http
      .post<LoginResponse>('/api/auth/login', { username, password }, { withCredentials: true })
      .subscribe({
        next: (res) => {
          this.headerService.setLoggedIn(res.user);
          this.isPopupOpen = false;
          this.isRegisterMode = false;
          this.errorMsg = '';
          this.favs.load();
        },
        error: (err) => {
          this.errorMsg = err.error?.error || 'Login failed';
        },
      });
  }

  handleRegister(form: NgForm) {
    const { username, password, confirmPassword } = form.value;
    if (!username || !password || !confirmPassword) {
      this.errorMsg = 'Please fill in all fields';
      return;
    }
    if (password !== confirmPassword) {
      this.errorMsg = 'Passwords do not match';
      return;
    }

    this.http
      .post('/api/auth/register', { username, password, role: 'customer' }, { withCredentials: true })
      .subscribe({
        next: () => {
          this.http
            .post<LoginResponse>('/api/auth/login', { username, password }, { withCredentials: true })
            .subscribe({
              next: (res) => {
                this.headerService.setLoggedIn(res.user);
                this.isPopupOpen = false;
                this.isRegisterMode = false;
                this.errorMsg = '';
                this.favs.load();
              },
              error: () => {
                this.isRegisterMode = false;
                this.errorMsg = 'Account created. Please sign in.';
              },
            });
        },
        error: (err) => {
          this.errorMsg = err.error?.error || 'Registration failed';
        },
      });
  }

  handleLogout() {
    this.http.post('/api/auth/logout', {}, { withCredentials: true }).subscribe({
      next: () => {
        this.headerService.logout();
        this.favs.reset();
        this.favs.load();
        this.isPopupOpen = false;
        this.isRegisterMode = false;
        this.errorMsg = '';
      },
      error: () => {
        this.headerService.logout();
        this.favs.reset();
        this.favs.load();
        this.isPopupOpen = false;
        this.isRegisterMode = false;
        this.errorMsg = '';
      }
    });
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { HeaderState } from '../../models/header-state.model';
import { User } from '../../models/user.model';

@Injectable({ providedIn: 'root' })
export class HeaderService {
  private initialState: HeaderState = {
    isLoggedIn: localStorage.getItem('adminUser') !== null,
    user: JSON.parse(localStorage.getItem('adminUser') || 'null') as User | null,
    isScrolled: false,
    isHovered: false,
    isSidebarOpen: false,
    isCartOpen: false
  };

  private stateSubject = new BehaviorSubject<HeaderState>(this.initialState);
  state$ = this.stateSubject.asObservable();

  private cartChangedSubject = new Subject<void>();
  cartChanged$ = this.cartChangedSubject.asObservable();

  private get state(): HeaderState {
    return this.stateSubject.getValue();
  }

  private setState(newState: Partial<HeaderState>) {
    this.stateSubject.next({ ...this.state, ...newState });
  }

  getCurrentState(): HeaderState {
    return this.state;
  }

  setLoggedIn(user: User) {
    localStorage.setItem('adminUser', JSON.stringify(user));
    this.setState({ user, isLoggedIn: true });
  }

  logout() {
    localStorage.removeItem('adminUser');
    this.setState({ user: null, isLoggedIn: false });
  }

  setScrolled(scrolled: boolean) {
    this.setState({ isScrolled: scrolled });
  }

  setHovered(hovered: boolean) {
    this.setState({ isHovered: hovered });
  }

  toggleSidebar(force?: boolean) {
    this.setState({ isSidebarOpen: force ?? !this.state.isSidebarOpen });
  }

  toggleCart(force?: boolean): void {
    this.setState({ isCartOpen: force ?? !this.state.isCartOpen });
  }

  openCart(): void {
    this.toggleCart(true);
  }

  closeCart(): void {
    this.toggleCart(false);
  }

  openCartTemporarily(duration: number = 3000): void {
    this.openCart();
    setTimeout(() => this.closeCart(), duration);
  }

  notifyCartChanged(): void {
    this.cartChangedSubject.next();
  }
}

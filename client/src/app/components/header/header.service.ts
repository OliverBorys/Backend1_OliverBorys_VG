import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HeaderState } from '../../models/header-state.model';
import { User } from '../../models/user.model';
import { CartItem } from '../../models/cart-item.model';

type CartSnapshot = { items: CartItem[]; total: number };

@Injectable({ providedIn: 'root' })
export class HeaderService {
  // ---------- Header UI-state (oförändrad API) ----------
  private initialState: HeaderState = {
    isLoggedIn: localStorage.getItem('adminUser') !== null,
    user: JSON.parse(localStorage.getItem('adminUser') || 'null') as User | null,
    isScrolled: false,
    isHovered: false,
    isSidebarOpen: false,
    isCartOpen: false,
  };
  private stateSubject = new BehaviorSubject<HeaderState>(this.initialState);
  state$ = this.stateSubject.asObservable();

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
  toggleCart(force?: boolean) {
    this.setState({ isCartOpen: force ?? !this.state.isCartOpen });
  }
  openCart() {
    this.toggleCart(true);
  }
  closeCart() {
    this.toggleCart(false);
  }
  openCartTemporarily(duration: number = 3000) {
    this.openCart();
    setTimeout(() => this.closeCart(), duration);
  }

  // ---------- Cart-state (NY) ----------
  private cartSubject = new BehaviorSubject<CartSnapshot>({ items: [], total: 0 });
  /** Prenumerera på varukorgen (items + total) */
  cart$ = this.cartSubject.asObservable();

  constructor(private http: HttpClient) {
    // Hämta cart vid uppstart (gäst = session, inloggad = DB)
    this.refreshCart().catch(() => {});
  }

  // Intern uppdaterare
  private setCart(snapshot: CartSnapshot) {
    this.cartSubject.next(snapshot);
  }

  /** Hämta nuvarande varukorg från servern */
  async refreshCart() {
    const res = await firstValueFrom(
      this.http.get<{ loggedIn: boolean; items: CartItem[]; total: number }>('/api/cart', {
        withCredentials: true,
      })
    );
    this.setCart({ items: res.items ?? [], total: res.total ?? 0 });
  }

  /** Lägg till (ökar med 1) */
  async addToCart(productId: number) {
    await firstValueFrom(this.http.post(`/api/cart/${productId}`, {}, { withCredentials: true }));
    await this.refreshCart();
  }

  /** Sätt exakt antal (0 = ta bort) */
  async setQuantity(productId: number, quantity: number) {
    await firstValueFrom(
      this.http.put(`/api/cart/${productId}`, { quantity }, { withCredentials: true })
    );
    await this.refreshCart();
  }

  /** Ta bort helt */
  async remove(productId: number) {
    await firstValueFrom(this.http.delete(`/api/cart/${productId}`, { withCredentials: true }));
    await this.refreshCart();
  }

  /** Körs efter login/logout för att synka state (servern migrerar gäst→DB vid login) */
  async rehydrateAfterAuthChange() {
    await this.refreshCart();
  }

  /** Checkout: konverterar 'cart' → 'created' order (kräver inloggad) */
  async checkout(): Promise<{ orderId: number; message: string }> {
    const res = await firstValueFrom(
      this.http.post<{ orderId: number; message: string }>(
        '/api/orders/checkout',
        {},
        { withCredentials: true }
      )
    );
    // Servern tömmer carten via statusbyte; vi speglar lokalt:
    this.setCart({ items: [], total: 0 });
    return res;
  }

  get isLoggedIn(): boolean {
    return this.getCurrentState().isLoggedIn;
  }

  notifyCartChanged(): void {
    this.refreshCart().catch(() => {});
  }
}

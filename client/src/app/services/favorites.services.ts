import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private likedIds$ = new BehaviorSubject<Set<number>>(new Set());

  constructor(private http: HttpClient) {}

  load() {
    return this.http
      .get<{ loggedIn: boolean; items: { id: number }[] }>('/api/favorites', { withCredentials: true })
      .subscribe((res) => {
        const set = new Set<number>(res.items.map(p => p.id));
        this.likedIds$.next(set);
      });
  }

  reset() {
    this.likedIds$.next(new Set());
  }

  likedSet$() {
    return this.likedIds$.asObservable();
  }

  isLiked(id: number) {
    return this.likedIds$.value.has(id);
  }

  toggle(productId: number) {
    if (this.isLiked(productId)) {
      this.http
        .delete(`/api/favorites/${productId}`, { withCredentials: true })
        .subscribe(() => {
          const next = new Set(this.likedIds$.value);
          next.delete(productId);
          this.likedIds$.next(next);
        });
    } else {
      this.http
        .post(`/api/favorites/${productId}`, {}, { withCredentials: true })
        .subscribe(() => {
          const next = new Set(this.likedIds$.value);
          next.add(productId);
          this.likedIds$.next(next);
        });
    }
  }
}

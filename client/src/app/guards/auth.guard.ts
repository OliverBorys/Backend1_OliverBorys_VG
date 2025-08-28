import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { HeaderService } from '../components/header/header.service';
import { User } from '../models/user.model';

type MeResponse = { user: User | null };

export const authGuard: CanActivateFn = (route) => {
  const http = inject(HttpClient);
  const router = inject(Router);
  const header = inject(HeaderService);
  const requiredRole = route.data?.['role'] as 'admin' | 'customer' | undefined;
  const to404: UrlTree = router.createUrlTree(['/404']);

  return http.get<MeResponse>('/api/auth/me', { withCredentials: true }).pipe(
    map((res) => {
      const user = res.user;
      if (!user) {
        return to404;
      }
      header.setLoggedIn(user);

      if (requiredRole === 'admin' && user.role !== 'admin') {
        return to404;
      }

      if (requiredRole === 'customer' && !['customer', 'admin'].includes(user.role)) {
        return to404;
      }

      return true;
    }),
    catchError(() => of(to404))
  );
};

import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { HeaderService } from '../components/header/header.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private headerService: HeaderService, private router: Router) {}

  canActivate(): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    const isLoggedIn = this.headerService.getCurrentState().isLoggedIn;
    if (isLoggedIn) {
      return true;
    } else {
      return this.router.createUrlTree(['/']);
    }
  }
}

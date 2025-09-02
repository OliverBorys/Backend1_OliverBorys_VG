import { Routes } from '@angular/router';
import { HomeComponent } from './routes/home/home.component';
import { ContactComponent } from './routes/contact/contact.component';
import { AboutComponent } from './routes/about/about.component/about.component';
import { ShopComponent } from './routes/shop/shop.component';
import { ProductDetailsComponent } from './routes/product-details/product-details.component';
import { SearchComponent } from './routes/search/search.component';
import { CheckoutComponent } from './routes/checkout/checkout.component';

import { NotFoundComponent } from './routes/not-found/not-found.component';

import { accountComponent } from './routes/account/account.component/account.component';
import { AccountComponent } from './components/account/account.component/account.component';
import { FavoritesComponent } from './components/account/favorites.component/favorites.component';
import { YourOrdersComponent } from './components/account/your-orders.component/your-orders.component';
import { RefundsComponent } from './components/account/refund.component/refund.component';

import { AdminComponent } from './routes/admin/admin.component/admin.component';
import { DashboardComponent } from './components/admin/dashboard.component/dashboard.component';
import { OrdersComponent } from './components/admin/orders.component/orders.component';
import { ProductsComponent } from './components/admin/products.component/products.component';
import { HeroImagesComponent } from './components/admin/hero-images.component/hero-images.component';

import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'about', component: AboutComponent },
  { path: 'shop', component: ShopComponent },
  { path: 'product/:id', component: ProductDetailsComponent },
  { path: 'search', component: SearchComponent },
  { path: 'checkout', component: CheckoutComponent },
  {
    path: 'account',
    component: accountComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    data: { role: 'customer' },
    children: [
      { path: '', component: AccountComponent },
      { path: 'your-orders', component: YourOrdersComponent },
      { path: 'favorites',  component: FavoritesComponent },
      { path: 'refund', component: RefundsComponent },
    ],
  },

  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    data: { role: 'admin' },
    children: [
      { path: '', component: DashboardComponent },
      { path: 'products', component: ProductsComponent },
      { path: 'hero-images', component: HeroImagesComponent },
      { path: 'orders', component: OrdersComponent },
    ],
  },

  { path: '404', component: NotFoundComponent },
  { path: '**', redirectTo: '404' }
];

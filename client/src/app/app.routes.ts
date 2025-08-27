import { Routes } from '@angular/router';
import { HomeComponent } from './routes/home/home.component';
import { ContactComponent } from './routes/contact/contact.component';
import { AboutComponent } from './routes/about/about.component/about.component';
import { ShopComponent } from './routes/shop/shop.component';
import { ProductDetailsComponent } from './routes/product-details/product-details.component';
import { SearchComponent } from './routes/search/search.component';
import { CheckoutComponent } from './routes/checkout/checkout.component';
import { AdminComponent } from './routes/admin/admin.component/admin.component';
import { DashboardComponent } from './components/admin/dashboard.component/dashboard.component';
import { OrdersComponent } from './components/admin/orders.component/orders.component';
import { ProductsComponent } from './components/admin/products.component/products.component';
import { HeroImagesComponent } from './components/admin/hero-images.component/hero-images.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'about', component: AboutComponent },
  { path: 'shop', component: ShopComponent },
  { path: 'product/:id', component: ProductDetailsComponent },
  { path: 'search', component: SearchComponent },
  { path: 'checkout', component: CheckoutComponent },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: DashboardComponent },
      { path: 'products', component: ProductsComponent },
      { path: 'hero-images', component: HeroImagesComponent },
      { path: 'orders', component: OrdersComponent },
    ],
  },
];

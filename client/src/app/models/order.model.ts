import { CartItem } from './cart-item.model';

export interface Order {
  id: number;
  date: string;
  items: CartItem[];
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    mobilePhone: string;
    address: string;
    city: string;
    postalCode: string;
    paymentMethod: string;
  };
}

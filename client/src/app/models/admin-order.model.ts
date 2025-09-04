export interface AdminOrderItem {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  image?: string | null;
}

export interface AdminCustomer {
  username?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobilePhone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

export interface AdminOrder {
  id: number;
  userId: number | null;
  status: string;
  createdAt: string;
  paymentMethod: string | null;
  customer: AdminCustomer;
  items: AdminOrderItem[];
}

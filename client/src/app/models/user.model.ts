export type Role = 'admin' | 'customer';

export interface User {
  id: number;
  username: string;
  // password: string;
  role: 'admin' | 'customer';
}

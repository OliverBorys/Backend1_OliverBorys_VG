import { User } from './user.model';

export interface LoginResponse {
  message?: string;
  user: User;
}

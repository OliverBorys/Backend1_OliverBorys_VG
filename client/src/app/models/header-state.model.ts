import { User } from "./user.model";

export interface HeaderState {
  isLoggedIn: boolean;
  user?: User | null;
  isScrolled: boolean;
  isHovered: boolean;
  isSidebarOpen: boolean;
  isCartOpen: boolean;
}

import { Product } from "./product.model";

export interface FullProduct extends Product {
  secondaryImage1?: string;
  secondaryImage2?: string;
  secondaryImage3?: string;
  productDescription: string;
  isNew: string;
  publishingDate: string;
  categoryName?: string;
}

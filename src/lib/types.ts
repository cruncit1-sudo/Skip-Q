export type FoodType = "food" | "snack" | "drink";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  type: FoodType;
  active: boolean;
  quantity: number;
  image?: string;
}

export interface CartItem extends MenuItem {
  cartQuantity: number;
}

export interface Order {
  id: string;
  orderId: string;
  items: CartItem[];
  total: number;
  paymentMethod: "online" | "cash";
  paymentStatus: "paid" | "pending";
  status: "pending" | "confirmed" | "completed";
  createdAt: Date;
}

export interface Canteen {
  id: string;
  name: string;
  slogan: string;
}

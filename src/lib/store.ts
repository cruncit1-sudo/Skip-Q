import { create } from "zustand";
import { CartItem, MenuItem, Order, StaffMember, Canteen } from "./types";

const generateOrderId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "ORD-";
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};

const defaultCanteen: Canteen = {
  id: "1",
  name: "Cruncit Bites",
  slogan: "Fresh Food, Happy Mood 🍽️",
};

interface StoreState {
  canteen: Canteen;
  cart: CartItem[];
  currentUser: { phoneNumber: string } | null;
}

interface StoreActions {
  setCurrentUser: (user: { phoneNumber: string } | null) => void;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}

type AppState = StoreState & StoreActions;

export const useStore = create<AppState>((set, get) => ({
  canteen: defaultCanteen,
  cart: [],
  currentUser: null,

  setCurrentUser: (user) => set({ currentUser: user }),

  addToCart: (item) => {
    set((state) => {
      const existing = state.cart.find((c) => c.id === item.id);
      if (existing) {
        return { cart: state.cart.map((c) => c.id === item.id ? { ...c, cartQuantity: c.cartQuantity + 1 } : c) };
      }
      return { cart: [...state.cart, { ...item, cartQuantity: 1 }] };
    });
  },

  removeFromCart: (id) => set((state) => ({ cart: state.cart.filter((c) => c.id !== id) })),

  updateCartQuantity: (id, qty) => {
    set((state) => {
      if (qty <= 0) return { cart: state.cart.filter((c) => c.id !== id) };
      return { cart: state.cart.map((c) => (c.id === id ? { ...c, cartQuantity: qty } : c)) };
    });
  },

  clearCart: () => set({ cart: [] }),

  getCartTotal: () => get().cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0),
}));
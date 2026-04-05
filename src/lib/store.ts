import { create } from "zustand";
import { CartItem, MenuItem, Order, StaffMember, Canteen } from "./types";

// Generate order ID
const generateOrderId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "ORD-";
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};

// Sample canteen
const defaultCanteen: Canteen = {
  id: "1",
  name: "Campus Bites",
  slogan: "Fresh Food, Happy Mood 🍽️",
};

// Sample menu items
const defaultMenu: MenuItem[] = [
  { id: "1", name: "Chicken Biryani", price: 120, type: "food", active: true, quantity: 50 },
  { id: "2", name: "Veg Fried Rice", price: 80, type: "food", active: true, quantity: 40 },
  { id: "3", name: "Paneer Butter Masala", price: 100, type: "food", active: true, quantity: 30 },
  { id: "4", name: "Egg Dosa", price: 50, type: "food", active: true, quantity: 60 },
  { id: "5", name: "Chapathi Set", price: 60, type: "food", active: true, quantity: 45 },
  { id: "6", name: "Samosa", price: 15, type: "snack", active: true, quantity: 100 },
  { id: "7", name: "Vada", price: 12, type: "snack", active: true, quantity: 80 },
  { id: "8", name: "Chips", price: 20, type: "snack", active: true, quantity: 60 },
  { id: "9", name: "Bajji", price: 25, type: "snack", active: true, quantity: 50 },
  { id: "10", name: "Pani Puri", price: 30, type: "snack", active: true, quantity: 40 },
  { id: "11", name: "Tea", price: 15, type: "drink", active: true, quantity: 200 },
  { id: "12", name: "Coffee", price: 20, type: "drink", active: true, quantity: 150 },
  { id: "13", name: "Fresh Juice", price: 40, type: "drink", active: true, quantity: 30 },
  { id: "14", name: "Buttermilk", price: 15, type: "drink", active: true, quantity: 70 },
  { id: "15", name: "Lassi", price: 35, type: "drink", active: true, quantity: 50 },
];

interface AppState {
  canteen: Canteen;
  menu: MenuItem[];
  cart: CartItem[];
  orders: Order[];
  staff: StaffMember[];
  
  // Cart actions
  addToCart: (item: MenuItem) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  
  // Order actions
  createOrder: (paymentMethod: "online" | "cash") => Order;
  getOrderByOrderId: (orderId: string) => Order | undefined;
  
  // Menu actions
  addMenuItem: (item: Omit<MenuItem, "id">) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  
  // Staff actions
  addStaff: (staff: Omit<StaffMember, "id" | "createdAt">) => void;
  removeStaff: (id: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  canteen: defaultCanteen,
  menu: defaultMenu,
  cart: [],
  orders: [],
  staff: [],

  addToCart: (item) => {
    set((state) => {
      const existing = state.cart.find((c) => c.id === item.id);
      if (existing) {
        return {
          cart: state.cart.map((c) =>
            c.id === item.id ? { ...c, cartQuantity: c.cartQuantity + 1 } : c
          ),
        };
      }
      return { cart: [...state.cart, { ...item, cartQuantity: 1 }] };
    });
  },

  removeFromCart: (id) => {
    set((state) => ({ cart: state.cart.filter((c) => c.id !== id) }));
  },

  updateCartQuantity: (id, qty) => {
    set((state) => {
      if (qty <= 0) return { cart: state.cart.filter((c) => c.id !== id) };
      return {
        cart: state.cart.map((c) => (c.id === id ? { ...c, cartQuantity: qty } : c)),
      };
    });
  },

  clearCart: () => set({ cart: [] }),

  getCartTotal: () => {
    return get().cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  },

  createOrder: (paymentMethod) => {
    const state = get();
    const order: Order = {
      id: Date.now().toString(),
      orderId: generateOrderId(),
      items: [...state.cart],
      total: state.getCartTotal(),
      paymentMethod,
      paymentStatus: paymentMethod === "online" ? "paid" : "pending",
      status: "confirmed",
      createdAt: new Date(),
    };
    set((s) => ({ orders: [...s.orders, order], cart: [] }));
    return order;
  },

  getOrderByOrderId: (orderId) => {
    return get().orders.find((o) => o.orderId === orderId);
  },

  addMenuItem: (item) => {
    set((state) => ({
      menu: [...state.menu, { ...item, id: Date.now().toString() }],
    }));
  },

  updateMenuItem: (id, updates) => {
    set((state) => ({
      menu: state.menu.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  },

  addStaff: (staff) => {
    set((state) => ({
      staff: [...state.staff, { ...staff, id: Date.now().toString(), createdAt: new Date() }],
    }));
  },

  removeStaff: (id) => {
    set((state) => ({ staff: state.staff.filter((s) => s.id !== id) }));
  },
}));

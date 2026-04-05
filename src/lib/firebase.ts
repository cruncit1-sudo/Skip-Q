import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAIAQnTZkJh6YL5QT7O-BTeZRGyX49nbHc",
  authDomain: "food-service-aa0e5.firebaseapp.com",
  projectId: "food-service-aa0e5",
  storageBucket: "food-service-aa0e5.firebasestorage.app",
  messagingSenderId: "193496126694",
  appId: "1:193496126694:web:d07c6325f4fc9eada91727",
  measurementId: "G-RMBJETPZH3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;

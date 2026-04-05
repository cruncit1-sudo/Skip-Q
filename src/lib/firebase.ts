import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// REPLACE THESE WITH YOUR ACTUAL FIREBASE PROJECT CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAIAQnTZkJh6YL5QT7O-BTeZRGyX49nbHc",
  authDomain: "food-service-aa0e5.firebaseapp.com",
  projectId: "food-service-aa0e5",
  storageBucket: "food-service-aa0e5.firebasestorage.app",
  messagingSenderId: "193496126694",
  appId: "1:193496126694:web:d07c6325f4fc9eada91727",
  measurementId: "G-RMBJETPZH3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
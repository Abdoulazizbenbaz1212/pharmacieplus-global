// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBbB_3NPYSh4RhcXCDrDYZtziisDjRzlvE",
  authDomain: "pharmacieplus-global.firebaseapp.com",
  projectId: "pharmacieplus-global",
  storageBucket: "pharmacieplus-global.firebasestorage.app",
  messagingSenderId: "9762469036",
  appId: "1:9762469036:web:6b780410e0c471040cdb09"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Auth
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;

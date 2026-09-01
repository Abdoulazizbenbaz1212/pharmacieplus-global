import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBbB_3NPYSh4RhcXCDrDYZtziisDjRzlvE",
  authDomain: "pharmacieplus-global.firebaseapp.com",
  projectId: "pharmacieplus-global",
  storageBucket: "pharmacieplus-global.firebasestorage.app",
  messagingSenderId: "9762469036",
  appId: "1:9762469036:web:6b780410e0c471040cdb09"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

export default app;

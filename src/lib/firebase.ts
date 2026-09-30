// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBtnRsa4r2UqFvxlcLA480o8Fs9v8sp-oo",
  authDomain: "edco-20fbe.firebaseapp.com",
  projectId: "edco-20fbe",
  storageBucket: "edco-20fbe.firebasestorage.app",
  messagingSenderId: "334418435168",
  appId: "1:334418435168:web:964f0e01a8b045c3fbb705",
  measurementId: "G-V9DZ6YMCHR"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const setUserRole = async (uid: string, role: "student" | "teacher") => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    role,
    createdAt: new Date(),
  });
};

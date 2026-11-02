// www/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCXqXYc4QsUCSLqrlkPafwzy8KjTSDEU80",
  authDomain: "tat-express-6d7b1.firebaseapp.com",
  projectId: "tat-express-6d7b1",
  storageBucket: "tat-express-6d7b1.firebasestorage.app",
  messagingSenderId: "722605805863",
  appId: "1:722605805863:web:00aa03c57b088ce9ba1902",
  measurementId: "G-KDQQ9FTJP6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export { createUserWithEmailAndPassword, signInWithEmailAndPassword, doc, setDoc };
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCDOfvNO1zNECyWO8yN8nwiufR6TTLndcw",
    authDomain: "futbolapro-718f4.firebaseapp.com",
    projectId: "futbolapro-718f4",
    storageBucket: "futbolapro-718f4.firebasestorage.app",
    messagingSenderId: "234692334310",
    appId: "1:234692334310:web:fbf4e95d123be614b5a127"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

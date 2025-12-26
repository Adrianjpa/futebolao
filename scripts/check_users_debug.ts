
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import * as fs from 'fs';
import * as path from 'path';

// Manual Env Parsing
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/"/g, '');
            process.env[key] = value;
        }
    });
}


const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

async function checkData() {
    try {
        console.log("--- Checking Championships ---");
        const campsSnap = await getDocs(collection(db, "championships"));
        let euroId = "";

        campsSnap.forEach(doc => {
            const data = doc.data();
            if (data.name.includes("Eurocopa")) {
                console.log(`Found Eurocopa: ${doc.id} - ${data.name}`);
                console.log(`Participants Count: ${data.participants?.length || 0}`);
                console.log("Participants Data:", JSON.stringify(data.participants, null, 2));
                euroId = doc.id;
            }
        });

        console.log("\n--- Checking Users Collection ---");
        const usersSnap = await getDocs(collection(db, "users"));
        console.log(`Total Users in DB: ${usersSnap.size}`);
        usersSnap.forEach(doc => {
            const u = doc.data();
            console.log(`User [${doc.id}]: ${u.displayName || u.nome} (${u.email}) - Status: ${u.status}`);
        });

    } catch (e) {
        console.error("Error:", e);
    }
}

checkData();

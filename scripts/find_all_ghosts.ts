
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
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

async function findGhostPlayers() {
    try {
        console.log("Searching for Euro 2012 ID...");
        const campsSnap = await getDocs(collection(db, "championships"));
        let euroId = "";
        campsSnap.forEach(doc => {
            if (doc.data().name.includes("Eurocopa")) {
                euroId = doc.id;
            }
        });

        if (!euroId) {
            console.log("Eurocopa not found.");
            return;
        }
        console.log(`Found Eurocopa ID: ${euroId}`);

        console.log("Fetching predictions for Euro 2012...");
        const q = query(collection(db, "predictions"), where("championshipId", "==", euroId));
        const preds = await getDocs(q);

        const participants = new Set<string>();
        preds.forEach(doc => {
            const data = doc.data();
            if (data.userName) participants.add(data.userName);
        });

        console.log("Found Names in Predictions:", Array.from(participants));

        console.log("Checking which ones exist in 'users' collection...");
        const usersSnap = await getDocs(collection(db, "users"));
        const existingEmails = new Set();
        usersSnap.forEach(doc => existingEmails.add(doc.data().email));

        const ghosts = [];
        for (const name of participants) {
            const email = `${name.toLowerCase()}@exemplo.com`;
            if (!existingEmails.has(email)) {
                ghosts.push(name);
            }
        }

        console.log("CONFIRMED GHOSTS TO CREATE:", ghosts);

    } catch (e) {
        console.error(e);
    }
}

findGhostPlayers();

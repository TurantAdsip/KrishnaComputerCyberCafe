import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDE9ToIeTnSRL9KQ7UdP1dv2r5Shnf7d7A",
    authDomain: "krishnaprep-182c6.firebaseapp.com",
    projectId: "krishnaprep-182c6",
    storageBucket: "krishnaprep-182c6.firebasestorage.app",
    messagingSenderId: "416316408972",
    appId: "1:416316408972:web:837350f271f0cb4e3de7a9",
    measurementId: "G-JNRWG6VJ92"
};


// Main Firebase App (Student)
const app = initializeApp(firebaseConfig);

// Separate Firebase App (Admin)
const adminApp = initializeApp(firebaseConfig, "adminApp");

// Student Authentication
export const auth = getAuth(app);

// Admin Authentication
export const adminAuth = getAuth(adminApp);

// Common Firestore Database
export const db = getFirestore(app);

// Separate Firestore Database for Admin
export const adminDb = getFirestore(adminApp);

console.log("KrishnaPrep Firebase Connected Successfully!");

// const app = initializeApp(firebaseConfig);

// export const auth = getAuth(app);
// export const db = getFirestore(app);

// console.log("KrishnaPrep Firebase Connected Successfully!");
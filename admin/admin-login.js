
// import { auth, db } from "../js/firebase-config.js";
// import { adminAuth, db } from "../js/firebase-config.js";
import { adminAuth, adminDb } from "../js/firebase-config.js";


import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";


const adminLoginForm = document.getElementById("adminLoginForm");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");


adminLoginForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;

    loginBtn.disabled = true;
    loginMessage.style.color = "#555";
    loginMessage.textContent = "Checking admin account...";

    try {

        // STEP 1: Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(
            adminAuth,
            email,
            password
        );

        const user = userCredential.user;

        // STEP 2: Check Admin Document
        // const adminRef = doc(db, "admins", user.uid);
        const adminRef = doc(adminDb, "admins", user.uid);
        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists()) {

            await signOut(adminAuth);

            throw new Error("You are not authorized as an admin.");

        }

        const adminData = adminSnap.data();

        // STEP 3: Check Admin Status
        if (adminData.active !== true) {

            await signOut(adminAuth);

            throw new Error("Your admin account is inactive.");

        }

        // STEP 4: Check Admin Role
        if (
            adminData.role !== "superAdmin" &&
            adminData.role !== "admin"
        ) {

            await signOut(adminAuth);

            throw new Error("Invalid admin role.");

        }

        // STEP 5: Login Successful
        loginMessage.style.color = "green";
        loginMessage.textContent = "Login successful! Redirecting...";

        window.location.href = "admin-dashboard.html";

    } catch (error) {

        console.error("Admin Login Error:", error);

        loginMessage.style.color = "red";

        if (error.code === "auth/invalid-credential") {
            loginMessage.textContent = "Invalid email or password.";
        } else if (error.code === "auth/too-many-requests") {
            loginMessage.textContent = "Too many attempts. Try again later.";
        } else {
            loginMessage.textContent = error.message;
        }

    } finally {

        loginBtn.disabled = false;

    }

});

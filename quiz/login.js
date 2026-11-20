
import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

import { auth, db } from "../js/firebase-config.js";

const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const messageBox = document.getElementById("message");

// Display messages
function showMessage(message, type) {
    messageBox.textContent = message;
    messageBox.className = "message " + type;
}

// Show / Hide Password
document.querySelectorAll(".toggle-password").forEach(button => {
    button.addEventListener("click", function () {
        const input = document.getElementById(this.dataset.target);

        if (input.type === "password") {
            input.type = "text";
            this.textContent = "Hide";
        } else {
            input.type = "password";
            this.textContent = "Show";
        }
    });
});

// Firebase error messages
function getFirebaseError(error) {
    const errors = {
        "auth/invalid-credential":
            "Invalid email or password.",

        "auth/user-not-found":
            "No account found. Please register first.",

        "auth/wrong-password":
            "Incorrect password.",

        "auth/invalid-email":
            "Please enter a valid email address.",

        "auth/too-many-requests":
            "Too many attempts. Please try again later.",

        "auth/network-request-failed":
            "Network error. Please check your internet connection."
    };

    return errors[error.code] ||
        error.message ||
        "Login failed. Please try again.";
}

// Login Form Submit
loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const studentEmail =
        document.getElementById("studentEmail").value.trim().toLowerCase();

    const password =
        document.getElementById("password").value;

    if (!studentEmail || !password) {
        showMessage("Please enter email and password.", "error");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    messageBox.className = "message";
    messageBox.textContent = "";

    try {

        // Firebase Authentication Login
        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                studentEmail,
                password
            );

        const user = userCredential.user;

        // Fetch student profile from Firestore
        const studentRef = doc(db, "students", user.uid);
        const studentSnapshot = await getDoc(studentRef);

        if (!studentSnapshot.exists()) {
            await signOut(auth);
            throw new Error(
                "Student profile not found. Please contact support."
            );
        }

        const studentData = studentSnapshot.data();

        // Check account status
        if (studentData.accountStatus !== "ACTIVE") {
            await signOut(auth);
            throw new Error(
                "Your account is not active. Please contact support."
            );
        }

        // Store student profile for dashboard display
        const student = {
            studentId: studentData.studentId,
            studentName: studentData.studentName,
            studentEmail: studentData.email
        };

        sessionStorage.setItem(
            "krishnaprep_student",
            JSON.stringify(student)
        );

        showMessage(
            "Login successful. Opening dashboard...",
            "success"
        );

        setTimeout(() => {
            window.location.href = "student-dashboard.html";
        }, 1000);

    } catch (error) {

        console.error("Login Error:", error);

        showMessage(
            getFirebaseError(error),
            "error"
        );

        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
    }

});

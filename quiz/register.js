
import {
    createUserWithEmailAndPassword,
    updateProfile,
    signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

import { auth, db } from "../js/firebase-config.js";

const registerForm = document.getElementById("registerForm");
const registerBtn = document.getElementById("registerBtn");
const messageBox = document.getElementById("message");

function showMessage(message, type) {
    messageBox.textContent = message;
    messageBox.className = "message " + type;
}

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

function getFirebaseError(error) {
    const errors = {
        "auth/email-already-in-use": "This email is already registered. Please login.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password should contain at least 8 characters.",
        "auth/network-request-failed": "Network error. Please check your internet connection.",
        "auth/too-many-requests": "Too many attempts. Please try again later."
    };

    return errors[error.code] || error.message || "Registration failed. Please try again.";
}

registerForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const studentName = document.getElementById("studentName").value.trim();
    const studentEmail = document.getElementById("studentEmail").value.trim().toLowerCase();
    const studentGender = document.getElementById("studentGender").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (studentName.length < 2) {
        showMessage("Please enter your full name.", "error");
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
        showMessage("Please enter a valid email address.", "error");
        return;
    }

    if (!studentGender) {
        showMessage("Please select your gender.", "error");
        return;
    }

    if (password.length < 8 || password.length > 128) {
        showMessage("Password must contain 8 to 128 characters.", "error");
        return;
    }

    if (password !== confirmPassword) {
        showMessage("Passwords do not match.", "error");
        return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = "Creating Account...";
    messageBox.className = "message";
    messageBox.textContent = "";

    try {

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            studentEmail,
            password
        );

        const user = userCredential.user;

        const defaultAvatar = studentGender === "male"
            ? "../Assets/avatars/male.png"
            : "../Assets/avatars/female.png";

        await updateProfile(user, {
            displayName: studentName,
            photoURL: defaultAvatar
        });

        await setDoc(doc(db, "students", user.uid), {
            studentId: "KP-STU-" + user.uid,
            studentName: studentName,
            email: studentEmail,
            studentGender: studentGender,
            photoURL: defaultAvatar,
            accountStatus: "ACTIVE",
            accountSource: "SELF",
            createdAt: serverTimestamp()
        });

        showMessage(
            "Registration successful! Redirecting to Login...",
            "success"
        );

        await signOut(auth);

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1800);

    } catch (error) {

        console.error("Registration Error:", error);

        showMessage(getFirebaseError(error), "error");

        registerBtn.disabled = false;
        registerBtn.textContent = "Create Account";
    }

});


import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

import { auth, db } from "../js/firebase-config.js";

const logoutBtn = document.getElementById("logoutBtn");

async function loadStudentPerformance(userId) {

    try {

        const resultsQuery = query(
            collection(db, "quizResults"),
            where("studentUid", "==", userId)
        );

        const snapshot = await getDocs(resultsQuery);

        let totalQuizzes = snapshot.size;
        let totalCorrect = 0;
        let totalPercentage = 0;
        let bestScore = 0;

        snapshot.forEach((result) => {

            const data = result.data();

            totalCorrect += Number(data.correct || 0);

            const percentage = Number(data.percentage || 0);

            totalPercentage += percentage;

            if (percentage > bestScore) {
                bestScore = percentage;
            }

        });

        const averageScore = totalQuizzes > 0
            ? Math.round(totalPercentage / totalQuizzes)
            : 0;

        document.getElementById("totalQuizzes").textContent = totalQuizzes;
        document.getElementById("averageScore").textContent = averageScore + "%";
        document.getElementById("totalCorrect").textContent = totalCorrect;
        document.getElementById("bestScore").textContent = bestScore + "%";

    } catch (error) {

        console.error("Performance Loading Error:", error);

    }
}


// Load Student Profile
async function loadStudentDashboard(user) {

    try {

        const studentRef = doc(db, "students", user.uid);
        const studentSnapshot = await getDoc(studentRef);

        if (!studentSnapshot.exists()) {
            throw new Error("Student profile not found.");
        }

        const student = studentSnapshot.data();

        if (student.accountStatus !== "ACTIVE") {

            await signOut(auth);

            alert("Your account is not active. Please contact support.");

            window.location.replace("login.html");
            return;
        }

        const studentName =
            student.studentName || user.displayName || "Student";

        const studentGender =
            student.studentGender || "male";

        const defaultAvatar = studentGender === "female"
            ? "../Assets/female.png"
            : "../Assets/male.png";

        const profilePhoto = student.photoURL || defaultAvatar;

        document.getElementById("studentName").textContent = studentName;

        document.getElementById("profileName").textContent = studentName;

        document.getElementById("studentId").textContent =
            student.studentId || user.uid;

        document.getElementById("studentEmail").textContent =
            student.email || user.email || "";

        // document.getElementById("studentInitial").textContent =
        //     studentName.charAt(0).toUpperCase();

        // Display Profile Image if image element exists

        const profileImages = [
            document.getElementById("profileImage"),
            document.getElementById("profileImageCard")
        ];

        profileImages.forEach(image => {

            if (image) {

                image.src = profilePhoto;
                image.alt = studentName + " Profile Photo";

                image.onerror = function () {
                    this.onerror = null;
                    this.src = defaultAvatar;
                };

            }

        });


        // const profileImage = document.getElementById("profileImage");

        // if (profileImage) {

        //     profileImage.src = profilePhoto;

        //     profileImage.alt = studentName + " Profile Photo";

        //     profileImage.onerror = function () {
        //         this.onerror = null;
        //         this.src = defaultAvatar;
        //     };

        // }


        // Load Quiz Performance
        await loadStudentPerformance(user.uid);
    }
    catch (error) {

        console.error("Dashboard Error Code:", error.code);
        console.error("Dashboard Error Message:", error.message);

        alert(
            "Error Code: " + (error.code || "Unknown") +
            "\nError Message: " + error.message
        );

    }
    // } catch (error) {

    //     console.error("Dashboard Error:", error);

    //     alert("Unable to load your student profile. Please login again.");

    //     await signOut(auth);
    //     window.location.replace("login.html");
    // }
}


// Verify Firebase Login Session
onAuthStateChanged(auth, async function (user) {

    if (!user) {
        window.location.replace("login.html");
        return;
    }

    await loadStudentDashboard(user);

});


// Logout
if (logoutBtn) {

    logoutBtn.addEventListener("click", async function () {

        logoutBtn.disabled = true;
        logoutBtn.textContent = "Logging out...";

        try {

            await signOut(auth);

            sessionStorage.removeItem("krishnaprep_student");
            sessionStorage.removeItem("krishnaprep_student_token");

            window.location.replace("login.html");

        } catch (error) {

            console.error("Logout Error:", error);

            alert("Logout failed. Please try again.");

            logoutBtn.disabled = false;
            logoutBtn.textContent = "Logout";
        }

    });

}

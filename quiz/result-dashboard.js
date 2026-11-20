
import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

import { auth, db } from "../js/firebase-config.js";


// HTML Escape
function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);

}


// Format Date
function formatDate(timestamp) {

    if (!timestamp) {
        return "Not available";
    }

    try {

        const date = timestamp.toDate
            ? timestamp.toDate()
            : new Date(timestamp);

        if (isNaN(date.getTime())) {
            return "Not available";
        }

        return date.toLocaleString("en-IN");

    } catch (error) {

        return "Not available";

    }

}


// Load Student Profile
async function loadStudentProfile(user) {

    const studentRef = doc(db, "students", user.uid);

    const studentSnapshot = await getDoc(studentRef);

    if (!studentSnapshot.exists()) {
        throw new Error("Student profile not found.");
    }

    const student = studentSnapshot.data();

    if (student.accountStatus !== "ACTIVE") {
        throw new Error("Your account is not active.");
    }

    const studentName = student.studentName || user.displayName || "Student";

    document.getElementById("studentName").textContent =
        studentName;

    document.getElementById("studentEmail").textContent =
        student.email || user.email || "";

    document.getElementById("studentAvatar").textContent =
        studentName.charAt(0).toUpperCase();

}


// Load Firebase Results
async function loadResults(user) {

    const resultContainer = document.getElementById("resultList");

    resultContainer.innerHTML = `
        <div class="empty">
            <h3>Loading Results...</h3>
            <p>Please wait while we load your exam history.</p>
        </div>
    `;

    try {

        const resultsQuery = query(
            collection(db, "quizResults"),
            where("studentUid", "==", user.uid)
        );

        const snapshot = await getDocs(resultsQuery);

        let results = [];

        snapshot.forEach(result => {

            results.push({
                id: result.id,
                ...result.data()
            });

        });

        // Sort latest result first
        results.sort((a, b) => {

            const dateA = a.submittedAt?.toMillis
                ? a.submittedAt.toMillis()
                : 0;

            const dateB = b.submittedAt?.toMillis
                ? b.submittedAt.toMillis()
                : 0;

            return dateB - dateA;

        });


        // Calculate Performance
        const totalExams = results.length;

        const totalCorrect = results.reduce(
            (sum, item) => sum + Number(item.correct || 0),
            0
        );

        const totalPercentage = results.reduce(
            (sum, item) => sum + Number(item.percentage || 0),
            0
        );

        const average = totalExams
            ? totalPercentage / totalExams
            : 0;

        const best = totalExams
            ? Math.max(
                ...results.map(item => Number(item.percentage || 0))
            )
            : 0;


        // Display Statistics
        document.getElementById("totalExams").textContent =
            totalExams;

        document.getElementById("averageScore").textContent =
            average.toFixed(1) + "%";

        document.getElementById("bestScore").textContent =
            best.toFixed(1) + "%";

        document.getElementById("totalCorrect").textContent =
            totalCorrect;


        // Display History
        displayHistory(results);


    } catch (error) {

        console.error("Firebase Results Error:", error);

        resultContainer.innerHTML = `
            <div class="empty">
                <h3>Unable to Load Results</h3>
                <p>Please refresh the page and try again.</p>
            </div>
        `;

    }

}


// Display Exam History
function displayHistory(results) {

    const container = document.getElementById("resultList");

    if (results.length === 0) {

        container.innerHTML = `
            <div class="empty">
                <h3>No exam history available</h3>
                <p>Attempt a quiz to see your performance here.</p>
            </div>
        `;

        return;
    }


    container.innerHTML = results.map(item => {

        const percentage = Number(item.percentage || 0);

        const passed = percentage >= 50;

        const date = formatDate(item.submittedAt);

        return `

            <div class="result-item">

                <div>

                    <h3>
                        ${escapeHTML(item.quizTitle || "Online Exam")}
                    </h3>

                    <p>
                        Date: ${escapeHTML(date)}
                    </p>

                    <p>
                        Correct: ${Number(item.correct || 0)} |
                        Wrong: ${Number(item.wrong || 0)} |
                        Skipped: ${Number(item.skipped || 0)}
                    </p>

                    <p>
                        Time Taken: ${escapeHTML(item.timeTaken || "Not available")}
                    </p>

                    <div class="status ${passed ? "pass" : "fail"}">
                        ${passed ? "PASSED" : "NOT PASSED"}
                    </div>

                </div>

                <div class="score">
                    ${percentage.toFixed(1)}%
                </div>

            </div>

        `;

    }).join("");

}


// Leaderboard Placeholder
// function loadLeaderboard() {

//     const leaderboard = document.getElementById("leaderboard");

//     leaderboard.innerHTML = `
//         <div class="empty">
//             <h3>Leaderboard Coming Soon</h3>
//             <p>Verified student rankings will be available here.</p>
//         </div>
//     `;

// }

async function loadLeaderboard() {

    const leaderboard = document.getElementById("leaderboard");

    leaderboard.innerHTML = `
        <div class="empty">
            <p>Loading leaderboard...</p>
        </div>
    `;

    try {

        const leaderboardQuery = query(
            collection(db, "leaderboard"),
            orderBy("rank", "asc"),
            limit(10)
        );

        const snapshot = await getDocs(leaderboardQuery);

        if (snapshot.empty) {
            leaderboard.innerHTML = `
                <div class="empty">
                    <h3>No Rankings Available</h3>
                    <p>Leaderboard will appear here soon.</p>
                </div>
            `;
            return;
        }

        leaderboard.innerHTML = snapshot.docs.map(document => {

            const student = document.data();

            const name = escapeHTML(student.studentName || "Student");
            console.log("Leaderboard Student Data:", student);
            const rank = Number(student.rank) || 0;
            const score = Number(student.averageScore) || 0;
            const quizzes = Number(student.totalQuizzes) || 0;

            const photo = student.photoURL
                ? escapeHTML(student.photoURL)
                : "";

            const defaultPhoto = "../Assets/male.png";

            return `
    <div class="leaderboard-item">

        <div class="leaderboard-rank">
            #${rank}
        </div>

        <img
            src="${photo || defaultPhoto}"
            alt="Student"
            class="leaderboard-avatar"
            onerror="this.onerror=null;this.src='../Assets/male.png';"
        >

        <div class="leaderboard-info">
            <h4>${name}</h4>
            <p>${quizzes} Quizzes Attempted</p>
        </div>

        <div class="leaderboard-score">
            ${score}%
        </div>

    </div>
`;

        }).join("");

    } catch (error) {

        console.error("Leaderboard Error:", error);

        leaderboard.innerHTML = `
            <div class="empty">
                <h3>Unable to Load Leaderboard</h3>
                <p>Please try again later.</p>
            </div>
        `;

    }
}


// Firebase Authentication
onAuthStateChanged(auth, async function (user) {

    if (!user) {

        window.location.replace("login.html");

        return;
    }

    try {

        await loadStudentProfile(user);

        await loadResults(user);

        loadLeaderboard();

    } catch (error) {

        console.error("Dashboard Error:", error);

        alert(error.message || "Unable to load your dashboard.");

        window.location.replace("login.html");

    }

});

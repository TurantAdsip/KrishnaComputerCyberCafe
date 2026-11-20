
// import { auth, adminDb } from "../js/firebase-config.js";
import { adminAuth, adminDb } from "../js/firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    updateDoc,
    setDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";


const pageTitle = document.getElementById("pageTitle");
const adminName = document.getElementById("adminName");
const adminRole = document.getElementById("adminRole");
const logoutBtn = document.getElementById("logoutBtn");

const navLinks = document.querySelectorAll(".nav-link[data-section]");
const contentSections = document.querySelectorAll(".content-section");

let currentAdmin = null;
let allLatestExams = [];

// CHECK ADMIN AUTHENTICATION
onAuthStateChanged(adminAuth, async (user) => {

    if (!user) {
        window.location.replace("admin-login.html");
        return;
    }

    try {

        // Get Admin Profile
        const adminRef = doc(adminDb, "admins", user.uid);
        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists()) {
            await signOut(adminAuth);
            window.location.replace("admin-login.html");
            return;
        }

        const data = adminSnap.data();

        // Check Admin Status
        if (data.active !== true) {
            await signOut(adminAuth);
            window.location.replace("admin-login.html");
            return;
        }

        // Check Admin Role
        if (
            data.role !== "superAdmin" &&
            data.role !== "admin"
        ) {
            await signOut(adminAuth);
            window.location.replace("admin-login.html");
            return;
        }

        currentAdmin = {
            uid: user.uid,
            email: user.email,
            role: data.role,
            permissions: data.permissions || []
        };

        // Display Admin Details
        adminName.textContent = user.email || "Admin";

        adminRole.textContent =
            data.role === "superAdmin"
                ? "Super Admin"
                : "Administrator";

        // Setup Permissions
        setupAdminPermissions();

        // Load Dashboard Statistics
        await loadDashboardStats();

        if (hasPermission("latestExams")) {
            await loadLatestExams();
        }

        if (hasPermission("students")) {
            await loadStudents();
        }

        if (hasPermission("quizzes")) {
            await loadQuizzes();
        }

        if (hasPermission("results")) {
            await loadResults();
        }

        if (hasPermission("leaderboard")) {
            await loadLeaderboard();
        }

        if (hasPermission("settings")) {
            await loadPlatformSettings();
        }

    } catch (error) {

        console.error("Admin Dashboard Error:", error);
        console.error("Actual Error Details:", error?.code, error?.message, error);

        alert("Unable to verify admin access. Please login again.");

        await signOut(adminAuth);
        window.location.replace("admin-login.html");

    }

});


// CHECK PERMISSION
function hasPermission(permission) {

    if (!currentAdmin) return false;

    if (currentAdmin.role === "superAdmin") {
        return true;
    }

    return currentAdmin.permissions.includes(permission);

}


// SETUP ADMIN MENU
function setupAdminPermissions() {

    navLinks.forEach((link) => {

        const section = link.dataset.section;

        if (
            section !== "dashboard" &&
            !hasPermission(section)
        ) {
            link.style.display = "none";
        }

    });

    // Hide Dashboard Statistics without permission
    document.querySelectorAll(".stat-card").forEach((card) => {

        const heading = card.querySelector("h3")?.textContent;

        const permissionMap = {
            "Total Students": "students",
            "Total Quizzes": "quizzes",
            "Total Results": "results",
            "Leaderboard": "leaderboard"
        };

        const permission = permissionMap[heading];

        if (permission && !hasPermission(permission)) {
            card.querySelector("p").textContent = "—";
        }

    });

}


// NAVIGATION
navLinks.forEach((link) => {

    link.addEventListener("click", (e) => {

        e.preventDefault();

        const sectionId = link.dataset.section;

        if (
            sectionId !== "dashboard" &&
            !hasPermission(sectionId)
        ) {
            alert("You do not have permission to access this section.");
            return;
        }

        // Active Menu
        navLinks.forEach((item) => {
            item.classList.remove("active");
        });

        link.classList.add("active");

        // Active Section
        contentSections.forEach((section) => {
            section.classList.remove("active");
        });

        const selectedSection = document.getElementById(sectionId);

        if (selectedSection) {
            selectedSection.classList.add("active");
        }

        // Update Page Title
        const titles = {
            dashboard: "Dashboard Overview",
            students: "Students Management",
            quizzes: "Quiz Management",
            latestExams: "Latest Exams Management",
            results: "Results Management",
            leaderboard: "Leaderboard Management",
            settings: "Admin Settings"
        };

        pageTitle.textContent = titles[sectionId] || "Admin Dashboard";

    });

});


// LOAD DASHBOARD STATISTICS

async function loadDashboardStats() {

    const stats = [
        {
            permission: "students",
            collectionName: "students",
            elementId: "totalStudents"
        },
        {
            permission: "results",
            collectionName: "quizResults",
            elementId: "totalResults"
        },
        {
            permission: "leaderboard",
            collectionName: "leaderboard",
            elementId: "totalLeaderboard"
        },
        {
            permission: "latestExams",
            collectionName: "latestExams",
            elementId: "totalExams"
        },
        {
            permission: "quizzes",
            collectionName: "quizzes",
            elementId: "totalQuizzes"
        }
    ];

    for (const item of stats) {

        const element = document.getElementById(item.elementId);

        if (!element) continue;

        if (!hasPermission(item.permission)) {
            element.textContent = "—";
            continue;
        }

        try {

            const snapshot = await getDocs(
                collection(adminDb, item.collectionName)
            );

            element.textContent = snapshot.size;

        } catch (error) {

            console.error(
                `Unable to load ${item.collectionName}:`,
                error
            );

            element.textContent = "—";

        }
    }
}



// ADMIN LOGOUT
logoutBtn.addEventListener("click", async () => {

    const confirmLogout = confirm(
        "Are you sure you want to logout?"
    );

    if (!confirmLogout) return;

    try {

        await signOut(adminAuth);

        window.location.replace("admin-login.html");

    } catch (error) {

        console.error("Logout Error:", error);

        alert("Unable to logout. Please try again.");

    }

});


// ======================================
// STUDENTS MANAGEMENT
// ======================================

let studentsData = [];


// LOAD STUDENTS FROM FIRESTORE
async function loadStudents() {

    const tableBody = document.getElementById("studentsTableBody");

    if (!hasPermission("students")) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="6">Loading students...</td>
        </tr>
    `;

    try {

        const studentsRef = collection(adminDb, "students");
        const snapshot = await getDocs(studentsRef);

        studentsData = [];

        snapshot.forEach((studentDoc) => {

            studentsData.push({
                uid: studentDoc.id,
                ...studentDoc.data()
            });

        });

        renderStudents();

    } catch (error) {

        console.error("Students Loading Error:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">Unable to load students.</td>
            </tr>
        `;

    }

}


// DISPLAY STUDENTS
function renderStudents() {

    const tableBody = document.getElementById("studentsTableBody");

    const searchValue = document
        .getElementById("studentSearch")
        .value.toLowerCase()
        .trim();

    const statusFilter = document
        .getElementById("studentStatusFilter")
        .value;

    const filteredStudents = studentsData.filter((student) => {

        const matchesSearch =
            (student.studentName || "").toLowerCase().includes(searchValue) ||
            (student.email || "").toLowerCase().includes(searchValue) ||
            (student.studentId || "").toLowerCase().includes(searchValue);

        const matchesStatus =
            statusFilter === "ALL" ||
            student.accountStatus === statusFilter;

        return matchesSearch && matchesStatus;

    });

    tableBody.innerHTML = "";

    if (filteredStudents.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">No students found.</td>
            </tr>
        `;

        return;

    }

    filteredStudents.forEach((student) => {

        const row = document.createElement("tr");

        const status = student.accountStatus || "UNKNOWN";

        const statusClass =
            status === "ACTIVE" ? "active" : "inactive";

        const actionText =
            status === "ACTIVE" ? "Deactivate" : "Activate";

        row.innerHTML = `
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>
                <span class="student-status ${statusClass}"></span>
            </td>
            <td>
                <button class="student-action-btn view"
                    data-uid="${student.uid}"
                    data-action="view">
                    View
                </button>

                <button class="student-action-btn view"
                    data-uid="${student.uid}"
                    data-action="toggle">
                    ${actionText}
                </button>
            </td>
        `;

        row.children[0].textContent = student.studentId || "—";
        row.children[1].textContent = student.studentName || "—";
        row.children[2].textContent = student.email || "—";
        row.children[3].textContent = student.studentGender || "—";
        row.querySelector(".student-status").textContent = status;

        tableBody.appendChild(row);

    });

}


// SEARCH STUDENTS
document.getElementById("studentSearch")
    .addEventListener("input", renderStudents);


// FILTER STUDENTS
document.getElementById("studentStatusFilter")
    .addEventListener("change", renderStudents);


// STUDENT TABLE ACTIONS
document.getElementById("studentsTableBody")
    .addEventListener("click", async (event) => {

        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const uid = button.dataset.uid;
        const action = button.dataset.action;

        const student = studentsData.find(item => item.uid === uid);

        if (!student) return;

        // VIEW STUDENT
        if (action === "view") {

            alert(
                "Student Details\n\n" +
                "Name: " + (student.studentName || "—") + "\n" +
                "Student ID: " + (student.studentId || "—") + "\n" +
                "Email: " + (student.email || "—") + "\n" +
                "Gender: " + (student.studentGender || "—") + "\n" +
                "Status: " + (student.accountStatus || "—")
            );

            return;

        }

        // ACTIVATE / DEACTIVATE STUDENT
        if (action === "toggle") {

            if (!hasPermission("students")) {
                alert("You do not have permission.");
                return;
            }

            const newStatus =
                student.accountStatus === "ACTIVE"
                    ? "INACTIVE"
                    : "ACTIVE";

            const confirmed = confirm(
                `Are you sure you want to ${newStatus === "ACTIVE" ? "activate" : "deactivate"} this student?`
            );

            if (!confirmed) return;

            button.disabled = true;

            try {

                const studentRef = doc(adminDb, "students", uid);

                await updateDoc(studentRef, {
                    accountStatus: newStatus
                });

                student.accountStatus = newStatus;

                renderStudents();

                document.getElementById("studentMessage").textContent =
                    "Student account updated successfully.";

            } catch (error) {

                console.error("Student Status Error:", error);

                alert("Unable to update student account. Please try again.");

                button.disabled = false;

            }

        }

    });


// ======================================
// QUIZ MANAGEMENT
// ======================================

let quizzesData = [];
let editingQuizId = null;
let questionCounter = 0;


// LOAD QUIZZES FROM FIRESTORE
async function loadQuizzes() {

    const tableBody = document.getElementById("quizzesTableBody");

    if (!hasPermission("quizzes")) return;

    tableBody.innerHTML = `
        <tr><td colspan="8">Loading quizzes...</td></tr>
    `;

    try {

        const snapshot = await getDocs(collection(adminDb, "quizzes"));

        quizzesData = [];

        snapshot.forEach((quizDoc) => {
            quizzesData.push({
                id: quizDoc.id,
                ...quizDoc.data()
            });
        });

        renderQuizzes();

        document.getElementById("totalQuizzes").textContent =
            quizzesData.length;

    } catch (error) {

        console.error("Quiz Loading Error:", error);

        tableBody.innerHTML = `
            <tr><td colspan="8">Unable to load quizzes.</td></tr>
        `;

        document.getElementById("totalQuizzes").textContent = "—";

    }

}


// DISPLAY QUIZ LIST
function renderQuizzes() {

    const tableBody = document.getElementById("quizzesTableBody");

    const searchValue = document
        .getElementById("quizSearch")
        .value.toLowerCase()
        .trim();

    const statusFilter = document
        .getElementById("quizStatusFilter")
        .value;

    const filteredQuizzes = quizzesData.filter((quiz) => {

        const matchesSearch =
            (quiz.title || "").toLowerCase().includes(searchValue) ||
            (quiz.id || "").toLowerCase().includes(searchValue);

        const status = quiz.status || "ACTIVE";

        const matchesStatus =
            statusFilter === "ALL" || status === statusFilter;

        return matchesSearch && matchesStatus;

    });

    tableBody.innerHTML = "";

    if (filteredQuizzes.length === 0) {

        tableBody.innerHTML = `
            <tr><td colspan="8">No quizzes found.</td></tr>
        `;

        return;

    }

    filteredQuizzes.forEach((quiz) => {

        const status = quiz.status || "ACTIVE";

        const row = document.createElement("tr");

        const values = [
            quiz.id,
            quiz.title || "—",
            quiz.category || "—",
            quiz.type || "—",
            Array.isArray(quiz.questions) ? quiz.questions.length : 0,
            (quiz.duration || 0) + " min"
        ];

        values.forEach((value) => {

            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);

        });

        const statusCell = document.createElement("td");

        const statusBadge = document.createElement("span");

        statusBadge.className =
            "quiz-status " + status.toLowerCase();

        statusBadge.textContent = status;

        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);

        const actionCell = document.createElement("td");

        actionCell.innerHTML = `
            <button class="quiz-action-btn edit" data-action="edit">
                Edit
            </button>

            <button class="quiz-action-btn toggle" data-action="toggle">
                ${status === "ACTIVE" ? "Deactivate" : "Activate"}
            </button>

            <button class="quiz-action-btn delete" data-action="delete">
                Delete
            </button>
        `;

        actionCell.querySelectorAll("button").forEach((button) => {
            button.dataset.quizId = quiz.id;
        });

        row.appendChild(actionCell);

        tableBody.appendChild(row);

    });

}


// SEARCH AND FILTER
document.getElementById("quizSearch")
    .addEventListener("input", renderQuizzes);

document.getElementById("quizStatusFilter")
    .addEventListener("change", renderQuizzes);


// OPEN QUIZ FORM
function openQuizForm() {

    document.getElementById("quizListContainer").hidden = true;
    document.getElementById("quizFormContainer").hidden = false;

    document.getElementById("quizForm").reset();

    document.getElementById("questionsContainer").innerHTML = "";

    document.getElementById("quizFormTitle").textContent =
        editingQuizId ? "Edit Quiz" : "Add New Quiz";

    document.getElementById("quizId").disabled =
        Boolean(editingQuizId);

    questionCounter = 0;

    updateNoQuestionsMessage();

}


// CLOSE QUIZ FORM
function closeQuizForm() {

    document.getElementById("quizFormContainer").hidden = true;
    document.getElementById("quizListContainer").hidden = false;

    editingQuizId = null;

    document.getElementById("quizForm").reset();

    document.getElementById("questionsContainer").innerHTML = "";

    questionCounter = 0;

    updateNoQuestionsMessage();

}


// ADD NEW QUIZ BUTTON
document.getElementById("addQuizBtn")
    .addEventListener("click", () => {

        if (!hasPermission("quizzes")) {
            alert("You do not have permission.");
            return;
        }

        editingQuizId = null;

        openQuizForm();

    });


// CANCEL BUTTONS
document.getElementById("cancelQuizBtn")
    .addEventListener("click", closeQuizForm);

document.getElementById("cancelQuizFormBtn")
    .addEventListener("click", closeQuizForm);


// ADD QUESTION CARD
function addQuestionCard(questionData = null) {

    questionCounter++;

    const questionNumber = questionCounter;

    const container = document.getElementById("questionsContainer");

    const card = document.createElement("div");

    card.className = "question-card";

    card.dataset.questionNumber = questionNumber;

    card.innerHTML = `
        <div class="question-card-header">
            <h4>Question ${questionNumber}</h4>

            <button type="button" class="question-delete-btn">
                <i class="fa-solid fa-trash"></i> Remove
            </button>
        </div>

        <textarea class="question-text"
            rows="2"
            placeholder="Enter question"
            required></textarea>

        <div class="question-options-grid">

            <input type="text" class="question-option"
                placeholder="Option A" required>

            <input type="text" class="question-option"
                placeholder="Option B" required>

            <input type="text" class="question-option"
                placeholder="Option C" required>

            <input type="text" class="question-option"
                placeholder="Option D" required>

        </div>

        <label>Correct Answer</label>

        <select class="question-answer" required>
            <option value="">Select Correct Answer</option>
            <option value="0">Option A</option>
            <option value="1">Option B</option>
            <option value="2">Option C</option>
            <option value="3">Option D</option>
        </select>

        <label>Explanation</label>

        <textarea class="question-explanation"
            rows="2"
            placeholder="Enter answer explanation"></textarea>
    `;

    if (questionData) {

        card.querySelector(".question-text").value =
            questionData.question || "";

        const optionInputs = card.querySelectorAll(".question-option");

        (questionData.options || []).forEach((option, index) => {

            if (optionInputs[index]) {
                optionInputs[index].value = option;
            }

        });

        card.querySelector(".question-answer").value =
            String(questionData.answer ?? "");

        card.querySelector(".question-explanation").value =
            questionData.explanation || "";

    }

    card.querySelector(".question-delete-btn")
        .addEventListener("click", () => {

            card.remove();

            updateNoQuestionsMessage();

            updateQuestionNumbers();

        });

    container.appendChild(card);

    updateNoQuestionsMessage();

}


// UPDATE QUESTION NUMBERS
function updateQuestionNumbers() {

    const cards = document.querySelectorAll(".question-card");

    cards.forEach((card, index) => {

        card.querySelector("h4").textContent =
            "Question " + (index + 1);

    });

}


// NO QUESTIONS MESSAGE
function updateNoQuestionsMessage() {

    const container = document.getElementById("questionsContainer");

    const message = document.getElementById("noQuestionsMessage");

    if (message) {
        message.remove();
    }

    if (container.children.length === 0) {

        const emptyMessage = document.createElement("p");

        emptyMessage.id = "noQuestionsMessage";

        emptyMessage.textContent =
            'No questions added yet. Click "Add Question" to begin.';

        container.appendChild(emptyMessage);

    }

}


// ADD QUESTION BUTTON
document.getElementById("addQuestionBtn")
    .addEventListener("click", () => {

        addQuestionCard();

    });


// EDIT QUIZ
function editQuiz(quizId) {

    const quiz = quizzesData.find(item => item.id === quizId);

    if (!quiz) return;

    editingQuizId = quizId;

    openQuizForm();

    document.getElementById("quizId").value = quizId;
    document.getElementById("quizTitle").value = quiz.title || "";
    document.getElementById("quizDescription").value = quiz.description || "";
    document.getElementById("quizCategory").value = quiz.category || "";
    document.getElementById("quizType").value = quiz.type || "";
    document.getElementById("quizSubject").value = quiz.subject || "";
    document.getElementById("quizDuration").value = quiz.duration || "";
    document.getElementById("quizLevel").value = quiz.level || "Easy";
    document.getElementById("quizStatus").value = quiz.status || "ACTIVE";

    document.getElementById("questionsContainer").innerHTML = "";

    questionCounter = 0;

    (quiz.questions || []).forEach((question) => {
        addQuestionCard(question);
    });

    updateNoQuestionsMessage();

}


// QUIZ TABLE ACTIONS
document.getElementById("quizzesTableBody")
    .addEventListener("click", async (event) => {

        const button = event.target.closest("button[data-action]");

        if (!button) return;

        if (!hasPermission("quizzes")) {
            alert("You do not have permission.");
            return;
        }

        const quizId = button.dataset.quizId;
        const action = button.dataset.action;

        const quiz = quizzesData.find(item => item.id === quizId);

        if (!quiz) return;

        if (action === "edit") {

            editQuiz(quizId);

            return;

        }

        if (action === "toggle") {

            const newStatus =
                (quiz.status || "ACTIVE") === "ACTIVE"
                    ? "INACTIVE"
                    : "ACTIVE";

            if (!confirm(`Are you sure you want to ${newStatus.toLowerCase()} this quiz?`)) {
                return;
            }

            button.disabled = true;

            try {

                await updateDoc(doc(adminDb, "quizzes", quizId), {
                    status: newStatus,
                    updatedAt: serverTimestamp()
                });

                quiz.status = newStatus;

                renderQuizzes();

                document.getElementById("quizMessage").textContent =
                    "Quiz status updated successfully.";

            } catch (error) {

                console.error("Quiz Status Error:", error);

                alert("Unable to update quiz status.");

                button.disabled = false;

            }

            return;

        }

        if (action === "delete") {

            if (!confirm(
                "Are you sure you want to permanently delete this quiz?"
            )) {
                return;
            }

            button.disabled = true;

            try {

                await deleteDoc(doc(adminDb, "quizzes", quizId));

                quizzesData = quizzesData.filter(item => item.id !== quizId);

                renderQuizzes();

                document.getElementById("totalQuizzes").textContent =
                    quizzesData.length;

                document.getElementById("quizMessage").textContent =
                    "Quiz deleted successfully.";

            } catch (error) {

                console.error("Quiz Delete Error:", error);

                alert("Unable to delete quiz.");

                button.disabled = false;

            }

        }

    });


// SAVE QUIZ
document.getElementById("quizForm")
    .addEventListener("submit", async (event) => {

        event.preventDefault();

        if (!hasPermission("quizzes")) {
            alert("You do not have permission.");
            return;
        }

        const quizId = document.getElementById("quizId").value
            .trim()
            .toUpperCase();

        const title = document.getElementById("quizTitle").value.trim();

        const questions = [];

        const questionCards =
            document.querySelectorAll(".question-card");

        if (questionCards.length === 0) {

            alert("Please add at least one question.");

            return;

        }

        let invalidQuestion = false;

        questionCards.forEach((card) => {

            const question =
                card.querySelector(".question-text").value.trim();

            const options = Array.from(
                card.querySelectorAll(".question-option")
            ).map(input => input.value.trim());

            const answer =
                card.querySelector(".question-answer").value;

            const explanation =
                card.querySelector(".question-explanation").value.trim();

            if (
                !question ||
                options.some(option => !option) ||
                answer === ""
            ) {

                invalidQuestion = true;

            }

            questions.push({
                question,
                options,
                answer: Number(answer),
                explanation
            });

        });

        if (invalidQuestion) {

            alert("Please complete all questions, four options and correct answers.");

            return;

        }

        if (!editingQuizId && quizzesData.some(quiz => quiz.id === quizId)) {

            alert("This Quiz ID already exists. Please use another ID.");

            return;

        }

        const quizData = {

            title,

            description: document.getElementById("quizDescription").value.trim(),

            category: document.getElementById("quizCategory").value,

            type: document.getElementById("quizType").value,

            subject: document.getElementById("quizSubject").value.trim(),

            duration: Number(document.getElementById("quizDuration").value),

            level: document.getElementById("quizLevel").value,

            status: document.getElementById("quizStatus").value,

            questions,

            updatedAt: serverTimestamp()

        };

        if (!editingQuizId) {
            quizData.createdAt = serverTimestamp();
        }

        const saveButton = document.getElementById("saveQuizBtn");

        const message = document.getElementById("quizFormMessage");

        saveButton.disabled = true;

        saveButton.textContent = "Saving...";

        message.textContent = "";

        try {

            await setDoc(
                doc(adminDb, "quizzes", quizId),
                quizData
            );

            if (editingQuizId) {

                const index = quizzesData.findIndex(
                    quiz => quiz.id === editingQuizId
                );

                if (index !== -1) {
                    quizzesData[index] = {
                        id: quizId,
                        ...quizData
                    };
                }

            } else {

                quizzesData.push({
                    id: quizId,
                    ...quizData
                });

            }

            document.getElementById("totalQuizzes").textContent =
                quizzesData.length;

            alert(editingQuizId
                ? "Quiz updated successfully."
                : "New quiz added successfully.");

            closeQuizForm();

            renderQuizzes();

        } catch (error) {

            console.error("Quiz Save Error:", error);

            message.textContent =
                "Unable to save quiz. Please check Firebase permissions.";

            alert("Quiz save failed. Please check Console for details.");

        } finally {

            saveButton.disabled = false;

            saveButton.innerHTML =
                '<i class="fa-solid fa-floppy-disk"></i> Save Quiz';

        }

    });


// ======================================
// RESULTS MANAGEMENT
// ======================================

let resultsData = [];

async function loadResults() {

    const tableBody = document.getElementById("resultsTableBody");
    const resultMessage = document.getElementById("resultMessage");
    const resultsCount = document.getElementById("resultsCount");

    if (!hasPermission("results")) {
        return;
    }

    tableBody.innerHTML = `
        <tr>
            <td colspan="11">Loading results...</td>
        </tr>
    `;

    try {

        const snapshot = await getDocs(collection(adminDb, "quizResults"));

        resultsData = [];

        snapshot.forEach((resultDoc) => {
            resultsData.push({
                id: resultDoc.id,
                ...resultDoc.data()
            });
        });

        // Latest results first
        resultsData.sort((a, b) => {
            const dateA = a.submittedAt?.toMillis
                ? a.submittedAt.toMillis()
                : new Date(a.submittedAt || 0).getTime();

            const dateB = b.submittedAt?.toMillis
                ? b.submittedAt.toMillis()
                : new Date(b.submittedAt || 0).getTime();

            return dateB - dateA;
        });

        resultsCount.textContent = resultsData.length;

        populateResultQuizFilter();
        renderResults(resultsData);

        resultMessage.textContent = "";

    } catch (error) {

        console.error("Results Loading Error:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="11">Unable to load results.</td>
            </tr>
        `;

        resultMessage.textContent = error.message;
    }
}


// QUIZ FILTER OPTIONS
function populateResultQuizFilter() {

    const quizFilter = document.getElementById("resultQuizFilter");

    const selectedValue = quizFilter.value;

    const quizzes = [
        ...new Map(
            resultsData.map(result => [
                result.quizId || result.quizTitle,
                {
                    id: result.quizId || result.quizTitle,
                    title: result.quizTitle || result.quizId || "Untitled Quiz"
                }
            ])
        ).values()
    ];

    quizFilter.innerHTML = `<option value="ALL">All Quizzes</option>`;

    quizzes.forEach(quiz => {

        const option = document.createElement("option");

        option.value = quiz.id;
        option.textContent = quiz.title;

        quizFilter.appendChild(option);
    });

    if ([...quizFilter.options].some(option => option.value === selectedValue)) {
        quizFilter.value = selectedValue;
    }
}


// RENDER RESULTS TABLE
function renderResults(results) {

    const tableBody = document.getElementById("resultsTableBody");

    tableBody.innerHTML = "";

    if (results.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="11">No results found.</td>
            </tr>
        `;

        return;
    }

    results.forEach(result => {

        const row = document.createElement("tr");

        const submittedAt = result.submittedAt?.toDate
            ? result.submittedAt.toDate()
            : result.submittedAt
                ? new Date(result.submittedAt)
                : null;

        const dateText = submittedAt && !isNaN(submittedAt.getTime())
            ? submittedAt.toLocaleString("en-IN")
            : "—";

        const duration = Number(result.timeTakenSeconds);

        const timeText = Number.isFinite(duration) && duration >= 0
            ? `${Math.floor(duration / 60)}m ${duration % 60}s`
            : result.timeTaken || "—";

        const values = [
            result.studentId || "—",
            result.studentName || "—",
            result.quizTitle || result.quizId || "—",
            result.totalQuestions ?? "—",
            result.correct ?? 0,
            result.wrong ?? 0,
            result.skipped ?? 0,
            result.percentage != null ? `${result.percentage}%` : "—",
            timeText,
            dateText
        ];

        values.forEach(value => {

            const cell = document.createElement("td");

            cell.textContent = String(value);

            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");

        const viewButton = document.createElement("button");

        viewButton.type = "button";
        viewButton.textContent = "View";
        viewButton.className = "quiz-edit-btn";

        viewButton.addEventListener("click", () => {
            showResultDetails(result);
        });
        // viewButton.addEventListener("click", () => {
        //     alert(
        //         `Student: ${result.studentName || "—"}\n` +
        //         `Email: ${result.studentEmail || "—"}\n` +
        //         `Quiz: ${result.quizTitle || "—"}\n` +
        //         `Correct: ${result.correct ?? 0}\n` +
        //         `Wrong: ${result.wrong ?? 0}\n` +
        //         `Skipped: ${result.skipped ?? 0}\n` +
        //         `Percentage: ${result.percentage ?? 0}%`
        //     );
        // });

        actionCell.appendChild(viewButton);
        row.appendChild(actionCell);

        tableBody.appendChild(row);
    });
}


// SEARCH RESULTS
function filterResults() {

    const searchValue = document
        .getElementById("resultSearch")
        .value
        .toLowerCase()
        .trim();

    const quizValue = document.getElementById("resultQuizFilter").value;

    const filteredResults = resultsData.filter(result => {

        const searchableText = [
            result.studentName,
            result.studentEmail,
            result.studentId,
            result.quizTitle,
            result.quizId
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(searchValue);

        const matchesQuiz = quizValue === "ALL" ||
            (result.quizId || result.quizTitle) === quizValue;

        return matchesSearch && matchesQuiz;
    });

    renderResults(filteredResults);
}


// RESULTS EVENT LISTENERS
document.getElementById("resultSearch")
    .addEventListener("input", filterResults);

document.getElementById("resultQuizFilter")
    .addEventListener("change", filterResults);

document.getElementById("refreshResultsBtn")
    .addEventListener("click", loadResults);



// ======================================
// RESULT DETAILS POPUP
// ======================================

function showResultDetails(result) {

    const modal = document.getElementById("resultDetailsModal");

    const submittedAt = result.submittedAt?.toDate
        ? result.submittedAt.toDate()
        : result.submittedAt
            ? new Date(result.submittedAt)
            : null;

    const dateText = submittedAt && !isNaN(submittedAt.getTime())
        ? submittedAt.toLocaleString("en-IN")
        : "—";

    const duration = Number(result.timeTakenSeconds);

    const timeText = Number.isFinite(duration) && duration >= 0
        ? `${Math.floor(duration / 60)}m ${duration % 60}s`
        : result.timeTaken || "—";

    const details = {
        detailStudentName: result.studentName || "—",
        detailStudentId: result.studentId || "—",
        detailStudentEmail: result.studentEmail || "—",
        detailQuizName: result.quizTitle || "—",
        detailQuizId: result.quizId || "—",
        detailTotalQuestions: result.totalQuestions ?? "—",
        detailCorrect: result.correct ?? 0,
        detailWrong: result.wrong ?? 0,
        detailSkipped: result.skipped ?? 0,
        detailPercentage: result.percentage != null
            ? `${result.percentage}%`
            : "—",
        detailTimeTaken: timeText,
        detailSubmittedAt: dateText
    };

    Object.entries(details).forEach(([id, value]) => {
        document.getElementById(id).textContent = value;
    });

    modal.classList.add("active");
}


// CLOSE RESULT POPUP
document.getElementById("closeResultModal")
    .addEventListener("click", () => {
        document.getElementById("resultDetailsModal")
            .classList.remove("active");
    });

// Close when clicking outside popup
document.getElementById("resultDetailsModal")
    .addEventListener("click", (event) => {

        if (event.target.id === "resultDetailsModal") {
            event.target.classList.remove("active");
        }

    });


// ================================
// LEADERBOARD MANAGEMENT
// ================================

let leaderboardData = [];

// async function loadLeaderboard() {

//     const tableBody = document.getElementById("leaderboardTableBody");
//     const message = document.getElementById("leaderboardMessage");

//     if (!hasPermission("leaderboard")) return;

//     tableBody.innerHTML = `
//         <tr><td colspan="7">Loading leaderboard...</td></tr>
//     `;

//     try {

//         const snapshot = await getDocs(collection(adminDb, "quizResults"));

//         const studentStats = {};

//         snapshot.forEach(resultDoc => {

//             const result = resultDoc.data();

//             if (!result.studentUid) return;

//             const uid = result.studentUid;

//             if (!studentStats[uid]) {
//                 studentStats[uid] = {
//                     studentUid: uid,
//                     studentId: result.studentId || "—",
//                     studentName: result.studentName || "Unknown",
//                     totalQuizzes: 0,
//                     totalScore: 0,
//                     highestScore: 0
//                 };
//             }

//             const percentage = Number(result.percentage) || 0;

//             studentStats[uid].totalQuizzes++;
//             studentStats[uid].totalScore += percentage;

//             studentStats[uid].highestScore = Math.max(
//                 studentStats[uid].highestScore,
//                 percentage
//             );

//         });

//         leaderboardData = Object.values(studentStats).map(student => ({

//             ...student,

//             averageScore: Number(
//                 (student.totalScore / student.totalQuizzes).toFixed(2)
//             )

//         }));

//         // Ranking: Average Score first, then Total Quizzes
//         leaderboardData.sort((a, b) => {

//             if (b.averageScore !== a.averageScore) {
//                 return b.averageScore - a.averageScore;
//             }

//             return b.totalQuizzes - a.totalQuizzes;

//         });

//         leaderboardData = leaderboardData.map((student, index) => ({
//             ...student,
//             rank: index + 1
//         }));

//         document.getElementById("leaderboardCount").textContent =
//             leaderboardData.length;

//         document.getElementById("leaderboardTopStudent").textContent =
//             leaderboardData.length > 0
//                 ? leaderboardData[0].studentName
//                 : "—";

//         renderLeaderboard(leaderboardData);

//         message.textContent = "";

//     } catch (error) {

//         console.error("Leaderboard Loading Error:", error);

//         tableBody.innerHTML = `
//             <tr><td colspan="7">Unable to load leaderboard.</td></tr>
//         `;

//         message.textContent = error.message;

//     }

// }


async function loadLeaderboard() {

    const tableBody = document.getElementById("leaderboardTableBody");
    const message = document.getElementById("leaderboardMessage");

    if (!hasPermission("leaderboard")) return;

    tableBody.innerHTML = `
        <tr><td colspan="7">Loading leaderboard...</td></tr>
    `;

    try {

        // GET ALL QUIZ RESULTS
        const snapshot = await getDocs(collection(adminDb, "quizResults"));

        const studentStats = {};

        snapshot.forEach(resultDoc => {

            const result = resultDoc.data();

            if (!result.studentUid) return;

            const uid = result.studentUid;

            if (!studentStats[uid]) {

                studentStats[uid] = {
                    studentUid: uid,
                    studentId: result.studentId || "—",
                    studentName: result.studentName || "Unknown",
                    totalQuizzes: 0,
                    totalScore: 0,
                    highestScore: 0,
                    photoURL: result.photoURL || ""
                };

            }

            const percentage = Number(result.percentage) || 0;

            studentStats[uid].totalQuizzes++;
            studentStats[uid].totalScore += percentage;

            studentStats[uid].highestScore = Math.max(
                studentStats[uid].highestScore,
                percentage
            );

            if (result.photoURL) {
                studentStats[uid].photoURL = result.photoURL;
            }

        });

        // CALCULATE AVERAGE SCORE
        leaderboardData = Object.values(studentStats).map(student => ({

            ...student,

            averageScore: Number(
                (student.totalScore / student.totalQuizzes).toFixed(2)
            )

        }));

        // SORT STUDENTS
        leaderboardData.sort((a, b) => {

            if (b.averageScore !== a.averageScore) {
                return b.averageScore - a.averageScore;
            }

            return b.totalQuizzes - a.totalQuizzes;

        });

        // ASSIGN RANKS
        leaderboardData = leaderboardData.map((student, index) => ({
            ...student,
            rank: index + 1
        }));

        // SAVE RANKINGS TO FIRESTORE
        const existingSnapshot = await getDocs(
            collection(adminDb, "leaderboard")
        );

        const existingPhotos = {};

        existingSnapshot.forEach(document => {

            const data = document.data();

            if (data.photoURL) {
                existingPhotos[document.id] = data.photoURL;
            }

        });

        const savePromises = leaderboardData.map(student => {

            return setDoc(
                doc(adminDb, "leaderboard", student.studentUid),
                {
                    studentUid: student.studentUid,
                    studentId: student.studentId,
                    studentName: student.studentName,
                    totalQuizzes: student.totalQuizzes,
                    averageScore: student.averageScore,
                    highestScore: student.highestScore,
                    rank: student.rank,
                    photoURL: student.photoURL ||
                        existingPhotos[student.studentUid] || "",
                    updatedAt: serverTimestamp()
                },
                { merge: true }
            );

        });

        await Promise.all(savePromises);

        // UPDATE ADMIN DASHBOARD
        document.getElementById("leaderboardCount").textContent =
            leaderboardData.length;

        document.getElementById("leaderboardTopStudent").textContent =
            leaderboardData.length > 0
                ? leaderboardData[0].studentName
                : "—";

        renderLeaderboard(leaderboardData);

        message.textContent = "Leaderboard updated successfully.";

    } catch (error) {

        console.error("Leaderboard Loading Error:", error);

        tableBody.innerHTML = `
            <tr><td colspan="7">Unable to load leaderboard.</td></tr>
        `;

        message.textContent = error.message;

    }

}


function renderLeaderboard(data) {

    const tableBody = document.getElementById("leaderboardTableBody");

    tableBody.innerHTML = "";

    if (data.length === 0) {

        tableBody.innerHTML = `
            <tr><td colspan="7">No student results available yet.</td></tr>
        `;

        return;

    }

    // Show Top 10 students
    data.slice(0, 10).forEach(student => {

        const row = document.createElement("tr");

        const values = [
            student.rank,
            student.studentId,
            student.studentName,
            student.totalQuizzes,
            `${student.averageScore}%`,
            `${student.highestScore}%`,
            "—"
        ];

        values.forEach(value => {

            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);

        });

        tableBody.appendChild(row);

    });

}


// SEARCH LEADERBOARD
function filterLeaderboard() {

    const searchValue = document
        .getElementById("leaderboardSearch")
        .value.toLowerCase()
        .trim();

    const filteredData = leaderboardData.filter(student => {

        return (
            student.studentName.toLowerCase().includes(searchValue) ||
            String(student.studentId).toLowerCase().includes(searchValue)
        );

    });

    renderLeaderboard(filteredData);

}


// EVENT LISTENERS
document.getElementById("leaderboardSearch")
    .addEventListener("input", filterLeaderboard);

// document.getElementById("refreshLeaderboaradminDbtn")
//     .addEventListener("click", loadLeaderboard);

document.getElementById("refreshLeaderboardBtn")
    ?.addEventListener("click", loadLeaderboard);

// ================================
// SETTINGS TAB SWITCHING
// ================================

const settingsTabs = document.querySelectorAll(".settings-tab");
const settingsPanels = document.querySelectorAll(".settings-panel");

settingsTabs.forEach(tab => {

    tab.addEventListener("click", () => {

        const targetPanel = tab.dataset.tab;

        // Remove active class from all tabs
        settingsTabs.forEach(item => {
            item.classList.remove("active");
        });

        // Hide all settings panels
        settingsPanels.forEach(panel => {
            panel.classList.remove("active");
        });

        // Activate selected tab
        tab.classList.add("active");

        // Show selected panel
        const selectedPanel = document.getElementById(targetPanel);

        if (selectedPanel) {
            selectedPanel.classList.add("active");
        }

    });

});


// ================================
// FIRESTORE SETTINGS MANAGEMENT
// ================================

// SAVE SETTINGS FUNCTION
async function savePlatformSettings(section, settingsData) {

    const message = document.getElementById("settingsMessage");

    if (!hasPermission("settings")) {
        message.textContent = "You do not have permission to change settings.";
        return;
    }

    try {

        await setDoc(
            doc(adminDb, "settings", "platform"),
            {
                [section]: settingsData,
                updatedAt: serverTimestamp(),
                updateadminDby: auth.currentUser.uid
            },
            { merge: true }
        );

        message.style.color = "green";
        message.textContent = "Settings saved successfully!";

    } catch (error) {

        console.error("Settings Save Error:", error);

        message.style.color = "red";
        message.textContent = error.message;

    }
}


// GENERAL SETTINGS
document.getElementById("saveGeneralSettings")
    .addEventListener("click", () => {

        savePlatformSettings("general", {
            websiteName: document.getElementById("settingWebsiteName").value.trim(),
            tagline: document.getElementById("settingTagline").value.trim(),
            supportEmail: document.getElementById("settingSupportEmail").value.trim(),
            supportContact: document.getElementById("settingSupportContact").value.trim()
        });

    });


// QUIZ SETTINGS
document.getElementById("saveQuizSettings")
    .addEventListener("click", () => {

        savePlatformSettings("quiz", {
            passingPercentage: Number(document.getElementById("settingPassingPercentage").value),
            defaultDuration: Number(document.getElementById("settingQuizDuration").value),
            defaultQuestionCount: Number(document.getElementById("settingQuestionCount").value)
        });

    });


// LEADERBOARD SETTINGS
document.getElementById("saveLeaderboardSettings")
    .addEventListener("click", () => {

        savePlatformSettings("leaderboard", {
            displayLimit: Number(document.getElementById("settingLeaderboardLimit").value),
            rankingMethod: document.getElementById("settingRankingMethod").value
        });

    });


// CERTIFICATE SETTINGS
document.getElementById("saveCertificateSettings")
    .addEventListener("click", () => {

        savePlatformSettings("certificate", {
            status: document.getElementById("settingCertificateStatus").value,
            passingPercentage: Number(document.getElementById("settingCertificatePercentage").value)
        });

    });


// NOTIFICATION SETTINGS
document.getElementById("saveNotificationSettings")
    .addEventListener("click", () => {

        savePlatformSettings("notifications", {
            emailNotification: document.getElementById("settingEmailNotification").checked,
            adminNotification: document.getElementById("settingAdminNotification").checked
        });

    });



// ================================
// LOAD SETTINGS FROM FIRESTORE
// ================================

async function loadPlatformSettings() {

    if (!hasPermission("settings")) return;

    try {

        const settingsRef = doc(adminDb, "settings", "platform");
        const settingsSnap = await getDoc(settingsRef);

        if (!settingsSnap.exists()) {
            console.log("No saved platform settings found.");
            return;
        }

        const data = settingsSnap.data();

        // GENERAL SETTINGS
        if (data.general) {
            document.getElementById("settingWebsiteName").value =
                data.general.websiteName ?? "KrishnaPrep";

            document.getElementById("settingTagline").value =
                data.general.tagline ?? "Your Trusted Digital Service Partner";

            document.getElementById("settingSupportEmail").value =
                data.general.supportEmail ?? "";

            document.getElementById("settingSupportContact").value =
                data.general.supportContact ?? "";
        }

        // QUIZ SETTINGS
        if (data.quiz) {
            document.getElementById("settingPassingPercentage").value =
                data.quiz.passingPercentage ?? 50;

            document.getElementById("settingQuizDuration").value =
                data.quiz.defaultDuration ?? 30;

            document.getElementById("settingQuestionCount").value =
                data.quiz.defaultQuestionCount ?? 30;
        }

        // LEADERBOARD SETTINGS
        if (data.leaderboard) {
            document.getElementById("settingLeaderboardLimit").value =
                data.leaderboard.displayLimit ?? 10;

            document.getElementById("settingRankingMethod").value =
                data.leaderboard.rankingMethod ?? "averageScore";
        }

        // CERTIFICATE SETTINGS
        if (data.certificate) {
            document.getElementById("settingCertificateStatus").value =
                data.certificate.status ?? "enabled";

            document.getElementById("settingCertificatePercentage").value =
                data.certificate.passingPercentage ?? 50;
        }

        // NOTIFICATION SETTINGS
        if (data.notifications) {
            document.getElementById("settingEmailNotification").checked =
                data.notifications.emailNotification ?? false;

            document.getElementById("settingAdminNotification").checked =
                data.notifications.adminNotification ?? true;
        }

        console.log("Platform Settings Loaded Successfully!");

    } catch (error) {

        console.error("Settings Loading Error:", error);

        document.getElementById("settingsMessage").textContent =
            "Unable to load settings: " + error.message;

    }
}

let editingLatestExamId = null;
// let allLatestExams = [];
let currentLatestExamPage = 1;
const latestExamsPerPage = 10;

async function loadLatestExams() {
    const tableBody = document.getElementById("latestExamsTableBody");

    try {
        const examsRef = collection(adminDb, "latestExams");
        const snapshot = await getDocs(examsRef);

        let exams = [];

        snapshot.forEach((docSnap) => {
            exams.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        // Latest exams first
        exams.sort((a, b) => {
            return (b.createdAt?.seconds || 0) -
                (a.createdAt?.seconds || 0);
        });
        allLatestExams = exams;

        // Update statistics
        document.getElementById("totalLatestExams").textContent =
            exams.length;

        document.getElementById("publishedLatestExams").textContent =
            exams.filter(exam => exam.published === true).length;

        document.getElementById("upcomingLatestExams").textContent =
            exams.filter(exam =>
                String(exam.status || "").toLowerCase() === "upcoming"
            ).length;

        // Display exams in table
        renderLatestExamsTable(exams);

    } catch (error) {
        console.error("Latest Exams Loading Error:", error);

        document.getElementById("latestExamMessage").textContent =
            "Unable to load latest exams. Please check permissions.";
    }
}


function renderLatestExamsTable(exams) {
    const tableBody = document.getElementById("latestExamsTableBody");

    const totalExams = exams.length;
    const totalPages = Math.ceil(totalExams / latestExamsPerPage);

    // Current page validation
    if (totalPages === 0) {
        currentLatestExamPage = 1;
    } else if (currentLatestExamPage > totalPages) {
        currentLatestExamPage = totalPages;
    }

    // Calculate records for current page
    const startIndex = (currentLatestExamPage - 1) * latestExamsPerPage;
    const endIndex = Math.min(startIndex + latestExamsPerPage, totalExams);

    const pageExams = exams.slice(startIndex, endIndex);

    // Empty records
    if (totalExams === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7">No exams found.</td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = pageExams.map(exam => `
            <tr>
                <td>${escapeLatestExamHTML(exam.examName || "N/A")}</td>
                <td>${escapeLatestExamHTML(exam.organization || "N/A")}</td>
                <td>${escapeLatestExamHTML(exam.category || "N/A")}</td>
                <td>${escapeLatestExamHTML(exam.applicationLastDate || "N/A")}</td>
                <td>${escapeLatestExamHTML(exam.status || "N/A")}</td>
                <td>
                    <span class="${exam.published === true ? "published-status" : "unpublished-status"}">
                        ${exam.published === true ? "Published" : "Unpublished"}
                    </span>
                    <button type="button"
                        class="toggle-latest-exam-btn"
                        data-id="${exam.id}"
                        data-published="${exam.published === true}">
                        ${exam.published === true ? "Unpublish" : "Publish"}
                    </button>
                </td>
                <td>
                    <button type="button"
                        class="edit-latest-exam-btn"
                        data-id="${exam.id}">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button type="button"
                        class="delete-latest-exam-btn"
                        data-id="${exam.id}">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join("");
    }

    // Pagination information
    document.getElementById("latestExamsShowing").textContent =
        totalExams === 0 ? 0 : `${startIndex + 1}-${endIndex}`;

    document.getElementById("latestExamsTotal").textContent = totalExams;

    // Page numbers
    const pageNumbers = document.getElementById("latestExamsPageNumbers");

    pageNumbers.innerHTML = "";

    for (let page = 1; page <= totalPages; page++) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = page;
        button.className = "pagination-page-btn";

        if (page === currentLatestExamPage) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {
            currentLatestExamPage = page;
            renderLatestExamsTable(exams);
        });

        pageNumbers.appendChild(button);
    }

    // Previous and Next buttons
    const prevBtn = document.getElementById("latestExamsPrevBtn");
    const nextBtn = document.getElementById("latestExamsNextBtn");

    prevBtn.disabled = currentLatestExamPage === 1;
    nextBtn.disabled = currentLatestExamPage >= totalPages || totalPages === 0;
}


function filterLatestExams() {

    const searchInput = document.getElementById("latestExamSearch");
    const statusFilter = document.getElementById("latestExamStatusFilter");
    const publishFilter = document.getElementById("latestExamPublishFilter");

    currentLatestExamPage = 1;

    const searchText = searchInput.value.toLowerCase().trim();
    const selectedStatus = statusFilter.value;
    const selectedPublish = publishFilter.value;

    let filteredExams = allLatestExams.filter(exam => {

        const matchesSearch =
            (exam.examName || "").toLowerCase().includes(searchText) ||
            (exam.organization || "").toLowerCase().includes(searchText) ||
            (exam.category || "").toLowerCase().includes(searchText);

        const matchesStatus =
            selectedStatus === "all" ||
            (exam.status || "").toLowerCase() === selectedStatus.toLowerCase();

        const matchesPublish =
            selectedPublish === "all" ||
            String(exam.published) === selectedPublish;

        return matchesSearch && matchesStatus && matchesPublish;
    });

    renderLatestExamsTable(filteredExams);
}

// Previous Page
document.getElementById("latestExamsPrevBtn")
    .addEventListener("click", () => {

        if (currentLatestExamPage > 1) {
            currentLatestExamPage--;

            filterLatestExams();
        }
    });


// Next Page
document.getElementById("latestExamsNextBtn")
    .addEventListener("click", () => {

        const searchText = document.getElementById("latestExamSearch").value.toLowerCase().trim();
        const selectedStatus = document.getElementById("latestExamStatusFilter").value;
        const selectedPublish = document.getElementById("latestExamPublishFilter").value;

        const filteredExams = allLatestExams.filter(exam => {

            const matchesSearch =
                (exam.examName || "").toLowerCase().includes(searchText) ||
                (exam.organization || "").toLowerCase().includes(searchText) ||
                (exam.category || "").toLowerCase().includes(searchText);

            const matchesStatus =
                selectedStatus === "all" ||
                (exam.status || "").toLowerCase() === selectedStatus.toLowerCase();

            const matchesPublish =
                selectedPublish === "all" ||
                String(exam.published) === selectedPublish;

            return matchesSearch && matchesStatus && matchesPublish;
        });

        const totalPages = Math.ceil(filteredExams.length / latestExamsPerPage);

        if (currentLatestExamPage < totalPages) {
            currentLatestExamPage++;

            filterLatestExams();
        }
    });

// LATEST EXAMS SEARCH AND FILTER EVENTS

const latestExamSearch = document.getElementById("latestExamSearch");
const latestExamStatusFilter = document.getElementById("latestExamStatusFilter");
const latestExamPublishFilter = document.getElementById("latestExamPublishFilter");

if (latestExamSearch) {
    latestExamSearch.addEventListener("input", filterLatestExams);
}

if (latestExamStatusFilter) {
    latestExamStatusFilter.addEventListener("change", filterLatestExams);
}

if (latestExamPublishFilter) {
    latestExamPublishFilter.addEventListener("change", filterLatestExams);
}

// EDIT LATEST EXAM
async function editLatestExam(examId) {
    try {
        const examRef = doc(adminDb, "latestExams", examId);
        const examSnap = await getDoc(examRef);

        if (!examSnap.exists()) {
            alert("Exam not found!");
            return;
        }

        const exam = examSnap.data();
        editingLatestExamId = examId;

        const form = document.getElementById("latestExamForm");
        const formContainer = document.getElementById("latestExamFormContainer");

        form.reset();


        document.getElementById("saveLatestExamBtn").innerHTML =
            '<i class="fa-solid fa-floppy-disk"></i> Update Exam';

        const fields = {
            examName: exam.examName,
            examOrganization: exam.organization,
            examCategory: exam.category,
            advertisementNumber: exam.advertisementNumber,
            notificationDate: exam.notificationDate,
            examStatus: exam.status,
            examDescription: exam.description,
            notificationLink: exam.notificationLink,
            postName: exam.postName,
            totalVacancies: exam.totalVacancies,
            jobLocation: exam.jobLocation,
            payScale: exam.payScale,
            qualification: exam.qualification,
            minimumAge: exam.minimumAge,
            maximumAge: exam.maximumAge,
            ageRelaxation: exam.ageRelaxation,
            applicationStartDate: exam.applicationStartDate,
            applicationLastDate: exam.applicationLastDate,
            feePaymentLastDate: exam.feePaymentLastDate,
            correctionDate: exam.correctionDate,
            examDate: exam.examDate,
            generalFee: exam.generalFee,
            obcFee: exam.obcFee,
            scStFee: exam.scStFee,
            femaleFee: exam.femaleFee,
            paymentMode: exam.paymentMode,
            selectionProcess: exam.selectionProcess,
            applyLink: exam.applyLink,
            officialWebsite: exam.officialWebsite,
            syllabusLink: exam.syllabusLink,
            examPublished: String(exam.published)
        };

        Object.entries(fields).forEach(([id, value]) => {
            const field = document.getElementById(id);

            if (field && value !== undefined && value !== null) {
                field.value = value;
            }
        });

        document.getElementById("latestExamFormTitle").textContent = "Edit Exam";

        formContainer.hidden = false;
        formContainer.scrollIntoView({ behavior: "smooth" });

    } catch (error) {
        console.error("Edit Latest Exam Error:", error);
        alert("Unable to load exam details.");
    }
}

// EDIT AND DELETE LATEST EXAMS
document.addEventListener("click", async function (event) {

    // PUBLISH / UNPUBLISH LATEST EXAM
    const toggleButton = event.target.closest(".toggle-latest-exam-btn");

    if (toggleButton) {
        const examId = toggleButton.dataset.id;
        const currentStatus = toggleButton.dataset.published === "true";

        try {
            toggleButton.disabled = true;
            toggleButton.textContent = "Updating...";

            const examRef = doc(adminDb, "latestExams", examId);

            await updateDoc(examRef, {
                published: !currentStatus,
                updatedAt: serverTimestamp()
            });

            alert(
                !currentStatus
                    ? "Exam Published Successfully!"
                    : "Exam Unpublished Successfully!"
            );

            await loadLatestExams();

        } catch (error) {
            console.error("Publish / Unpublish Error:", error);
            alert("Unable to update exam status. Please try again.");
            toggleButton.disabled = false;
            toggleButton.textContent = currentStatus ? "Unpublish" : "Publish";
        }

        return;
    }

    // EDIT EXAM
    const editButton = event.target.closest(".edit-latest-exam-btn");


    if (editButton) {
        const examId = editButton.dataset.id;

        console.log("Edit Button Clicked!");
        console.log("Exam ID:", examId);

        await editLatestExam(examId);
        return;
    }
    // if (editButton) {
    //     const examId = editButton.dataset.id;
    //     await editLatestExam(examId);
    //     return;
    // }

    // DELETE EXAM
    const deleteButton = event.target.closest(".delete-latest-exam-btn");

    if (deleteButton) {

        const examId = deleteButton.dataset.id;

        const confirmDelete = confirm(
            "Are you sure you want to delete this exam?"
        );

        if (!confirmDelete) return;

        try {
            deleteButton.disabled = true;
            deleteButton.textContent = "Deleting...";

            const examRef = doc(adminDb, "latestExams", examId);

            await deleteDoc(examRef);

            alert("Exam deleted successfully!");

            await loadLatestExams();

        } catch (error) {
            console.error("Delete Latest Exam Error:", error);

            alert("Unable to delete exam. Please try again.");

            deleteButton.disabled = false;
            deleteButton.innerHTML =
                '<i class="fa-solid fa-trash"></i> Delete';
        }
    }

});

// Safely display Firebase text
function escapeLatestExamHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

const addLatestExamBtn = document.getElementById("addLatestExamBtn");
const latestExamFormContainer = document.getElementById("latestExamFormContainer");

if (addLatestExamBtn && latestExamFormContainer) {
    addLatestExamBtn.addEventListener("click", () => {

        editingLatestExamId = null;

        latestExamForm.reset();

        document.getElementById("latestExamFormTitle").textContent =
            "Add New Exam";

        document.getElementById("saveLatestExamBtn").innerHTML =
            '<i class="fa-solid fa-floppy-disk"></i> Save Exam';

        latestExamFormContainer.hidden = false;
        latestExamFormContainer.scrollIntoView({ behavior: "smooth" });

    });
}

// Close Latest Exam Form
const cancelLatestExamBtn = document.getElementById("cancelLatestExamBtn");
const cancelLatestExamFormBtn = document.getElementById("cancelLatestExamFormBtn");

function closeLatestExamForm() {

    editingLatestExamId = null;

    latestExamForm.reset();

    latestExamFormContainer.hidden = true;

    document.getElementById("latestExamFormTitle").textContent =
        "Add New Exam";

    document.getElementById("saveLatestExamBtn").innerHTML =
        '<i class="fa-solid fa-floppy-disk"></i> Save Exam';

    latestExamFormMessage.textContent = "";
}

if (cancelLatestExamBtn) {
    cancelLatestExamBtn.addEventListener("click", closeLatestExamForm);
}

if (cancelLatestExamFormBtn) {
    cancelLatestExamFormBtn.addEventListener("click", closeLatestExamForm);
}


const latestExamForm = document.getElementById("latestExamForm");
const latestExamFormMessage = document.getElementById("latestExamFormMessage");

if (latestExamForm) {
    latestExamForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const saveButton = document.getElementById("saveLatestExamBtn");

        try {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";

            const formData = new FormData(latestExamForm);
            const exam = Object.fromEntries(formData.entries());
            console.log("Latest Exam Form Data:", exam);

            const examData = {
                examName: (exam.examName || "").trim(),
                organization: (exam.examOrganization || "").trim(),
                category: exam.examCategory,
                advertisementNumber: exam.advertisementNumber,
                notificationDate: exam.notificationDate,
                status: exam.examStatus,
                description: exam.examDescription,
                notificationLink: exam.notificationLink,
                postName: exam.postName,
                totalVacancies: Number(exam.totalVacancies) || 0,
                jobLocation: exam.jobLocation,
                payScale: exam.payScale,
                qualification: exam.qualification,
                minimumAge: exam.minimumAge,
                maximumAge: exam.maximumAge,
                ageRelaxation: exam.ageRelaxation,
                applicationStartDate: exam.applicationStartDate,
                applicationLastDate: exam.applicationLastDate,
                feePaymentLastDate: exam.feePaymentLastDate,
                correctionDate: exam.correctionDate,
                examDate: exam.examDate,
                generalFee: exam.generalFee,
                obcFee: exam.obcFee,
                scStFee: exam.scStFee,
                femaleFee: exam.femaleFee,
                paymentMode: exam.paymentMode,
                selectionProcess: exam.selectionProcess,
                applyLink: exam.applyLink,
                officialWebsite: exam.officialWebsite,
                syllabusLink: exam.syllabusLink,
                published: exam.examPublished === "true",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            if (!examData.examName || !examData.organization) {
                throw new Error("Exam Name and Organization are required.");
            }

            if (editingLatestExamId) {

                // UPDATE EXISTING EXAM
                const examRef = doc(adminDb, "latestExams", editingLatestExamId);

                const { createdAt, ...updateData } = examData;

                await updateDoc(examRef, {
                    ...updateData,
                    updatedAt: serverTimestamp()
                });

                latestExamFormMessage.textContent = "Exam updated successfully!";

            } else {

                // ADD NEW EXAM
                const newExamRef = doc(collection(adminDb, "latestExams"));

                await setDoc(newExamRef, examData);

                latestExamFormMessage.textContent = "Exam saved successfully!";
            }

            editingLatestExamId = null;

            latestExamFormMessage.textContent = "Exam saved successfully!";

            latestExamForm.reset();
            // latestExamFormContainer.style.display = "none";
            latestExamFormContainer.hidden = true;

            await loadLatestExams();

        } catch (error) {
            console.error("Save Latest Exam Error:", error);
            latestExamFormMessage.textContent = error.message || "Unable to save exam.";
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save Exam";
        }
    });
}


// =====================================
// KRISHNAPREP EXCEL EXPORT & BACKUP
// =====================================

const exportExcelBtn = document.getElementById("exportExcelBtn");

if (exportExcelBtn) {

    exportExcelBtn.addEventListener("click", async () => {

        // Check Admin Permission
        if (!hasPermission("backups")) {
            alert("You do not have permission to export backups.");
            return;
        }

        // Check Excel Library
        if (typeof XLSX === "undefined") {
            alert("Excel library not loaded. Please refresh the page.");
            return;
        }

        try {

            exportExcelBtn.disabled = true;
            exportExcelBtn.textContent = "Preparing Excel...";

            const workbook = XLSX.utils.book_new();

            const collections = [
                { name: "Latest Exams", id: "latestExams" },
                { name: "Quizzes", id: "quizzes" },
                { name: "Quiz Results", id: "quizResults" },
                { name: "Students", id: "students" }
            ];

            for (const item of collections) {

                const snapshot = await getDocs(
                    collection(adminDb, item.id)
                );

                const rows = snapshot.docs.map(document => ({
                    DocumentID: document.id,
                    ...document.data()
                }));

                // Convert Firebase values for Excel
                const formattedRows = rows.map(row => {

                    const formatted = {};

                    Object.entries(row).forEach(([key, value]) => {

                        if (value && typeof value.toDate === "function") {
                            formatted[key] = value.toDate().toISOString();
                        }
                        else if (
                            value !== null &&
                            typeof value === "object"
                        ) {
                            formatted[key] = JSON.stringify(value);
                        }
                        else {
                            formatted[key] = value ?? "";
                        }

                    });

                    return formatted;

                });

                const worksheet = formattedRows.length
                    ? XLSX.utils.json_to_sheet(formattedRows)
                    : XLSX.utils.aoa_to_sheet([
                        ["No records available"]
                    ]);

                XLSX.utils.book_append_sheet(
                    workbook,
                    worksheet,
                    item.name
                );

            }

            const date = new Date().toISOString().slice(0, 10);

            XLSX.writeFile(
                workbook,
                `KrishnaPrep_Backup_${date}.xlsx`
            );

            alert("Excel Backup downloaded successfully!");

        } catch (error) {

            console.error("Excel Export Error:", error);

            alert(
                "Backup failed: " +
                (error.message || "Please try again.")
            );

        } finally {

            exportExcelBtn.disabled = false;

            exportExcelBtn.innerHTML =
                '<i class="fa-solid fa-download"></i> Export Excel';

        }

    });

}

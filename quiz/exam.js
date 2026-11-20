
// ========================================
// KRISHNAPREP ONLINE EXAM SYSTEM
// FIREBASE AUTHENTICATION + FIRESTORE
// ========================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    addDoc,
    serverTimestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

import { auth, db } from "../js/firebase-config.js";


// ========================================
// GET QUIZ ID
// ========================================

const params = new URLSearchParams(window.location.search);
const quizId = params.get("id");

let quiz = null;
let quizLoaded = false;
// const params = new URLSearchParams(window.location.search);
// const quizId = params.get("id");
// const quiz = quizDatabase[quizId];


// ========================================
// HTML ELEMENTS
// ========================================

const registrationScreen =
    document.getElementById("registrationScreen");

const examScreen =
    document.getElementById("examScreen");

const resultScreen =
    document.getElementById("resultScreen");

const studentForm =
    document.getElementById("studentForm");

const questionText =
    document.getElementById("questionText");

const optionsContainer =
    document.getElementById("optionsContainer");

const questionPalette =
    document.getElementById("questionPalette");

const timerElement =
    document.getElementById("timer");

const studentNameInput =
    document.getElementById("studentName");

const studentEmailInput =
    document.getElementById("studentEmail");

const startExamBtn =
    document.querySelector(".start-exam-btn");

const submitModal =
    document.getElementById("submitModal");


// ========================================
// EXAM VARIABLES
// ========================================

let currentStudent = null;
let unsubscribeStudentStatus = null;

let studentName = "";
let studentEmail = "";

let currentQuestion = 0;
let remainingSeconds = 0;

let timerInterval = null;

let examSubmitted = false;
let examStarted = false;

let answers = [];
let markedForReview = [];


// ========================================
// VALIDATE QUIZ
// ========================================

// ========================================
// LOAD QUIZ FROM FIRESTORE
// ========================================

async function loadQuizFromFirestore() {

    try {

        if (!quizId) {
            throw new Error("Quiz ID is missing.");
        }

        const quizRef = doc(db, "quizzes", quizId);
        const quizSnapshot = await getDoc(quizRef);

        if (!quizSnapshot.exists()) {
            throw new Error("Quiz not found.");
        }

        const quizData = quizSnapshot.data();

        if (quizData.status !== "ACTIVE") {
            throw new Error("This quiz is currently unavailable.");
        }

        if (!Array.isArray(quizData.questions) ||
            quizData.questions.length === 0) {
            throw new Error("No questions available in this quiz.");
        }

        quiz = quizData;

        quizLoaded = true;

        document.getElementById("headerExamTitle").textContent =
            quiz.title;

        document.getElementById("registrationTitle").textContent =
            quiz.title;

        document.getElementById("registrationDescription").textContent =
            `${quiz.questions.length} Questions | ${quiz.duration} Minutes`;

        document.getElementById("totalQuestions").textContent =
            quiz.questions.length;

        answers = new Array(quiz.questions.length).fill(null);

        markedForReview =
            new Array(quiz.questions.length).fill(false);

        if (currentStudent) {
            startExamBtn.disabled = false;
            startExamBtn.innerHTML = `
                Start Examination
                <i class="fa-solid fa-arrow-right"></i>
            `;
        }

        console.log("Quiz Loaded From Firestore:", quizId);

    } catch (error) {

        console.error("Quiz Loading Error:", error);
        console.error("Quiz Error Message:", error.message);
        console.error("Quiz Error Code:", error.code);
        document.querySelector(".registration-card").innerHTML = `
            <h2>Quiz Unavailable</h2>
            <p>${error.message}</p>
            <a href="quiz-home.html">Back to Quiz Dashboard</a>
        `;

        studentForm.style.display = "none";

    }

}

loadQuizFromFirestore();


// ========================================
// FIREBASE STUDENT AUTHENTICATION
// ========================================

studentNameInput.readOnly = true;
studentEmailInput.readOnly = true;

startExamBtn.disabled = true;
startExamBtn.textContent = "Verifying Student...";

onAuthStateChanged(auth, async function (user) {

    if (!user) {

        window.location.replace("login.html");
        return;
    }

    try {

        const studentRef = doc(db, "students", user.uid);

        const studentSnapshot = await getDoc(studentRef);

        if (!studentSnapshot.exists()) {

            await signOut(auth);

            alert("Student profile not found. Please login again.");

            window.location.replace("login.html");
            return;
        }

        const studentData = studentSnapshot.data();

        if (studentData.accountStatus !== "ACTIVE") {

            await signOut(auth);

            alert("Your account is not active.");

            window.location.replace("login.html");
            return;
        }

        currentStudent = {
            uid: user.uid,
            studentId: studentData.studentId,
            studentName: studentData.studentName,
            email: studentData.email
        };

        studentName = currentStudent.studentName;
        studentEmail = currentStudent.email;

        studentNameInput.value = studentName;
        studentEmailInput.value = studentEmail;

        if (quizLoaded) {

            startExamBtn.disabled = false;

            startExamBtn.innerHTML = `
        Start Examination
        <i class="fa-solid fa-arrow-right"></i>
        `;

        }
        // startExamBtn.disabled = false;
        // startExamBtn.innerHTML = `
        //     Start Examination
        //     <i class="fa-solid fa-arrow-right"></i>
        // `;

        console.log("Firebase Student Verified:", currentStudent.studentId);

    } catch (error) {

        console.error("Student Verification Error:", error);
        console.error("Student Error Message:", error.message);
        console.error("Student Error Code:", error.code);
        alert("Unable to verify your account. Please login again.");

        await signOut(auth);

        window.location.replace("login.html");
    }

});


// ========================================
// START EXAM
// ========================================

studentForm.addEventListener("submit", function (event) {

    event.preventDefault();

    if (!quiz || !currentStudent || examSubmitted || examStarted) {
        return;
    }

    examStarted = true;

    studentName = currentStudent.studentName;
    studentEmail = currentStudent.email;

    document.getElementById("displayStudentName").textContent =
        studentName;

    registrationScreen.hidden = true;
    examScreen.hidden = false;

    currentQuestion = 0;

    renderQuestion();
    renderPalette();
    updateProgress();

    startTimer();

});


// ========================================
// DISPLAY QUESTION
// ========================================

function renderQuestion() {

    const question = quiz.questions[currentQuestion];

    document.getElementById("questionNumber").textContent =
        `Question ${currentQuestion + 1} of ${quiz.questions.length}`;

    questionText.textContent = question.question;

    optionsContainer.innerHTML = "";

    question.options.forEach((option, index) => {

        const selected =
            answers[currentQuestion] === index;

        const label = document.createElement("label");

        label.className =
            "option-item" + (selected ? " selected" : "");

        const input = document.createElement("input");

        input.type = "radio";
        input.name = "answer";
        input.value = index;
        input.checked = selected;

        const text = document.createElement("span");

        text.textContent =
            String.fromCharCode(65 + index) + ". " + option;

        label.appendChild(input);
        label.appendChild(text);

        label.addEventListener("click", () => {

            if (examSubmitted) return;

            answers[currentQuestion] = index;

            renderQuestion();
            renderPalette();
            updateProgress();

        });

        optionsContainer.appendChild(label);

    });


    // PREVIOUS BUTTON

    document.getElementById("previousBtn").disabled =
        currentQuestion === 0;


    // NEXT BUTTON

    document.getElementById("nextBtn").innerHTML =

        currentQuestion === quiz.questions.length - 1

            ? 'Finish Questions <i class="fa-solid fa-arrow-right"></i>'

            : 'Save & Next <i class="fa-solid fa-arrow-right"></i>';


    // REVIEW BUTTON

    const reviewButton =
        document.getElementById("markReviewBtn");

    reviewButton.classList.toggle(
        "active",
        markedForReview[currentQuestion]
    );

    reviewButton.innerHTML = markedForReview[currentQuestion]

        ? '<i class="fa-solid fa-bookmark"></i> Remove Review'

        : '<i class="fa-regular fa-bookmark"></i> Mark for Review';

}


// ========================================
// NEXT QUESTION
// ========================================

document.getElementById("nextBtn").addEventListener("click", () => {

    if (examSubmitted || !examStarted) return;

    if (currentQuestion < quiz.questions.length - 1) {

        currentQuestion++;

        renderQuestion();
        renderPalette();
        updateProgress();

    } else {

        openSubmitModal();

    }

});


// ========================================
// PREVIOUS QUESTION
// ========================================

document.getElementById("previousBtn").addEventListener("click", () => {

    if (examSubmitted || !examStarted) return;

    if (currentQuestion > 0) {

        currentQuestion--;

        renderQuestion();
        renderPalette();
        updateProgress();

    }

});


// ========================================
// MARK FOR REVIEW
// ========================================

document.getElementById("markReviewBtn")
    .addEventListener("click", () => {

        if (examSubmitted || !examStarted) return;

        markedForReview[currentQuestion] =
            !markedForReview[currentQuestion];

        renderQuestion();
        renderPalette();
        updateProgress();

    });


// ========================================
// CLEAR ANSWER
// ========================================

document.getElementById("clearAnswerBtn")
    .addEventListener("click", () => {

        if (examSubmitted || !examStarted) return;

        answers[currentQuestion] = null;

        renderQuestion();
        renderPalette();
        updateProgress();

    });


// ========================================
// QUESTION PALETTE
// ========================================

function renderPalette() {

    questionPalette.innerHTML = "";

    quiz.questions.forEach((question, index) => {

        const button = document.createElement("button");

        button.type = "button";
        button.textContent = index + 1;
        button.className = "palette-btn";

        if (answers[index] !== null) {

            button.classList.add("answered");

        } else {

            button.classList.add("not-answered");

        }

        if (markedForReview[index]) {

            button.classList.remove("answered");
            button.classList.remove("not-answered");

            button.classList.add("review");

        }

        if (index === currentQuestion) {

            button.classList.add("current");

        }

        button.addEventListener("click", () => {

            if (examSubmitted || !examStarted) return;

            currentQuestion = index;

            renderQuestion();
            renderPalette();
            updateProgress();

        });

        questionPalette.appendChild(button);

    });

}


// ========================================
// UPDATE PROGRESS
// ========================================

function updateProgress() {

    const total = quiz.questions.length;

    const answered = answers.filter(
        answer => answer !== null
    ).length;

    const review = markedForReview.filter(
        value => value
    ).length;

    const remaining = total - answered;

    const percentage = Math.round(
        (answered / total) * 100
    );

    document.getElementById("answeredCount").textContent =
        answered;

    document.getElementById("remainingCount").textContent =
        remaining;

    document.getElementById("reviewCount").textContent =
        review;

    document.getElementById("progressText").textContent =
        percentage + "% Completed";

    document.getElementById("progressBar").style.width =
        percentage + "%";

}


// ========================================
// EXAM TIMER
// ========================================

function startTimer() {

    remainingSeconds = quiz.duration * 60;

    updateTimer();

    timerInterval = setInterval(() => {

        remainingSeconds--;

        updateTimer();

        if (remainingSeconds <= 0) {

            clearInterval(timerInterval);

            alert("Time is over! Your examination will be submitted.");

            submitExam();

        }

    }, 1000);

}


function updateTimer() {

    const minutes = Math.floor(remainingSeconds / 60);

    const seconds = remainingSeconds % 60;

    timerElement.innerHTML = `
        <i class="fa-regular fa-clock"></i>
        ${String(minutes).padStart(2, "0")}:
        ${String(seconds).padStart(2, "0")}
    `;

    const timerBox =
        document.querySelector(".timer-box");

    timerBox.classList.toggle(
        "warning",
        remainingSeconds <= 60
    );

}


// ========================================
// SUBMIT CONFIRMATION
// ========================================

function openSubmitModal() {

    if (examSubmitted || !examStarted) return;

    submitModal.hidden = false;

}


document.getElementById("submitExamBtn")
    .addEventListener("click", openSubmitModal);


document.getElementById("cancelSubmit")
    .addEventListener("click", () => {

        submitModal.hidden = true;

    });


document.getElementById("confirmSubmit")
    .addEventListener("click", () => {

        submitModal.hidden = true;

        submitExam();

    });


// ========================================
// SUBMIT EXAM & CALCULATE RESULT
// ========================================

async function submitExam() {

    if (examSubmitted || !quiz || !examStarted || !currentStudent) {
        return;
    }

    examSubmitted = true;

    clearInterval(timerInterval);

    examScreen.hidden = true;
    resultScreen.hidden = false;

    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    quiz.questions.forEach((question, index) => {

        if (answers[index] === null) {

            skipped++;

        } else if (answers[index] === question.answer) {

            correct++;

        } else {

            wrong++;

        }

    });

    const total = quiz.questions.length;

    const percentage = Math.round(
        (correct / total) * 100
    );


    // ========================================
    // CALCULATE TIME TAKEN
    // ========================================

    const timeTakenSeconds =
        Math.max(0, (quiz.duration * 60) - remainingSeconds);

    const minutesTaken =
        Math.floor(timeTakenSeconds / 60);

    const secondsTaken =
        timeTakenSeconds % 60;

    const timeTaken =
        `${minutesTaken}m ${secondsTaken}s`;


    // ========================================
    // DISPLAY RESULT
    // ========================================

    document.getElementById("resultStudentName").textContent =
        `${studentName} | ${quiz.title}`;

    document.getElementById("finalScore").textContent =
        `${correct} / ${total}`;

    document.getElementById("finalPercentage").textContent =
        `${percentage}%`;

    document.getElementById("correctAnswers").textContent =
        correct;

    document.getElementById("wrongAnswers").textContent =
        wrong;

    document.getElementById("skippedAnswers").textContent =
        skipped;


    let message = "";

    if (percentage >= 80) {

        message = "Excellent! Keep up the great work.";

    } else if (percentage >= 60) {

        message = "Very Good! Keep improving your preparation.";

    } else if (percentage >= 40) {

        message = "Good effort! Practice more to improve your score.";

    } else {

        message = "Keep learning and try again. Practice makes progress.";

    }

    const resultMessage =
        document.getElementById("resultMessage");

    resultMessage.textContent =
        message + " Saving your result to Firebase...";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    // ========================================
    // SAVE RESULT TO FIRESTORE
    // ========================================

    const resultData = {

        studentUid: currentStudent.uid,

        studentId: currentStudent.studentId,

        studentName: studentName,

        studentEmail: studentEmail,

        quizId: quizId,

        quizTitle: quiz.title,

        totalQuestions: total,

        correct: correct,

        wrong: wrong,

        skipped: skipped,

        percentage: percentage,

        timeTakenSeconds: timeTakenSeconds,

        timeTaken: timeTaken,

        submittedAt: serverTimestamp()

    };


    try {

        const resultRef = await addDoc(
            collection(db, "quizResults"),
            resultData
        );

        console.log(
            "Quiz Result Saved Successfully:",
            resultRef.id
        );

        resultMessage.textContent =
            message + " Your result has been saved successfully.";

    } catch (error) {

        console.error("Firebase Result Save Error:", error);

        resultMessage.textContent =
            message + " Warning: Your result could not be saved. Please contact support.";

    }

}


// ========================================
// REVIEW ANSWERS
// ========================================

document.getElementById("reviewAnswersBtn")
    .addEventListener("click", () => {

        const reviewBox =
            document.getElementById("answerReview");

        reviewBox.hidden = !reviewBox.hidden;

        if (reviewBox.hidden) return;

        reviewBox.innerHTML =
            "<h3>Question-wise Answer Review</h3>";

        quiz.questions.forEach((question, index) => {

            const selected = answers[index];

            const correctAnswer = question.answer;

            const isCorrect = selected === correctAnswer;

            const item = document.createElement("div");

            item.className = "answer-review-item";

            const heading = document.createElement("h4");

            heading.textContent =
                `Q${index + 1}. ${question.question}`;

            const selectedText = document.createElement("p");

            selectedText.className =
                isCorrect ? "correct-text" : "wrong-text";

            selectedText.textContent = selected === null

                ? "Your Answer: Not Attempted"

                : "Your Answer: " + question.options[selected];

            const correctText = document.createElement("p");

            correctText.className = "correct-text";

            correctText.textContent =
                "Correct Answer: " + question.options[correctAnswer];

            const explanation = document.createElement("p");

            explanation.textContent =
                "Explanation: " + (question.explanation || "No explanation available.");

            item.appendChild(heading);
            item.appendChild(selectedText);
            item.appendChild(correctText);
            item.appendChild(explanation);

            reviewBox.appendChild(item);

        });

        reviewBox.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    });

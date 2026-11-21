
// =====================================
// KRISHNAPREP QUIZ DASHBOARD
// FIRESTORE CONNECTED VERSION
// =====================================

import { db } from "../js/firebase-config.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";


// =====================================
// HTML ELEMENTS
// =====================================

const examGrid = document.getElementById("examGrid");
const searchInput = document.getElementById("quizSearch");
const categoryFilter = document.getElementById("categoryFilter");
const typeFilter = document.getElementById("typeFilter");
const noResults = document.getElementById("noResults");


// =====================================
// QUIZ DATABASE
// =====================================

let quizzes = [];


// =====================================
// LOAD QUIZZES FROM FIRESTORE
// =====================================

async function loadQuizzes() {

    examGrid.innerHTML = `
        <p class="quiz-loading">Loading quizzes...</p>
    `;

    try {

        const querySnapshot = await getDocs(
            collection(db, "quizzes")
        );

        quizzes = querySnapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(quiz =>
                String(quiz.status || "").toUpperCase() === "ACTIVE"
            )
            .map(quiz => ({
                ...quiz,
                questions: Array.isArray(quiz.questions)
                    ? quiz.questions.length
                    : 0,
                title: quiz.title || "Untitled Quiz",
                description: quiz.description || "",
                category: String(quiz.category || "general").toLowerCase(),
                type: String(quiz.type || "mock").toLowerCase(),
                subject: quiz.subject || "General",
                duration: Number(quiz.duration) || 0,
                level: quiz.level || "All Levels"
            }));

        filterQuizzes();

    } catch (error) {

        console.error("Quiz loading error:", error);

        examGrid.innerHTML = `
            <p class="quiz-loading">
                Unable to load quizzes. Please try again later.
            </p>
        `;

        noResults.hidden = true;

    }

}


// =====================================
// DISPLAY QUIZZES
// =====================================

function displayQuizzes(list) {

    examGrid.innerHTML = "";

    noResults.hidden = list.length !== 0;

    list.forEach(quiz => {

        const card = document.createElement("div");

        card.className = "exam-card";

        card.innerHTML = `

            <div class="exam-card-top">

                <span class="exam-type">
                    ${quiz.type.toUpperCase()}
                </span>

                <h3></h3>

                <p></p>

            </div>

            <div class="exam-card-body">

                <div class="exam-info">

                    <span>
                        <i class="fa-solid fa-book"></i>
                        ${quiz.questions} Questions
                    </span>

                    <span>
                        <i class="fa-solid fa-clock"></i>
                        ${quiz.duration} Minutes
                    </span>

                    <span>
                        <i class="fa-solid fa-layer-group"></i>
                    </span>

                    <span>
                        <i class="fa-solid fa-book-open"></i>
                    </span>

                </div>

                <button class="exam-start"
                    data-quiz-id="${quiz.id}">

                    Start Exam
                    <i class="fa-solid fa-arrow-right"></i>

                </button>

            </div>

        `;

        card.querySelector("h3").textContent = quiz.title;
        card.querySelector(".exam-card-top p").textContent = quiz.description;

        const infoItems = card.querySelectorAll(".exam-info span");
        infoItems[2].append(document.createTextNode(quiz.level));
        infoItems[3].append(document.createTextNode(quiz.subject));

        examGrid.appendChild(card);

    });

}


// =====================================
// SEARCH AND FILTER
// =====================================

function filterQuizzes() {

    const searchText = searchInput.value.toLowerCase().trim();

    const selectedCategory = categoryFilter.value;

    const selectedType = typeFilter.value;

    const filtered = quizzes.filter(quiz => {

        const searchMatch =

            quiz.title.toLowerCase().includes(searchText) ||

            quiz.description.toLowerCase().includes(searchText) ||

            quiz.subject.toLowerCase().includes(searchText) ||

            quiz.id.toLowerCase().includes(searchText);

        const categoryMatch =

            selectedCategory === "all" ||

            quiz.category === selectedCategory;

        const typeMatch =

            selectedType === "all" ||

            quiz.type === selectedType;

        return searchMatch && categoryMatch && typeMatch;

    });

    displayQuizzes(filtered);

}


// =====================================
// EVENT LISTENERS
// =====================================

searchInput.addEventListener("input", filterQuizzes);

categoryFilter.addEventListener("change", filterQuizzes);

typeFilter.addEventListener("change", filterQuizzes);


// =====================================
// CATEGORY CARD CLICK
// =====================================

document.querySelectorAll(".category-card").forEach(button => {

    button.addEventListener("click", () => {

        const category = button.dataset.category;

        categoryFilter.value = category;

        filterQuizzes();

        document.getElementById("exams").scrollIntoView({
            behavior: "smooth"
        });

    });

});


// =====================================
// START EXAM
// =====================================

examGrid.addEventListener("click", function (event) {

    const button = event.target.closest(".exam-start");

    if (!button) return;

    const quizId = button.dataset.quizId;

    window.location.href =
        "exam.html?id=" + encodeURIComponent(quizId);

});


// =====================================
// MOBILE MENU
// =====================================

const menuToggle = document.getElementById("menuToggle");

const navMenu = document.getElementById("navMenu");

menuToggle.addEventListener("click", () => {

    navMenu.classList.toggle("active");

    const icon = menuToggle.querySelector("i");

    icon.classList.toggle("fa-bars");

    icon.classList.toggle("fa-xmark");

});

document.querySelectorAll(".nav-menu a").forEach(link => {

    link.addEventListener("click", () => {

        navMenu.classList.remove("active");

        const icon = menuToggle.querySelector("i");

        icon.classList.remove("fa-xmark");

        icon.classList.add("fa-bars");

    });

});


// =====================================
// CURRENT YEAR
// =====================================

// document.getElementById("year").textContent =
//     new Date().getFullYear();

const yearElement = document.getElementById("year");

if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}

// =====================================
// INITIALIZE DASHBOARD
// =====================================

loadQuizzes();


import { db } from "../js/firebase-config.js";

import {
    collection,
    onSnapshot,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";


// =====================================
// MOBILE MENU
// =====================================

const menuBtn = document.getElementById("kpMenuBtn");
const mobileMenu = document.getElementById("kpMobileMenu");

if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", () => {
        mobileMenu.classList.toggle("show");

        const icon = menuBtn.querySelector("i");

        if (icon) {
            icon.classList.toggle("fa-bars");
            icon.classList.toggle("fa-xmark");
        }
    });
}


// =====================================
// HTML ELEMENTS
// =====================================

const examContainer = document.getElementById("examContainer");
const loadingMessage = document.getElementById("loadingMessage");
const noExams = document.getElementById("noExams");

const examSearch = document.getElementById("examSearch");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");

const totalExams = document.getElementById("totalExams");
const activeExams = document.getElementById("activeExams");
const upcomingExams = document.getElementById("upcomingExams");


// =====================================
// EXAM DATA
// =====================================

let allExams = [];


// =====================================
// SAFE URL CHECK
// =====================================

function getSafeUrl(value) {

    try {
        const url = new URL(value);

        if (url.protocol === "https:" || url.protocol === "http:") {
            return url.href;
        }

    } catch (error) {
        return "";
    }

    return "";
}


// =====================================
// CREATE EXAM CARD
// =====================================



function createExamCard(exam) {
    console.log("Public Exam ID:", exam.id, exam);
    const card = document.createElement("article");
    card.className = "exam-card";

    // TOP SECTION
    const top = document.createElement("div");
    top.className = "exam-card-top";

    const category = document.createElement("span");
    category.className = "exam-category";
    category.textContent = exam.category || "Other";

    const status = document.createElement("span");

    const statusValue = exam.status || "Upcoming";

    status.className = "exam-status " +
        statusValue.toLowerCase();

    status.textContent = statusValue;

    top.append(category, status);


    // EXAM NAME
    const heading = document.createElement("h3");
    heading.textContent = exam.examName || "Untitled Exam";


    // ORGANIZATION
    const organization = document.createElement("p");
    organization.className = "exam-organization";

    organization.textContent =
        exam.organization || "Organization not specified";


    // DETAILS
    const details = document.createElement("div");
    details.className = "exam-card-details";


    function addDetail(label, value) {

        if (value === undefined || value === null || value === "") return;

        const row = document.createElement("div");
        row.className = "exam-detail-row";

        const name = document.createElement("span");
        name.textContent = label;

        const detailValue = document.createElement("strong");
        detailValue.textContent = value;

        row.append(name, detailValue);

        details.appendChild(row);
    }

    addDetail("Post", exam.postName);
    addDetail("Vacancies", exam.totalVacancies);
    addDetail("Qualification", exam.qualification);
    addDetail("Last Date", exam.applicationLastDate);


    // FOOTER
    const footer = document.createElement("div");
    footer.className = "exam-card-footer";


    // VIEW DETAILS BUTTON
    const detailsButton = document.createElement("a");

    detailsButton.className = "view-details-btn";
    detailsButton.href =
        `exam-details.html?id=${encodeURIComponent(exam.id)}`;

    detailsButton.textContent = "View Details";

    footer.appendChild(detailsButton);


    // APPLY ONLINE BUTTON
    const applyUrl = getSafeUrl(exam.applyLink);

    if (applyUrl) {

        const applyButton = document.createElement("a");

        applyButton.className = "apply-exam-btn";
        applyButton.href = applyUrl;
        applyButton.target = "_blank";
        applyButton.rel = "noopener noreferrer";
        applyButton.textContent = "Apply Online";

        footer.appendChild(applyButton);

    } else {

        const unavailable = document.createElement("span");

        unavailable.className = "apply-exam-btn";
        unavailable.textContent = "Application Link Unavailable";

        footer.appendChild(unavailable);
    }


    card.append(
        top,
        heading,
        organization,
        details,
        footer
    );

    return card;
}




// =====================================
// RENDER EXAMS
// =====================================

function renderExams() {

    const searchValue = examSearch.value
        .trim()
        .toLowerCase();

    const selectedCategory = categoryFilter.value;
    const selectedStatus = statusFilter.value;


    const filteredExams = allExams.filter(exam => {

        const searchableText = [
            exam.examName,
            exam.organization,
            exam.category,
            exam.postName
        ].join(" ").toLowerCase();

        const matchesSearch =
            searchableText.includes(searchValue);

        const matchesCategory =
            !selectedCategory ||
            exam.category === selectedCategory;

        const matchesStatus =
            !selectedStatus ||
            exam.status === selectedStatus;

        return matchesSearch &&
            matchesCategory &&
            matchesStatus;
    });


    examContainer.innerHTML = "";

    filteredExams.forEach(exam => {

        const card = createExamCard(exam);

        examContainer.appendChild(card);
    });


    noExams.hidden = filteredExams.length !== 0;
}


// =====================================
// UPDATE STATISTICS
// =====================================

function updateStatistics() {

    totalExams.textContent = allExams.length;

    activeExams.textContent =
        allExams.filter(exam =>
            exam.status === "Active"
        ).length;

    upcomingExams.textContent =
        allExams.filter(exam =>
            exam.status === "Upcoming"
        ).length;
}


// =====================================
// FIREBASE REAL-TIME LISTENER
// =====================================

function loadLatestExams() {

    const examsRef = collection(db, "latestExams");

    const publishedExamsQuery = query(
        examsRef,
        where("published", "==", true)
    );

    onSnapshot(publishedExamsQuery, (snapshot) => {

        allExams = [];

        snapshot.forEach(documentSnapshot => {

            const exam = documentSnapshot.data();

            // Only published exams will be visible publicly
            if (exam.published === true) {

                allExams.push({
                    id: documentSnapshot.id,
                    ...exam
                });
            }
        });


        // Newest exams first
        allExams.sort((a, b) => {

            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;

            return dateB - dateA;
        });


        loadingMessage.style.display = "none";

        updateStatistics();
        renderExams();

    }, (error) => {

        console.error("Latest Exams Firebase Error:", error);

        loadingMessage.style.display = "none";

        noExams.hidden = false;

        noExams.querySelector("h3").textContent =
            "Unable to Load Exams";

        noExams.querySelector("p").textContent =
            "Please check your internet connection or try again later.";

    });
}


// =====================================
// SEARCH AND FILTER EVENTS
// =====================================

examSearch.addEventListener("input", renderExams);

categoryFilter.addEventListener("change", renderExams);

statusFilter.addEventListener("change", renderExams);


// =====================================
// START
// =====================================

loadLatestExams();


import { db } from "../js/firebase-config.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const detailsContainer = document.getElementById("examDetailsContainer");
const errorContainer = document.getElementById("examDetailsError");

// Get Exam ID from URL
const params = new URLSearchParams(window.location.search);
const examId = params.get("id");

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== ""
        ? escapeHTML(value)
        : "Not Available";
}

function createDetail(label, value) {
    return `
        <div class="detail-item">
            <span>${escapeHTML(label)}</span>
            <strong>${showValue(value)}</strong>
        </div>
    `;
}

function renderExamDetails(exam) {

    document.title = `${exam.examName || "Exam Details"} | KrishnaPrep`;

    const status = String(exam.status || "Upcoming").toLowerCase();

    let statusClass = "status-upcoming";

    if (status === "active") {
        statusClass = "status-active";
    } else if (status === "closed") {
        statusClass = "status-closed";
    }

    detailsContainer.innerHTML = `

        <div class="exam-details-header">

            <span class="exam-category">
                ${showValue(exam.category)}
            </span>

            <h1>${showValue(exam.examName)}</h1>

            <p>${showValue(exam.organization)}</p>

            <span class="exam-status ${statusClass}">
                ${escapeHTML(exam.status || "Upcoming")}
            </span>

            <p class="exam-advertisement">
                Advertisement No: ${showValue(exam.advertisementNumber)}
            </p>

        </div>


        <div class="exam-details-content">

            <section class="details-card">

                <h2><i class="fa-solid fa-circle-info"></i> Overview</h2>

                <div class="details-grid">
                    ${createDetail("Post Name", exam.postName)}
                    ${createDetail("Total Vacancies", exam.totalVacancies)}
                    ${createDetail("Organization", exam.organization)}
                    ${createDetail("Job Location", exam.jobLocation)}
                    ${createDetail("Pay Scale", exam.payScale)}
                    ${createDetail("Qualification", exam.qualification)}
                </div>

                <div class="details-description">
                    <h3>About This Recruitment</h3>
                    <p>${showValue(exam.description)}</p>
                </div>

            </section>


            <section class="details-card">

                <h2><i class="fa-solid fa-calendar-days"></i> Important Dates</h2>

                <div class="details-grid">
                    ${createDetail("Notification Date", exam.notificationDate)}
                    ${createDetail("Application Start Date", exam.applicationStartDate)}
                    ${createDetail("Last Date to Apply", exam.applicationLastDate)}
                    ${createDetail("Fee Payment Last Date", exam.feePaymentLastDate)}
                    ${createDetail("Correction Date", exam.correctionDate)}
                    ${createDetail("Exam Date", exam.examDate)}
                </div>

            </section>


            <section class="details-card">

                <h2><i class="fa-solid fa-user-check"></i> Age Limit & Eligibility</h2>

                <div class="details-grid">
                    ${createDetail("Minimum Age", exam.minimumAge)}
                    ${createDetail("Maximum Age", exam.maximumAge)}
                    ${createDetail("Age Relaxation", exam.ageRelaxation)}
                    ${createDetail("Qualification", exam.qualification)}
                </div>

            </section>


            <section class="details-card">

                <h2><i class="fa-solid fa-indian-rupee-sign"></i> Application Fee</h2>

                <div class="details-grid">
                    ${createDetail("General", exam.generalFee)}
                    ${createDetail("OBC", exam.obcFee)}
                    ${createDetail("SC / ST", exam.scStFee)}
                    ${createDetail("Female", exam.femaleFee)}
                    ${createDetail("Payment Mode", exam.paymentMode)}
                </div>

            </section>


            <section class="details-card">

                <h2><i class="fa-solid fa-list-check"></i> Selection Process</h2>

                <p>${showValue(exam.selectionProcess)}</p>

            </section>


            <section class="details-card">

                <h2><i class="fa-solid fa-link"></i> Important Links</h2>

                <div class="exam-action-links">

                    ${exam.notificationLink ? `
                        <a href="${escapeHTML(exam.notificationLink)}"
                           target="_blank" rel="noopener noreferrer">
                            <i class="fa-solid fa-file-pdf"></i>
                            Official Notification
                        </a>
                    ` : ""}

                    ${exam.syllabusLink ? `
                        <a href="${escapeHTML(exam.syllabusLink)}"
                           target="_blank" rel="noopener noreferrer">
                            <i class="fa-solid fa-book"></i>
                            Syllabus
                        </a>
                    ` : ""}

                    ${exam.officialWebsite ? `
                        <a href="${escapeHTML(exam.officialWebsite)}"
                           target="_blank" rel="noopener noreferrer">
                            <i class="fa-solid fa-globe"></i>
                            Official Website
                        </a>
                    ` : ""}

                    ${exam.applyLink ? `
                        <a href="${escapeHTML(exam.applyLink)}"
                           target="_blank" rel="noopener noreferrer"
                           class="apply-now-btn">
                            <i class="fa-solid fa-paper-plane"></i>
                            Apply Online
                        </a>
                    ` : ""}

                </div>

            </section>

        </div>


        <div class="exam-details-disclaimer">
            <strong>Disclaimer:</strong>
            Candidates should verify all information through the official
            notification before applying. KrishnaPrep is not a government website.
        </div>

    `;
}


// Load Exam from Firebase
async function loadExamDetails() {

    if (!examId) {
        detailsContainer.hidden = true;
        errorContainer.hidden = false;
        return;
    }

    try {

        const examRef = doc(db, "latestExams", examId);
        const examSnapshot = await getDoc(examRef);

        if (!examSnapshot.exists()) {
            detailsContainer.hidden = true;
            errorContainer.hidden = false;
            return;
        }

        const exam = examSnapshot.data();

        // Only published exams are publicly visible
        if (exam.published !== true) {
            detailsContainer.hidden = true;
            errorContainer.hidden = false;
            return;
        }

        renderExamDetails(exam);

    } catch (error) {

        console.error("Exam Details Loading Error:", error);

        detailsContainer.hidden = true;
        errorContainer.hidden = false;

    }
}


// Mobile Menu
const menuButton = document.getElementById("kpMenuBtn");
const mobileMenu = document.getElementById("kpMobileMenu");

if (menuButton && mobileMenu) {
    menuButton.addEventListener("click", () => {
        mobileMenu.classList.toggle("active");
    });
}

loadExamDetails();

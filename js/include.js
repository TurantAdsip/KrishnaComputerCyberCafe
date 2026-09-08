// Header Load
// fetch("../includes/header.html")
//     .then(response => response.text())
//     .then(data => {
//         document.getElementById("header").innerHTML = data;
//     });

// // Coming Soon
// fetch("../includes/coming-soon.html")
//     .then(res => res.text())
//     .then(data => {
//         document.getElementById("coming-soon").innerHTML = data;
//     });

// Header

fetch("../includes/header.html")
    .then(res => res.text())
    .then(data => {
        const header = document.getElementById("header");

        if (header) {
            header.innerHTML = data;
        }
    });

// =====================================================
// COMMON HAMBURGER MENU
// Mobile + Tablet Only
// =====================================================

function setupMobileMenu() {

    const menuToggle = document.getElementById("menuToggle");
    const mainMenu = document.getElementById("mainMenu");

    // Agar menu elements nahi mile
    if (!menuToggle || !mainMenu) {

        console.log("Hamburger menu elements not found");

        return;
    }


    // =================================================
    // OPEN / CLOSE MENU
    // =================================================

    menuToggle.addEventListener("click", function (event) {

        event.stopPropagation();

        mainMenu.classList.toggle("active");


        // Menu Open
        if (mainMenu.classList.contains("active")) {

            menuToggle.innerHTML = "×";

            menuToggle.setAttribute(
                "aria-label",
                "Close Menu"
            );

        }

        // Menu Close
        else {

            menuToggle.innerHTML = "☰";

            menuToggle.setAttribute(
                "aria-label",
                "Open Menu"
            );
        }

    });


    // =================================================
    // CLOSE MENU AFTER CLICKING LINK
    // =================================================

    const menuLinks = mainMenu.querySelectorAll("a");

    menuLinks.forEach(function (link) {

        link.addEventListener("click", function () {

            mainMenu.classList.remove("active");

            menuToggle.innerHTML = "☰";

            menuToggle.setAttribute(
                "aria-label",
                "Open Menu"
            );

        });

    });


    // =================================================
    // CLOSE MENU WHEN CLICKING OUTSIDE
    // =================================================

    document.addEventListener("click", function (event) {

        if (
            !event.target.closest(".navbar") &&
            mainMenu.classList.contains("active")
        ) {

            mainMenu.classList.remove("active");

            menuToggle.innerHTML = "☰";

            menuToggle.setAttribute(
                "aria-label",
                "Open Menu"
            );
        }

    });

}



// Motivation Load
fetch("includes/moti.html")
    .then(response => {
        if (!response.ok) {
            throw new Error("moti File Not Found");
        }
        return response.text();
    })
    .then(html => {

        document.getElementById("moti").innerHTML = html;

        console.log(quotes);

        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");

        const todayDate = `${day}-${month}`;

        const todayQuote = quotes.find(q => q.date === todayDate);

        if (todayQuote) {
            document.getElementById("quote").textContent = todayQuote.quote;
            document.getElementById("author").textContent = todayQuote.author;
        } else {
            document.getElementById("quote").textContent = "Keep learning, keep growing.";
            document.getElementById("author").textContent = "Daily Motivation";
        }

    })
    .catch(error => console.error(error));

// Footer Load
// fetch("../includes/footer.html")
//     .then(response => response.text())
//     .then(data => {
//         document.getElementById("footer").innerHTML = data;
//     });

fetch("../includes/footer.html")
    .then(res => res.text())
    .then(data => {
        const footer = document.getElementById("footer");

        if (footer) {
            footer.innerHTML = data;
        }
    });

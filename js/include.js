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


// Motivation Load
fetch("./includes/moti.html")
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

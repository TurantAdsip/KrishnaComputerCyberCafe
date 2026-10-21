/* =========================================================
   KRISHNAPREP MOBILE / TABLET MENU
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const menuBtn = document.getElementById("kpMenuBtn");
    const mobileMenu = document.getElementById("kpMobileMenu");

    if (!menuBtn || !mobileMenu) {
        return;
    }


    menuBtn.addEventListener("click", function () {

        mobileMenu.classList.toggle("open");

        const icon = menuBtn.querySelector("i");

        if (mobileMenu.classList.contains("open")) {

            icon.classList.remove("fa-bars");
            icon.classList.add("fa-xmark");

        } else {

            icon.classList.remove("fa-xmark");
            icon.classList.add("fa-bars");

        }

    });


    /* Close menu after clicking a link */

    const menuLinks = mobileMenu.querySelectorAll("a");

    menuLinks.forEach(function (link) {

        link.addEventListener("click", function () {

            mobileMenu.classList.remove("open");

            const icon = menuBtn.querySelector("i");

            icon.classList.remove("fa-xmark");
            icon.classList.add("fa-bars");

        });

    });

});
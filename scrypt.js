const storageKeys = {
    user: "noire_user",
    reservations: "noire_reservations",
    session: "noire_session"
};

const defaultAvatar = "https://via.placeholder.com/180x180/1f1f1f/c9a44a?text=Noire";

function readJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
        return fallback;
    }
}

function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getUser() {
    return readJSON(storageKeys.user, null);
}

function setUser(user) {
    writeJSON(storageKeys.user, user);
}

function getSession() {
    return readJSON(storageKeys.session, { loggedIn: false });
}

function setSession(session) {
    writeJSON(storageKeys.session, session);
}

function isLoggedIn() {
    const session = getSession();
    const user = getUser();
    return Boolean(session.loggedIn && user && session.email === user.email);
}

function logout() {
    setSession({ loggedIn: false, email: null });
    syncUserChips();
    const page = document.body?.dataset?.page || "";
    if (page === "profile") {
        window.location.href = "login.html";
    }
}

function syncUserChips() {
    const logged = isLoggedIn();
    const user = getUser();
    const chips = document.querySelectorAll("[data-user-chip]");
    const guestOnly = document.querySelectorAll("[data-auth-guest]");
    const logoutButtons = document.querySelectorAll("[data-logout]");

    chips.forEach((chip) => {
        chip.hidden = !logged;
        if (!logged || !user) return;
        const nameEl = chip.querySelector("[data-user-chip-name]");
        const imgEl = chip.querySelector("[data-user-chip-img]");
        if (nameEl) nameEl.textContent = user.username || user.name || "მომხმარებელი";
        if (imgEl) imgEl.src = user.avatar || defaultAvatar;
    });

    guestOnly.forEach((el) => {
        el.hidden = logged;
    });

    logoutButtons.forEach((btn) => {
        btn.hidden = !logged;
    });
}

function setupHeaderAndNav() {
    const header = document.getElementById("header");
    const menuToggle = document.getElementById("menuToggle");
    const navMenu = document.getElementById("navMenu");
    const navOverlay = document.getElementById("navOverlay");
    const navLinks = document.querySelectorAll(".nav-link");

    if (!header || !menuToggle || !navMenu || !navOverlay) return;

    function openMenu(forceOpen) {
        const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !navMenu.classList.contains("open");
        navMenu.classList.toggle("open", shouldOpen);
        navOverlay.classList.toggle("show", shouldOpen);
        menuToggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
        document.body.classList.toggle("menu-open", shouldOpen && window.innerWidth <= 980);
    }

    menuToggle.addEventListener("click", () => openMenu());
    navOverlay.addEventListener("click", () => openMenu(false));

    navLinks.forEach((link) => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 980) openMenu(false);
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && navMenu.classList.contains("open")) {
            openMenu(false);
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 980) openMenu(false);
    });

    window.addEventListener("scroll", () => {
        header.classList.toggle("scrolled", window.scrollY > 18);
    });
}

function setupSmoothScroll() {
    const header = document.getElementById("header");
    const scrollButtons = document.querySelectorAll("[data-scroll]");

    scrollButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const targetId = button.getAttribute("data-scroll");
            const target = targetId ? document.querySelector(targetId) : null;
            if (!target || !header) return;
            const y = target.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 10;
            window.scrollTo({ top: y, behavior: "smooth" });
        });
    });

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", (event) => {
            const href = anchor.getAttribute("href");
            if (!href || href === "#") return;
            const target = document.querySelector(href);
            if (!target || !header) return;
            event.preventDefault();
            const y = target.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 10;
            window.scrollTo({ top: y, behavior: "smooth" });
        });
    });
}

function setupMenuFilter() {
    const menuTabs = document.querySelectorAll(".menu-tab");
    const menuCards = document.querySelectorAll(".menu-card");
    if (!menuTabs.length || !menuCards.length) return;

    menuTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            menuTabs.forEach((item) => item.classList.remove("active"));
            tab.classList.add("active");
            const selected = tab.dataset.category;

            menuCards.forEach((card) => {
                const visible = selected === "all" || card.dataset.category === selected;
                card.style.display = visible ? "block" : "none";
            });
        });
    });
}

function setupReservation() {
    const reservationForm = document.getElementById("reservationForm");
    const reservationItems = document.getElementById("reservationItems");
    const reservationStatus = document.getElementById("reservationStatus");
    const resDateInput = document.getElementById("resDate");

    if (resDateInput) {
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        resDateInput.min = today.toISOString().split("T")[0];
    }

    function renderReservations() {
        if (!reservationItems) return;
        const reservations = readJSON(storageKeys.reservations, []);
        reservationItems.innerHTML = "";

        if (!reservations.length) {
            const empty = document.createElement("li");
            empty.textContent = "ჯავშანი ჯერ არ გაქვს. დაამატე ფორმის დახმარებით.";
            reservationItems.appendChild(empty);
            return;
        }

        reservations.forEach((reservation) => {
            const item = document.createElement("li");
            item.innerHTML = `<strong>${reservation.name}</strong><br>${reservation.date} • ${reservation.time} • ${reservation.guests} სტუმარი<br>${reservation.notes || "დამატებითი შენიშვნა არ არის"}`;
            reservationItems.appendChild(item);
        });
    }

    if (reservationForm) {
        reservationForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const name = document.getElementById("resName")?.value.trim();
            const guests = document.getElementById("resGuests")?.value;
            const date = document.getElementById("resDate")?.value;
            const time = document.getElementById("resTime")?.value;
            const notes = document.getElementById("resNotes")?.value.trim();
            if (!name || !guests || !date || !time) return;

            const reservation = { name, guests, date, time, notes, id: Date.now() };
            const reservations = readJSON(storageKeys.reservations, []);
            reservations.unshift(reservation);
            writeJSON(storageKeys.reservations, reservations);
            if (reservationStatus) reservationStatus.textContent = "ჯავშანი დადასტურდა და შეინახა.";
            reservationForm.reset();
            renderReservations();
        });
    }

    renderReservations();
}

function setupBannerSlider() {
    const bannerTrack = document.getElementById("bannerTrack");
    const bannerDots = document.querySelectorAll(".banner-dot");
    if (!bannerTrack || !bannerDots.length) return;

    let currentSlide = 0;
    let slideTimer = null;
    let touchStartX = 0;
    let touchEndX = 0;

    function setSlide(index) {
        if (window.innerWidth > 980) {
            bannerTrack.style.transform = "";
            return;
        }
        const max = bannerDots.length;
        currentSlide = (index + max) % max;
        bannerTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
        bannerDots.forEach((dot, dotIndex) => {
            dot.classList.toggle("active", dotIndex === currentSlide);
        });
    }

    function startSlider() {
        if (slideTimer) clearInterval(slideTimer);
        if (window.innerWidth <= 980) {
            setSlide(currentSlide);
            slideTimer = setInterval(() => setSlide(currentSlide + 1), 4200);
        }
    }

    bannerDots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            setSlide(index);
            startSlider();
        });
    });

    bannerTrack.addEventListener("touchstart", (event) => {
        touchStartX = event.changedTouches[0].clientX;
    });
    bannerTrack.addEventListener("touchend", (event) => {
        touchEndX = event.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX;
        if (Math.abs(deltaX) < 40 || window.innerWidth > 980) return;
        if (deltaX < 0) setSlide(currentSlide + 1);
        if (deltaX > 0) setSlide(currentSlide - 1);
        startSlider();
    });

    window.addEventListener("resize", () => {
        setSlide(currentSlide);
        startSlider();
    });

    startSlider();
}

function setupReveal() {
    const revealItems = document.querySelectorAll(".reveal");
    if (!revealItems.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.14, rootMargin: "0px 0px -30px 0px" }
    );

    revealItems.forEach((item) => observer.observe(item));
}

function setupRegister() {
    const form = document.getElementById("registerForm");
    const status = document.getElementById("registerStatus");
    if (!form) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = document.getElementById("registerName")?.value.trim();
        const email = document.getElementById("registerEmail")?.value.trim().toLowerCase();
        const password = document.getElementById("registerPassword")?.value;
        const phone = document.getElementById("registerPhone")?.value.trim();

        if (!name || !email || !password || !phone) return;

        const user = {
            name,
            username: name,
            email,
            password,
            phone,
            avatar: getUser()?.avatar || defaultAvatar,
            createdAt: new Date().toISOString()
        };

        setUser(user);
        setSession({ loggedIn: true, email: user.email });
        if (status) status.textContent = "ანგარიში წარმატებით შეიქმნა.";
        syncUserChips();
        setTimeout(() => {
            window.location.href = "profile.html";
        }, 500);
    });
}

function setupLogin() {
    const form = document.getElementById("loginForm");
    const status = document.getElementById("loginStatus");
    if (!form) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const email = document.getElementById("loginEmail")?.value.trim().toLowerCase();
        const password = document.getElementById("loginPassword")?.value;
        const user = getUser();

        if (!user) {
            if (status) status.textContent = "ანგარიში ვერ მოიძებნა. გაიარე რეგისტრაცია.";
            return;
        }

        if (user.email !== email || user.password !== password) {
            if (status) status.textContent = "ელ-ფოსტა ან პაროლი არასწორია.";
            return;
        }

        setSession({ loggedIn: true, email: user.email });
        if (status) status.textContent = "შესვლა წარმატებულია.";
        syncUserChips();
        setTimeout(() => {
            window.location.href = "profile.html";
        }, 400);
    });
}

function setupProfile() {
    const profileContent = document.getElementById("profileContent");
    const profileLoginWarning = document.getElementById("profileLoginWarning");
    const profileForm = document.getElementById("profileForm");
    const profileImage = document.getElementById("profileImage");
    const profileStatus = document.getElementById("profileStatus");
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileAvatar = document.getElementById("profileAvatar");
    const profileUsername = document.getElementById("profileUsername");
    const profileFullName = document.getElementById("profileFullName");
    const profileEmailInput = document.getElementById("profileEmailInput");
    const profilePhone = document.getElementById("profilePhone");
    const profileDetailName = document.getElementById("profileDetailName");
    const profileDetailPhone = document.getElementById("profileDetailPhone");
    const profileDetailCreated = document.getElementById("profileDetailCreated");

    if (!profileContent || !profileLoginWarning) return;

    function renderProfile() {
        const logged = isLoggedIn();
        const user = getUser();

        profileContent.hidden = !logged;
        profileLoginWarning.hidden = logged;
        if (!logged || !user) return;

        if (profileName) profileName.textContent = user.username || user.name || "მომხმარებელი";
        if (profileEmail) profileEmail.textContent = user.email || "-";
        if (profileAvatar) profileAvatar.src = user.avatar || defaultAvatar;
        if (profileUsername) profileUsername.value = user.username || user.name || "";
        if (profileFullName) profileFullName.value = user.name || "";
        if (profileEmailInput) profileEmailInput.value = user.email || "";
        if (profilePhone) profilePhone.value = user.phone || "";
        if (profileDetailName) profileDetailName.textContent = user.name || "-";
        if (profileDetailPhone) profileDetailPhone.textContent = user.phone || "-";
        if (profileDetailCreated) {
            profileDetailCreated.textContent = user.createdAt ? new Date(user.createdAt).toLocaleDateString("ka-GE") : "-";
        }
    }

    if (profileForm) {
        profileForm.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!isLoggedIn()) {
                if (profileStatus) profileStatus.textContent = "ჯერ ავტორიზაციაა საჭირო.";
                return;
            }
            const user = getUser();
            if (!user) return;

            const nextUsername = profileUsername?.value.trim();
            const nextName = profileFullName?.value.trim();
            const nextEmail = profileEmailInput?.value.trim().toLowerCase();
            const nextPhone = profilePhone?.value.trim();

            if (nextUsername) user.username = nextUsername;
            if (nextName) user.name = nextName;
            if (nextEmail) user.email = nextEmail;
            if (nextPhone) user.phone = nextPhone;

            setUser(user);
            setSession({ loggedIn: true, email: user.email });
            if (profileStatus) profileStatus.textContent = "პროფილი წარმატებით განახლდა.";
            syncUserChips();
            renderProfile();
        });
    }

    if (profileImage) {
        profileImage.addEventListener("change", () => {
            const file = profileImage.files && profileImage.files[0];
            if (!file) return;
            if (!file.type.startsWith("image/")) {
                if (profileStatus) profileStatus.textContent = "გთხოვ, ატვირთე სწორი სურათის ფაილი.";
                return;
            }
            const user = getUser();
            if (!user || !isLoggedIn()) return;

            const reader = new FileReader();
            reader.onload = () => {
                user.avatar = String(reader.result);
                setUser(user);
                if (profileStatus) profileStatus.textContent = "პროფილის ფოტო განახლდა.";
                syncUserChips();
                renderProfile();
            };
            reader.readAsDataURL(file);
        });
    }

    renderProfile();
}

function bindLogoutButtons() {
    document.querySelectorAll("[data-logout]").forEach((btn) => {
        btn.addEventListener("click", logout);
    });
}

setupHeaderAndNav();
setupSmoothScroll();
setupMenuFilter();
setupReservation();
setupBannerSlider();
setupReveal();
setupRegister();
setupLogin();
setupProfile();
bindLogoutButtons();
syncUserChips();

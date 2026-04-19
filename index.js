const EMAILJS_PUBLIC_KEY = "5cLgxum2aHbzSMnoM";
const EMAILJS_SERVICE_ID = "service_3621938";
const EMAILJS_TEMPLATE_ID = "template_xrp44xb";
const CONTACT_EMAIL = "kobe.h.guo@gmail.com";
const scaleFactor = 1 / 20;
const EMAILJS_SDK_URL =
  "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";

let isModalOpen = false;
let contrastToggle = false;
let shapeElements = [];
let activePointerEvent = null;
let animationFrameId = null;
let emailJsLoader = null;

function getModalElements() {
  return {
    modal: document.getElementById("site-modal"),
    contactName: document.getElementById("contact-name"),
    contactForm: document.getElementById("contact__form"),
    contactStatus: document.getElementById("contact__status"),
    loadingOverlay: document.querySelector(".modal__overlay--loading"),
    successOverlay: document.querySelector(".modal__overlay--success"),
    themeToggle: document.getElementById("theme-toggle"),
  };
}

function shouldAnimateBackground() {
  return (
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function updateBackgroundShapes() {
  animationFrameId = null;

  if (
    !shouldAnimateBackground() ||
    !activePointerEvent ||
    !shapeElements.length
  ) {
    return;
  }

  const x = activePointerEvent.clientX * scaleFactor;
  const y = activePointerEvent.clientY * scaleFactor;

  for (let index = 0; index < shapeElements.length; index += 1) {
    const isOdd = index % 2 !== 0;
    const direction = isOdd ? -1 : 1;
    shapeElements[index].style.transform =
      `translate(${x * direction}px, ${y * direction}px) rotate(${x * direction * 10}deg)`;
  }
}

function moveBackground(event) {
  activePointerEvent = event;

  if (!shouldAnimateBackground()) {
    return;
  }

  if (animationFrameId !== null) {
    return;
  }

  animationFrameId = window.requestAnimationFrame(updateBackgroundShapes);
}

function resetBackgroundShapes() {
  activePointerEvent = null;

  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  for (const shape of shapeElements) {
    shape.style.transform = "";
  }
}

function applyThemeState(isDark) {
  const { themeToggle } = getModalElements();
  contrastToggle = isDark;
  document.body.classList.toggle("dark-theme", isDark);

  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode",
    );
  }

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute("content", isDark ? "#0b1220" : "#f6f1e8");
  }
}

function toggleContrast() {
  const nextTheme = !contrastToggle;
  applyThemeState(nextTheme);
  localStorage.setItem("theme", nextTheme ? "dark" : "light");
}

function scrollToTop(event) {
  if (event) {
    event.preventDefault();
  }

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "auto",
  });
}

function setContactStatus(message, isError = false) {
  const { contactStatus } = getModalElements();

  if (!contactStatus) {
    return;
  }

  contactStatus.textContent = message;
  contactStatus.classList.toggle("is-error", isError);
}

function clearContactFeedback() {
  const { loadingOverlay, successOverlay } = getModalElements();

  if (loadingOverlay) {
    loadingOverlay.classList.remove("modal__overlay--visible");
  }

  if (successOverlay) {
    successOverlay.classList.remove("modal__overlay--visible");
  }

  setContactStatus("");
}

function focusModalTarget(section) {
  const { modal, contactName } = getModalElements();

  if (!modal) {
    return;
  }

  window.requestAnimationFrame(() => {
    if (section === "contact" && contactName) {
      contactName.focus();
      return;
    }

    modal.focus();
  });
}

function closeModal() {
  const { modal } = getModalElements();

  isModalOpen = false;
  document.body.classList.remove("modal--open");

  if (modal) {
    modal.setAttribute("aria-hidden", "true");
  }

  clearContactFeedback();
}

function toggleModal(section) {
  const { modal } = getModalElements();

  if (!modal) {
    return;
  }

  if (isModalOpen && !section) {
    closeModal();
    return;
  }

  if (!isModalOpen) {
    isModalOpen = true;
    document.body.classList.add("modal--open");
    modal.setAttribute("aria-hidden", "false");
    clearContactFeedback();
  }

  if (section === "contact") {
    const loadSdk = () => {
      loadEmailJs().catch(() => {
        // The form can still fall back to mailto if the SDK fails to load.
      });
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(loadSdk, {
        timeout: 1500,
      });
    } else {
      window.setTimeout(loadSdk, 0);
    }
  }

  focusModalTarget(section);
}

function buildMailtoUrl(formData) {
  const name = formData.get("user_name") || "";
  const email = formData.get("user_email") || "";
  const message = formData.get("message") || "";
  const subject = `Portfolio inquiry from ${name || "a visitor"}`;
  const body = [`Name: ${name}`, `Email: ${email}`, "", message].join("\n");

  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function openMailtoFallback(formData) {
  window.location.href = buildMailtoUrl(formData);
}

function loadEmailJs() {
  if (window.emailjs && typeof window.emailjs.sendForm === "function") {
    return Promise.resolve(window.emailjs);
  }

  if (emailJsLoader) {
    return emailJsLoader;
  }

  emailJsLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = EMAILJS_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (!window.emailjs || typeof window.emailjs.init !== "function") {
        reject(new Error("EmailJS failed to initialize"));
        return;
      }

      window.emailjs.init({
        publicKey: EMAILJS_PUBLIC_KEY,
      });
      resolve(window.emailjs);
    };
    script.onerror = () => {
      reject(new Error("EmailJS failed to load"));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    emailJsLoader = null;
    throw error;
  });

  return emailJsLoader;
}

async function contact(event) {
  event.preventDefault();

  const { loadingOverlay, successOverlay } = getModalElements();
  const form = event.target;
  const submitButton = document.getElementById("contact__submit");
  const formData = new FormData(form);

  clearContactFeedback();

  if (loadingOverlay) {
    loadingOverlay.classList.add("modal__overlay--visible");
  }

  if (submitButton) {
    submitButton.disabled = true;
  }

  try {
    await loadEmailJs();

    await window.emailjs.sendForm(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      form,
    );

    if (loadingOverlay) {
      loadingOverlay.classList.remove("modal__overlay--visible");
    }

    if (successOverlay) {
      successOverlay.classList.add("modal__overlay--visible");
    }

    setContactStatus("Message sent successfully.");
    form.reset();
  } catch (error) {
    if (loadingOverlay) {
      loadingOverlay.classList.remove("modal__overlay--visible");
    }

    setContactStatus(
      `I could not send the form automatically. Your email app should open instead, or you can email me directly at ${CONTACT_EMAIL}.`,
      true,
    );
    openMailtoFallback(formData);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}

function initializePortfolio() {
  const { modal } = getModalElements();
  const landingPage = document.getElementById("landing-page");
  const currentYear = document.getElementById("current-year");
  const storedTheme = localStorage.getItem("theme");
  shapeElements = Array.from(document.querySelectorAll(".shape"));

  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }

  applyThemeState(storedTheme === "dark");

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  }

  if (landingPage) {
    landingPage.addEventListener("pointermove", moveBackground, {
      passive: true,
    });
    landingPage.addEventListener("pointerleave", resetBackgroundShapes);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isModalOpen) {
      closeModal();
    }
  });
}

initializePortfolio();

/*
 * Camera capability and privacy fallback.
 *
 * This file only requests a local camera preview. No image or video data is
 * uploaded anywhere. When a camera is unavailable or permission is denied,
 * the user receives a QR code for opening this same page on a phone.
 */

function showCameraWarning() {
  const warning = document.getElementById("camera-warning");
  const container = document.getElementById("camera-container");
  const qrTarget = document.getElementById("qrcode");

  if (container) {
    container.hidden = true;
  }
  if (!warning) {
    return;
  }

  warning.hidden = false;

  // Avoid creating duplicate QR markup if initialization is retried.
  if (qrTarget && !qrTarget.childElementCount && typeof QRCode !== "undefined") {
    new QRCode(qrTarget, {
      text: window.location.href,
      width: 152,
      height: 152,
      colorDark: "#182238",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  }
}

function openAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  modal.querySelector("input")?.focus();
}

function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function setAuthMode(mode) {
  const isSignup = mode === "signup";
  const title = document.getElementById("auth-title");
  const submit = document.getElementById("auth-submit");
  const loginTab = document.getElementById("login-tab");
  const signupTab = document.getElementById("signup-tab");

  title.textContent = isSignup ? "Create your space." : "Welcome back.";
  submit.innerHTML = `${isSignup ? "Create account" : "Continue"} <span aria-hidden="true">&#8594;</span>`;
  loginTab.classList.toggle("is-active", !isSignup);
  signupTab.classList.toggle("is-active", isSignup);
  loginTab.setAttribute("aria-selected", String(!isSignup));
  signupTab.setAttribute("aria-selected", String(isSignup));
}

const userProfile = {};

function initSurvey() {
  const form = document.getElementById("survey-form");
  if (!form) return;

  const steps = [...form.querySelectorAll(".survey-step")];
  const nextButton = document.getElementById("next-btn");
  const backButton = document.getElementById("prev-btn");
  const submitButton = document.getElementById("survey-submit");
  const error = document.getElementById("survey-error");
  const count = document.getElementById("question-count");
  const percent = document.getElementById("progress-percent");
  const progress = document.getElementById("progress-bar");
  let currentStep = 0;

  if (!steps.length || !nextButton || !backButton || !submitButton) return;

  const fieldForStep = (step) => steps[step]?.querySelector("input:checked");

  function showStep(index) {
    currentStep = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, stepIndex) => {
      step.hidden = stepIndex !== currentStep;
      step.classList.toggle("is-active", stepIndex === currentStep);
    });

    const questionNumber = currentStep + 1;
    const percentage = Math.round((questionNumber / steps.length) * 100);
    count.textContent = `Question ${questionNumber} of ${steps.length}`;
    percent.textContent = `${percentage}%`;
    progress.style.width = `${percentage}%`;
    backButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    submitButton.hidden = currentStep !== steps.length - 1;
    error.hidden = true;
  }

  // Delegation keeps navigation working even if the visible step is re-rendered.
  document.body.addEventListener("click", (event) => {
    const next = event.target.closest("#next-btn, .next-btn");
    const previous = event.target.closest("#prev-btn, .prev-btn");

    if (next) {
      console.log("Next clicked");
      if (!fieldForStep(currentStep)) {
        error.hidden = false;
        return;
      }
      showStep(currentStep + 1);
    }

    if (previous) {
      showStep(currentStep - 1);
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!fieldForStep(currentStep)) {
      error.hidden = false;
      return;
    }

    Object.keys(userProfile).forEach((key) => delete userProfile[key]);
    new FormData(form).forEach((value, key) => {
      userProfile[key] = value;
    });
    localStorage.setItem("userProfile", JSON.stringify(userProfile));
    window.location.href = "scan.html";
  });

  form.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      error.hidden = true;
      // Preserve the existing fast, polished progression after a selection.
      if (currentStep < steps.length - 1) {
        window.setTimeout(() => showStep(currentStep + 1), 180);
      }
    });
  });

  showStep(0);
}

const API_KEY = "PASTE_YOUR_GROQ_KEY_HERE";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function extractRoutinePayload(response) {
  const content = response?.choices?.[0]?.message?.content;
  if (!content) throw new Error("The AI returned an empty response.");

  // Models sometimes wrap valid JSON in a markdown code fence. Strip only the
  // fence, then parse the JSON; no executable content is evaluated.
  const cleaned = content.replace(/^```(?:json)?\\s*/i, "").replace(/\\s*```$/i, "").trim();
  const routine = JSON.parse(cleaned);
  if (!routine.summary || !Array.isArray(routine.phases)) {
    throw new Error("The AI response did not match the routine schema.");
  }
  return routine;
}

function renderRoutine(routine) {
  const summary = document.getElementById("routine-summary");
  const phases = document.getElementById("routine-phases");
  summary.textContent = routine.summary;
  phases.replaceChildren();

  routine.phases.slice(0, 3).forEach((phase, index) => {
    const card = document.createElement("article");
    card.className = "phase-card";

    const label = document.createElement("span");
    label.className = "phase-label";
    label.textContent = `Phase ${index + 1}`;

    const heading = document.createElement("h2");
    heading.textContent = phase.phaseName || "Practice";

    const duration = document.createElement("span");
    duration.className = "phase-duration";
    duration.textContent = phase.duration || "As comfortable";

    const list = document.createElement("ul");
    list.className = "exercise-list";
    (Array.isArray(phase.exercises) ? phase.exercises : []).forEach((exercise) => {
      const item = document.createElement("li");
      const name = document.createElement("strong");
      name.textContent = exercise.name || "Exercise";
      const instructions = document.createElement("p");
      instructions.textContent = exercise.instructions || "Follow a gentle, comfortable range of motion.";
      const reps = document.createElement("span");
      reps.className = "exercise-reps";
      reps.textContent = exercise.reps || "As comfortable";
      item.append(name, instructions, reps);
      list.append(item);
    });

    card.append(label, heading, duration, list);
    phases.append(card);
  });
}

async function generateRoutine() {
  const loading = document.getElementById("routine-loading");
  const content = document.getElementById("routine-content");
  const errorPanel = document.getElementById("routine-error");
  const errorMessage = document.getElementById("routine-error-message");
  if (!loading || !content || !errorPanel) return;

  loading.hidden = false;
  content.hidden = true;
  errorPanel.hidden = true;

  try {
    const rawProfile = localStorage.getItem("userProfile");
    const userProfile = rawProfile ? JSON.parse(rawProfile) : {};
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `You are an expert facial fitness coach. I will provide a user's survey answers. Generate a personalized 3-phase facial exercise routine (Warm-up, Main, Cool-down). You must respond ONLY in valid JSON matching this schema: { "summary": "...", "phases": [ { "phaseName": "...", "duration": "...", "exercises": [ { "name": "...", "instructions": "...", "reps": "..." } ] } ] }`
          },
          {
            role: "user",
            content: `Here is my data: ${JSON.stringify(userProfile)}. Please generate my routine.`
          }
        ]
      })
    });

    if (!response.ok) throw new Error(`OmniRoute request failed (${response.status}).`);
    renderRoutine(extractRoutinePayload(await response.json()));
    loading.hidden = true;
    content.hidden = false;
  } catch (error) {
    loading.hidden = true;
    errorPanel.hidden = false;
    errorMessage.textContent = error.message || "Please check your connection and try again.";
  }
}

function initResults() {
  if (!document.getElementById("routine-content")) return;
  document.getElementById("retry-routine")?.addEventListener("click", generateRoutine);
  generateRoutine();
}

function initScan() {
  const completeButton = document.getElementById("complete-scan");
  if (!completeButton) return;

  completeButton.addEventListener("click", () => {
    if (completeButton.disabled) return;
    const scanResults = {
      symmetry: "slight asymmetry on left jaw",
      puffiness: "moderate"
    };
    localStorage.setItem("scanResults", JSON.stringify(scanResults));
    window.location.href = "results.html";
  });
}

function initAuth() {
  document.getElementById("start-analysis")?.addEventListener("click", openAuthModal);
  document.querySelectorAll("[data-auth-close]").forEach((element) => {
    element.addEventListener("click", closeAuthModal);
  });

  document.querySelectorAll("[data-auth-mode]").forEach((tab) => {
    tab.addEventListener("click", () => setAuthMode(tab.dataset.authMode));
  });

  document.getElementById("google-signin")?.addEventListener("click", () => {
    console.log("Google sign-in selected; simulating successful login.");
    window.location.href = "survey.html";
  });

  document.getElementById("magic-link")?.addEventListener("click", () => {
    const email = document.getElementById("magic-email")?.value.trim();
    console.log("Magic login link requested for:", email || "no email entered");
  });

  document.getElementById("auth-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    console.log("Authentication form submitted; simulating successful login.");
    window.location.href = "survey.html";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAuthModal();
  });
}

async function initCamera() {
  const warning = document.getElementById("camera-warning");
  const container = document.getElementById("camera-container");
  const video = document.getElementById("camera-video");
  const completeButton = document.getElementById("complete-scan");

  if (!warning || !container || !video) {
    return;
  }

  if (completeButton) {
    completeButton.disabled = true;
  }

  // Some browsers expose mediaDevices only in secure contexts (HTTPS or
  // localhost). Treat every unsupported case as a normal fallback.
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
    showCameraWarning();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    video.srcObject = stream;
    warning.hidden = true;
    container.hidden = false;
    if (completeButton) {
      completeButton.disabled = false;
    }
  } catch (error) {
    // NotAllowedError, NotFoundError, and insecure-context failures all use
    // the same privacy-friendly phone continuation path.
    console.info("Camera unavailable; showing phone fallback.", error.name || error);
    showCameraWarning();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initSurvey();
  initResults();
  initScan();

  // Camera access is requested only on scan.html, never on the landing page.
  if (document.getElementById("camera-video")) {
    initCamera();
  }
});

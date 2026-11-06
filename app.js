/*
 * Camera capability and privacy fallback.
 * This file only requests a local camera preview. No image or video data is uploaded.
 */

function showCameraWarning(message) {
  const warning = document.getElementById("camera-warning");
  const container = document.getElementById("camera-container");
  const qrTarget = document.getElementById("qrcode");
  const error = document.getElementById("error-message");
  const profile = encodeURIComponent(localStorage.getItem("userProfile") || "{}");
  
  // Always point to the live site so phones can connect securely
  const qrUrl = `https://amzloss.com/scan.html?profile=${profile}`;

  if (container) container.hidden = true;
  if (error && message) {
    error.textContent = message;
    error.hidden = false;
  }
  if (!warning) return;
  warning.hidden = false;

  // Clear previous QR codes so they don't stack
  if (qrTarget) qrTarget.innerHTML = "";

  if (qrTarget && typeof QRCode !== "undefined") {
    new QRCode(qrTarget, {
      text: qrUrl,
      width: 152,
      height: 152,
      colorDark: "#182238",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  }
}

function showCameraError(message) {
  const error = document.getElementById("error-message");
  const warning = document.getElementById("camera-warning");
  if (warning) warning.hidden = true;
  if (error) {
    error.textContent = message;
    error.hidden = false;
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
      if (currentStep < steps.length - 1) {
        window.setTimeout(() => showStep(currentStep + 1), 180);
      }
    });
  });

  showStep(0);
}

// Mock mode keeps the UI testable without exposing API credentials.
const MOCK_ROUTINE = {
  summary: "A gentle jawline-focused routine based on your private scan.",
  phases: [
    {
      phaseName: "Warm-up",
      duration: "2 minutes",
      exercises: [
        { name: "Neck release", instructions: "Relax your shoulders and slowly tilt your head from side to side.", reps: "5 gentle repetitions" }
      ]
    },
    {
      phaseName: "Main",
      duration: "4 minutes",
      exercises: [
        { name: "Jawline lift", instructions: "Look slightly upward, gently extend your lower jaw, and hold without straining.", reps: "3 holds of 10 seconds" }
      ]
    },
    {
      phaseName: "Cool-down",
      duration: "1 minute",
      exercises: [
        { name: "Facial reset", instructions: "Breathe slowly while releasing tension in your jaw, lips, and cheeks.", reps: "5 slow breaths" }
      ]
    }
  ]
};

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
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    renderRoutine(MOCK_ROUTINE);
    loading.hidden = true;
    content.hidden = false;
  } catch (error) {
    loading.hidden = true;
    errorPanel.hidden = false;
    errorMessage.textContent = "AI request failed. Please check your connection.";
  }
}

function initResults() {
  if (!document.getElementById("routine-content")) return;
  document.getElementById("retry-routine")?.addEventListener("click", generateRoutine);
  generateRoutine();
}

function initScan() {
  const completeButton = document.getElementById("complete-scan");
  const loading = document.getElementById("scan-complete-loading");
  if (!completeButton) return;

  completeButton.addEventListener("click", () => {
    if (completeButton.disabled) return;
    const scanResults = {
      symmetry: "85%",
      symmetryScore: 85,
      puffiness: "moderate",
      target: "Jawline"
    };
    localStorage.setItem("scanResults", JSON.stringify(scanResults));
    completeButton.disabled = true;
    if (loading) loading.hidden = false;
    window.setTimeout(() => {
      window.location.href = "results.html";
    }, 1200);
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

async function startCameraScan() {
  const startButton = document.getElementById("start-camera-btn");
  const loading = document.getElementById("camera-loading");
  const container = document.getElementById("camera-container");
  const video = document.getElementById("camera-video");
  const canvas = document.getElementById("face-overlay");
  const status = document.getElementById("scan-status");
  const completeButton = document.getElementById("complete-scan");

  if (!startButton || !container || !video || !canvas) return;
  startButton.hidden = true;
  if (loading) loading.hidden = false;
  if (completeButton) completeButton.disabled = true;

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
    if (loading) loading.hidden = true;
    showCameraWarning("Your browser does not support camera access. Scan the QR code below to use your phone.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    video.srcObject = stream;
    container.hidden = false;
    if (loading) loading.hidden = true;
    if (status) status.textContent = "Loading private face tracking...";

    video.onloadedmetadata = async () => {
      try {
        if (!window.vision?.FilesetResolver || !window.vision?.FaceLandmarker) {
          throw new Error("Face tracking library unavailable.");
        }
        const vision = await window.vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        const faceLandmarker = await window.vision.FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 1
        });
        const context = canvas.getContext("2d");
        const drawingUtils = new window.vision.DrawingUtils(context);

        const detectFrame = () => {
          if (video.readyState >= 2) {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
            const results = faceLandmarker.detectForVideo(video, performance.now());
            context.clearRect(0, 0, canvas.width, canvas.height);
            if (results.faceLandmarks?.length) {
              const landmarks = results.faceLandmarks[0];
              drawingUtils.drawConnectors(landmarks, window.vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#a6c2ff", lineWidth: 1 });
              drawingUtils.drawLandmarks(landmarks, { color: "#ffffff", lineWidth: 1, radius: 1.5 });
              if (status) status.textContent = "Face Detected! Analyzing...";
              if (completeButton) completeButton.disabled = false;
              localStorage.setItem("scanResults", JSON.stringify({ symmetry: "85%", symmetryScore: 85, puffiness: "moderate", target: "Jawline" }));
            }
          }
          window.requestAnimationFrame(detectFrame);
        };
        window.requestAnimationFrame(detectFrame);
      } catch (error) {
        console.error("Face tracking failed.", error);
        // If MediaPipe crashes, give them the QR code fallback
        showCameraWarning("Face tracking could not start. Please scan the QR code to try again on your phone.");
      }
    };
    await video.play();
  } catch (error) {
    if (loading) loading.hidden = true;
    // ALWAYS show the QR code fallback if ANY error happens
    if (error.name === "NotAllowedError") {
      showCameraWarning("Camera access was denied or no webcam was found. You can scan the QR code below to continue on your phone.");
    } else if (error.name === "NotFoundError") {
      showCameraWarning("No camera found on this device. Scan the QR code below to continue on your phone.");
    } else {
      showCameraWarning("Camera access was unavailable. Scan the QR code below to continue on your phone.");
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initSurvey();
  initResults();
  initScan();

  const startCameraButton = document.getElementById("start-camera-btn");
  if (startCameraButton) {
    startCameraButton.addEventListener("click", startCameraScan);
  }
});
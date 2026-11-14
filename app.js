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
  const qrUrl = `https://amzloss.com/scan.html?profile=${profile}`;

  if (container) container.hidden = true;
  if (error && message) {
    error.textContent = message;
    error.hidden = false;
  }
  if (!warning) return;
  warning.hidden = false;

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

  if (title) title.textContent = isSignup ? "Create your space." : "Welcome back.";
  if (submit) submit.innerHTML = `${isSignup ? "Create account" : "Continue"} <span aria-hidden="true">&#8594;</span>`;
  if (loginTab) {
    loginTab.classList.toggle("is-active", !isSignup);
    loginTab.setAttribute("aria-selected", String(!isSignup));
  }
  if (signupTab) {
    signupTab.classList.toggle("is-active", isSignup);
    signupTab.setAttribute("aria-selected", String(isSignup));
  }
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
    if (count) count.textContent = `Question ${questionNumber} of ${steps.length}`;
    if (percent) percent.textContent = `${percentage}%`;
    if (progress) progress.style.width = `${percentage}%`;
    
    backButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    submitButton.hidden = currentStep !== steps.length - 1;
    if (error) error.hidden = true;
  }

  document.body.addEventListener("click", (event) => {
    const next = event.target.closest("#next-btn, .next-btn");
    const previous = event.target.closest("#prev-btn, .prev-btn");

    if (next) {
      if (!fieldForStep(currentStep)) {
        if (error) error.hidden = false;
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
      if (error) error.hidden = false;
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
      if (error) error.hidden = true;
      if (currentStep < steps.length - 1) {
        window.setTimeout(() => showStep(currentStep + 1), 180);
      }
    });
  });

  showStep(0);
}

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
  if (summary) summary.textContent = routine.summary;
  if (phases) phases.replaceChildren();

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
    if (phases) phases.append(card);
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
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    renderRoutine(MOCK_ROUTINE);
    loading.hidden = true;
    content.hidden = false;
  } catch (error) {
    loading.hidden = true;
    errorPanel.hidden = false;
    if (errorMessage) errorMessage.textContent = "AI request failed. Please check your connection.";
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
    window.location.href = "survey.html";
  });

  document.getElementById("auth-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
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

  if (!startButton || !container || !video || !canvas) {
    alert("Error: Missing HTML elements.");
    return;
  }

  let frameCount = 0;
  console.log("[FaceScan] Start button clicked.");
  startButton.hidden = true;
  if (loading) loading.hidden = false;
  if (status) status.textContent = "Requesting camera access...";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    console.log("[FaceScan] Camera permission granted.");
    if (status) status.textContent = "Camera ON";
    video.srcObject = stream;
    
    // Force the video container to show before anything else
    container.hidden = false;
    container.style.display = "block"; 
    
    await video.play();
    console.log("[FaceScan] video.play() succeeded.");

    if (loading) loading.hidden = true;
    if (status) status.textContent = "Camera ON. Downloading AI model...";
    let vision;
    try {
      // Dynamically load the MediaPipe module.
      vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm");
    } catch (err) {
      throw new Error("Failed to download MediaPipe: " + err.message);
    }
    if (status) status.textContent = "AI Model downloaded. Initializing...";

    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
    );

    // THE CRITICAL FIX: Using "CPU" instead of "GPU" so it doesn't crash Android
    const faceLandmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "CPU" 
      },
      runningMode: "VIDEO",
      numFaces: 1
    });
    console.log("[FaceScan] MediaPipe initialized successfully.");
    if (status) status.textContent = "AI Ready. Look at the camera";

    const context = canvas.getContext("2d");
    const drawingUtils = new vision.DrawingUtils(context);

    const detectFrame = () => {
      frameCount += 1;
      if (frameCount % 60 === 0) {
        console.log("[FaceScan] detectFrame running", { frameCount, readyState: video.readyState, width: video.videoWidth, height: video.videoHeight });
      }
      if (video.readyState >= 2) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        const results = faceLandmarker.detectForVideo(video, performance.now());
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        if (results.faceLandmarks?.length) {
          const landmarks = results.faceLandmarks[0];
          console.log("FACE DETECTED! Drawing mesh.");
          drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#00FF00", lineWidth: 2 });
          drawingUtils.drawLandmarks(landmarks, { color: "#FFFFFF", lineWidth: 2, radius: 2 });
          
          if (status) status.textContent = "Face Detected! Analyzing...";
          if (completeButton) completeButton.disabled = false;
          
          localStorage.setItem("scanResults", JSON.stringify({ symmetry: "85%", symmetryScore: 85, puffiness: "moderate", target: "Jawline" }));
        }
      }
      window.requestAnimationFrame(detectFrame);
    };
    window.requestAnimationFrame(detectFrame);
    
  } catch (err) {
    console.error("[FaceScan] Camera or MediaPipe error:", err);
    if (loading) loading.hidden = true;
    if (status) {
      status.textContent = "AI Error: " + (err.message || "Unable to initialize face tracking.");
    }
    showCameraWarning("Camera failed to start. " + (err.message || "Please try again."));
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
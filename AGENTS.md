# Project: Facial Debloat Analysis Website

## Tech Stack
- Frontend: Vanilla HTML, CSS, and JavaScript.
- Vision AI: MediaPipe Face Landmarker (runs entirely in the browser via CDN).
- AI Backend: OmniRoute API (OpenAI-compatible) for generating exercise plans.
- Hosting: GitHub Pages with a custom domain (CNAME: amzloss.com).

## Architecture Rules (CRITICAL)
1. **Privacy First:** Face images must NEVER be uploaded to a server. All facial tracking is done locally in the browser using MediaPipe.
2. **Data Flow:** 
   - Browser extracts numerical data (symmetry scores, blendshape coefficients).
   - Browser sends ONLY these numerical values to the LLM.
   - LLM returns a JSON array of recommended facial exercises based on the numbers.
3. **No Backend Required:** The entire app is static. Do not write Node.js, Python, or PHP backend logic unless absolutely necessary.

## Code Standards
- Use ES6+ JavaScript.
- Keep CSS in a separate `style.css` file. Use CSS Variables for colors.
- Write clean, heavily commented code explaining complex math or MediaPipe logic.

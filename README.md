# StudyFlow — AI Study Assistant

A React application that turns notes or a topic into interactive flashcards and a multiple-choice quiz.

## Requirements

- Node.js 18 or newer
- Visual Studio Code (recommended editor)
- A Groq API key: https://console.groq.com/keys

## Run locally

1. Download and extract this project.
2. Open the extracted `study-assistant` folder in VS Code.
3. Open the VS Code terminal: **Terminal → New Terminal**.
4. Install dependencies:

   ```bash
   npm install
   ```

5. Create a file named `.env` in the project root (the same folder as `package.json`).
6. Copy the following into `.env` and replace the placeholder with your own key:

   ```env
   GROQ_API_KEY=your_actual_groq_api_key
   PORT=3001
   ```

7. Start the frontend and backend:

   ```bash
   npm run dev
   ```

8. Open the local address printed by Vite, normally http://localhost:5173.

Do not put your API key in React code. Do not upload `.env` to GitHub.

## Features

- Free-form notes/topic input
- AI-generated flashcards and multiple-choice quiz
- Click-to-flip flashcards and mastered-card tracking
- Quiz scoring, explanations, and retesting incorrect answers
- Loading, empty, and error states with retry
- Backend validation of AI JSON and expected data shape
- Request cancellation and request IDs to prevent stale responses
- Responsive layout for mobile screens

## AI usage note

An AI assistant was used to help scaffold and explain parts of the application. The developer should review, test, and understand the code before submission and disclose any additional AI assistance honestly.

## Known limitations

- Requires an internet connection and a valid Groq API key.
- Model output can still contain factual errors; users should verify important information against their course material.
- Study sessions are not saved after the page is refreshed.
- The app currently generates flashcards and multiple-choice questions only.

## Time spent

Record your actual time spent here before submitting. The assignment suggests an approximately 8-hour limit; do not claim time you did not spend.

## Production note

For a deployed version, host the React frontend and backend in an environment that supports server-side environment variables. Configure the frontend's API proxy or production API URL appropriately, and add rate limiting before making the endpoint public.

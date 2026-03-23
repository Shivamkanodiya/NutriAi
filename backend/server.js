/**
 * server.js
 * =========
 * Express.js Backend API Server — Render Deployment
 * AI-Based Nutrition Recommendation and Progress Tracking System
 *
 * API Routes:
 * POST /api/calculate          — Calorie & macro calculation
 * POST /api/recommend          — Food recommendations
 * POST /api/progress           — Log daily progress
 * GET  /api/progress/:id       — Get user progress
 * GET  /api/weekly-summary/:id — Weekly summary
 *
 * DISCLAIMER: This is an educational mini-project.
 * Not intended for real medical use.
 */

const express = require('express');
const cors = require('cors');

const { calculateAll } = require('./calorieLogic');
const { getRecommendations, getMealPlan } = require('./recommendLogic');
const { addEntry, getProgress, getWeeklySummary } = require('./progressLogic');

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────

// CORS: allow Vercel frontend and local development
const allowedOrigins = [
  /^https:\/\/.*\.vercel\.app$/,      // Any Vercel deployment
  'http://localhost:5500',            // VS Code Live Server
  'http://127.0.0.1:5500',           // VS Code Live Server alt
  'http://localhost:3000',           // Local dev
  'http://127.0.0.1:3000',          // Local dev alt
  'null',                            // file:// protocol (local file open)
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(o => {
      if (o instanceof RegExp) return o.test(origin);
      return o === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      // In production we still allow — this is a mini-project open to all
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    name: 'NutriAI Backend API',
    version: '1.0.0',
    disclaimer: 'Educational tool only. Not for medical use.'
  });
});

// ─────────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────────

/**
 * POST /api/calculate
 * Calculates daily calories and macros using rule-based AI.
 *
 * Body: { age, gender, height, weight, activity, goal, condition }
 * Response: { bmr, tdee, dailyCalories, macros, explanations, ... }
 */
app.post('/api/calculate', (req, res) => {
  try {
    const { age, gender, height, weight, activity, goal, condition } = req.body;

    if (!age || !gender || !height || !weight || !activity || !goal || !condition) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['age', 'gender', 'height', 'weight', 'activity', 'goal', 'condition']
      });
    }

    const result = calculateAll({
      age: Number(age),
      gender,
      height: Number(height),
      weight: Number(weight),
      activity,
      goal,
      condition
    });

    res.json({
      success: true,
      data: result,
      disclaimer: 'This is an educational tool. Consult a healthcare professional for medical advice.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Calculation error', details: error.message });
  }
});

/**
 * POST /api/recommend
 * Returns food recommendations using rule-based filtering.
 *
 * Body: { condition, goal }
 * Response: { recommendations, filterExplanation, mealPlan, ... }
 */
app.post('/api/recommend', (req, res) => {
  try {
    const { condition, goal } = req.body;

    if (!condition) {
      return res.status(400).json({ error: 'Missing condition field' });
    }

    const result = getRecommendations(condition || 'normal', goal || 'maintenance');
    const mealPlan = getMealPlan(result.recommendations);

    res.json({
      success: true,
      data: { ...result, mealPlan }
    });
  } catch (error) {
    res.status(500).json({ error: 'Recommendation error', details: error.message });
  }
});

/**
 * POST /api/progress
 * Logs a daily progress entry and checks feedback adjustment rules.
 *
 * Body: { userId, date, caloriesConsumed, weight, workoutDone, calorieTarget }
 * Response: { entry, feedback, ... }
 */
app.post('/api/progress', (req, res) => {
  try {
    const { userId, date, caloriesConsumed, weight, workoutDone, calorieTarget } = req.body;

    if (!userId || !caloriesConsumed || !weight) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'caloriesConsumed', 'weight']
      });
    }

    const result = addEntry(userId, {
      date,
      caloriesConsumed,
      weight,
      workoutDone,
      calorieTarget: calorieTarget || 2000
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Progress logging error', details: error.message });
  }
});

/**
 * GET /api/progress/:userId
 * Retrieves all progress entries for a user.
 */
app.get('/api/progress/:userId', (req, res) => {
  try {
    const result = getProgress(req.params.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving progress', details: error.message });
  }
});

/**
 * GET /api/weekly-summary/:userId
 * Generates and returns a weekly summary for the user.
 */
app.get('/api/weekly-summary/:userId', (req, res) => {
  try {
    const result = getWeeklySummary(req.params.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Weekly summary error', details: error.message });
  }
});

// ─────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🥗 NutriAI Backend API running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/`);
  console.log(`\n⚠️  Disclaimer: Educational tool only. Not for medical use.\n`);
});

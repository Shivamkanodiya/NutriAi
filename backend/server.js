/**
 * server.js
 * =========
 * Express.js Backend API — MongoDB + JWT Auth Version
 * Render Deployment
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const { calculateAll } = require('./calorieLogic');
const { getRecommendations, getMealPlan } = require('./recommendLogic');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const Progress = require('./models/Progress');

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────
// MONGODB CONNECTION
// ─────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// ─────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────
const allowedOrigins = [
  /^https:\/\/.*\.vercel\.app$/,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'null',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(o =>
      o instanceof RegExp ? o.test(origin) : o === origin
    );
    callback(null, true); // Open for mini-project
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    name: 'NutriAI Backend API',
    version: '2.0.0',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    disclaimer: 'Educational tool only. Not for medical use.'
  });
});

// ─────────────────────────────────────────────────
// AUTH ROUTES (public)
// ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─────────────────────────────────────────────────
// NUTRITION ROUTES (public — no auth needed)
// ─────────────────────────────────────────────────
app.post('/api/calculate', (req, res) => {
  try {
    const { age, gender, height, weight, activity, goal, condition } = req.body;
    if (!age || !gender || !height || !weight || !activity || !goal || !condition) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = calculateAll({
      age: Number(age), gender,
      height: Number(height), weight: Number(weight),
      activity, goal, condition
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Calculation error', details: error.message });
  }
});

app.post('/api/recommend', (req, res) => {
  try {
    const { condition, goal } = req.body;
    if (!condition) return res.status(400).json({ error: 'Missing condition field' });
    const result = getRecommendations(condition || 'normal', goal || 'maintenance');
    const mealPlan = getMealPlan(result.recommendations);
    res.json({ success: true, data: { ...result, mealPlan } });
  } catch (error) {
    res.status(500).json({ error: 'Recommendation error', details: error.message });
  }
});

// ─────────────────────────────────────────────────
// PROGRESS ROUTES (protected — requires JWT)
// ─────────────────────────────────────────────────

/**
 * POST /api/progress — log a daily entry
 */
app.post('/api/progress', authMiddleware, async (req, res) => {
  try {
    const { date, caloriesConsumed, weight, workoutDone, calorieTarget } = req.body;
    const userId = req.user._id;

    if (!caloriesConsumed || !weight) {
      return res.status(400).json({ error: 'caloriesConsumed and weight are required.' });
    }

    let progressDoc = await Progress.findOne({ user: userId });
    if (!progressDoc) {
      progressDoc = new Progress({ user: userId, entries: [] });
    }

    const newEntry = {
      date: date || new Date().toISOString().split('T')[0],
      caloriesConsumed: Number(caloriesConsumed),
      calorieTarget: calorieTarget || 2000,
      weight: Number(weight),
      workoutDone: workoutDone === true || workoutDone === 'yes'
    };

    progressDoc.entries.push(newEntry);
    await progressDoc.save();

    // Feedback rule: missed target 3+ consecutive days → adjust
    const entries = progressDoc.entries;
    const last3 = entries.slice(-3);
    const allMissed = last3.length === 3 && last3.every(
      e => e.caloriesConsumed < e.calorieTarget * 0.9
    );

    const feedback = allMissed
      ? {
          shouldAdjust: true,
          adjustedTarget: Math.round(newEntry.calorieTarget * 0.9),
          explanation: `You missed your calorie target for 3 days in a row. AI feedback: reducing target to ${Math.round(newEntry.calorieTarget * 0.9)} kcal.`
        }
      : {
          shouldAdjust: false,
          explanation: 'Keep it up!'
        };

    res.json({ success: true, data: { entry: newEntry, feedback } });
  } catch (error) {
    res.status(500).json({ error: 'Progress logging error', details: error.message });
  }
});

/**
 * GET /api/progress — get current user's progress
 */
app.get('/api/progress', authMiddleware, async (req, res) => {
  try {
    const progressDoc = await Progress.findOne({ user: req.user._id });
    res.json({
      success: true,
      data: { entries: progressDoc ? progressDoc.entries : [] }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving progress', details: error.message });
  }
});

/**
 * GET /api/weekly-summary — weekly summary for current user
 */
app.get('/api/weekly-summary', authMiddleware, async (req, res) => {
  try {
    const progressDoc = await Progress.findOne({ user: req.user._id });
    const entries = progressDoc ? progressDoc.entries : [];

    if (entries.length === 0) {
      return res.json({ success: true, data: { hasData: false } });
    }

    const last7 = entries.slice(-7);
    const avgCalories = Math.round(last7.reduce((s, e) => s + e.caloriesConsumed, 0) / last7.length);
    const workoutDays = last7.filter(e => e.workoutDone).length;
    const adherenceRate = Math.round(
      (last7.filter(e => e.caloriesConsumed >= e.calorieTarget * 0.9).length / last7.length) * 100
    );
    const weightChange = last7.length >= 2
      ? Math.round((last7[last7.length - 1].weight - last7[0].weight) * 10) / 10
      : 0;

    res.json({
      success: true,
      data: {
        hasData: true,
        avgCalories,
        workoutDays,
        daysTracked: last7.length,
        adherenceRate,
        weightChange,
        period: `${last7[0].date} to ${last7[last7.length - 1].date}`,
        insight: adherenceRate >= 80
          ? 'Great consistency! Keep maintaining your nutrition targets.'
          : 'Try to hit your calorie target more consistently this week.'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Weekly summary error', details: error.message });
  }
});

// ─────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🥗 NutriAI Backend API v2 running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/`);
  console.log(`\n⚠️  Disclaimer: Educational tool only. Not for medical use.\n`);
});

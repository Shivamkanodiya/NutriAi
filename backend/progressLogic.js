/**
 * progressLogic.js
 * ================
 * Progress Tracking & Feedback Adjustment Module
 *
 * This module handles:
 * 1. Storing daily progress entries (calories, weight, workout)
 * 2. Feedback-based calorie adjustment (rule-based AI)
 * 3. Weekly summary generation
 *
 * RULE-BASED AI LOGIC:
 * IF user fails to meet calorie target for 3 consecutive days
 * THEN reduce daily calorie target by 5%
 *
 * NO machine learning is used.
 */

const fs = require('fs');
const path = require('path');

const PROGRESS_PATH = path.join(__dirname, 'data', 'progress.json');

/**
 * loadProgress
 * Reads the progress data from the JSON file.
 * @returns {Object} Progress data keyed by userId
 */
function loadProgress() {
  try {
    const data = fs.readFileSync(PROGRESS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

/**
 * saveProgress
 * Writes progress data back to the JSON file.
 * @param {Object} data - Full progress data object
 */
function saveProgress(data) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * addEntry
 * Adds a daily progress entry for a user.
 *
 * @param {string} userId - Unique user identifier
 * @param {Object} entry - { date, caloriesConsumed, weight, workoutDone, calorieTarget }
 * @returns {Object} Updated user progress with feedback
 */
function addEntry(userId, entry) {
  const progress = loadProgress();

  // Initialize user's entry array if not exists
  if (!progress[userId]) {
    progress[userId] = {
      entries: [],
      adjustedCalorieTarget: null
    };
  }

  // Add the new entry with timestamp
  const newEntry = {
    date: entry.date || new Date().toISOString().split('T')[0],
    caloriesConsumed: Number(entry.caloriesConsumed),
    weight: Number(entry.weight),
    workoutDone: entry.workoutDone === true || entry.workoutDone === 'yes',
    calorieTarget: Number(entry.calorieTarget),
    timestamp: new Date().toISOString()
  };

  progress[userId].entries.push(newEntry);

  // Apply feedback-based adjustment rule
  const feedback = applyFeedbackRule(progress[userId]);
  progress[userId].adjustedCalorieTarget = feedback.adjustedTarget;

  saveProgress(progress);

  return {
    entry: newEntry,
    totalEntries: progress[userId].entries.length,
    feedback
  };
}

/**
 * applyFeedbackRule
 * RULE-BASED AI: Feedback adjustment logic.
 *
 * RULE:
 * IF user fails to meet calorie target for 3 CONSECUTIVE days
 * THEN reduce daily calorie target by 5%
 *
 * "Fails to meet" = caloriesConsumed < calorieTarget (under-eating)
 *
 * This is a supportive adjustment to help users who consistently
 * struggle to reach their target — NOT a punishment.
 *
 * @param {Object} userData - User's progress data
 * @returns {Object} { shouldAdjust, adjustedTarget, explanation }
 */
function applyFeedbackRule(userData) {
  const entries = userData.entries;

  if (entries.length < 3) {
    return {
      shouldAdjust: false,
      adjustedTarget: null,
      consecutiveMisses: 0,
      explanation: 'Not enough data yet (need at least 3 days of tracking)'
    };
  }

  // Check the last 3 entries
  const lastThree = entries.slice(-3);
  const consecutiveMisses = lastThree.every(
    e => e.caloriesConsumed < e.calorieTarget
  );

  if (consecutiveMisses) {
    // RULE: Reduce target by 5%
    const currentTarget = lastThree[lastThree.length - 1].calorieTarget;
    const adjustedTarget = Math.round(currentTarget * 0.95);

    return {
      shouldAdjust: true,
      adjustedTarget,
      consecutiveMisses: 3,
      explanation: `AI Rule triggered: You missed your calorie target for 3 consecutive days. ` +
        `Your target has been adjusted from ${currentTarget} kcal to ${adjustedTarget} kcal (−5%) ` +
        `to make it more achievable. This is a supportive adjustment.`
    };
  }

  return {
    shouldAdjust: false,
    adjustedTarget: null,
    consecutiveMisses: 0,
    explanation: 'You are on track! No adjustment needed.'
  };
}

/**
 * getProgress
 * Retrieves all progress entries for a user.
 *
 * @param {string} userId - Unique user identifier
 * @returns {Object} User progress data or empty
 */
function getProgress(userId) {
  const progress = loadProgress();
  return progress[userId] || { entries: [], adjustedCalorieTarget: null };
}

/**
 * getWeeklySummary
 * Generates a weekly summary of the user's progress.
 *
 * Calculates:
 * - Average calories consumed over the last 7 entries
 * - Weight change (first entry vs last entry in the week)
 * - Number of workout days
 * - Adherence rate (days meeting target / total days)
 *
 * @param {string} userId - Unique user identifier
 * @returns {Object} Weekly summary statistics
 */
function getWeeklySummary(userId) {
  const progress = loadProgress();
  const userData = progress[userId];

  if (!userData || !userData.entries || userData.entries.length === 0) {
    return {
      hasData: false,
      message: 'No progress data found. Start tracking to see your weekly summary!'
    };
  }

  // Take up to the last 7 entries
  const entries = userData.entries;
  const weekEntries = entries.slice(-7);

  // Calculate average calories
  const totalCalories = weekEntries.reduce((sum, e) => sum + e.caloriesConsumed, 0);
  const avgCalories = Math.round(totalCalories / weekEntries.length);

  // Calculate weight change
  const firstWeight = weekEntries[0].weight;
  const lastWeight = weekEntries[weekEntries.length - 1].weight;
  const weightChange = Math.round((lastWeight - firstWeight) * 10) / 10;

  // Count workout days
  const workoutDays = weekEntries.filter(e => e.workoutDone).length;

  // Calculate adherence rate
  const daysOnTarget = weekEntries.filter(
    e => e.caloriesConsumed >= e.calorieTarget * 0.9 && e.caloriesConsumed <= e.calorieTarget * 1.1
  ).length;
  const adherenceRate = Math.round((daysOnTarget / weekEntries.length) * 100);

  // Generate summary insights
  let insight = '';
  if (weightChange < -0.5) {
    insight = 'Great progress! You are losing weight steadily.';
  } else if (weightChange > 0.5) {
    insight = 'Your weight increased slightly. Review your calorie intake and activity level.';
  } else {
    insight = 'Your weight is stable. Good maintenance!';
  }

  return {
    hasData: true,
    period: `${weekEntries[0].date} to ${weekEntries[weekEntries.length - 1].date}`,
    daysTracked: weekEntries.length,
    avgCalories,
    weightChange,
    firstWeight,
    lastWeight,
    workoutDays,
    adherenceRate,
    insight,
    adjustedCalorieTarget: userData.adjustedCalorieTarget
  };
}

module.exports = { addEntry, getProgress, getWeeklySummary };

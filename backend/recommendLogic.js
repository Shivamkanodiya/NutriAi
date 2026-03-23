/**
 * recommendLogic.js
 * =================
 * AI Rule-Based Food Recommendation Module
 *
 * This module uses rule-based filtering to recommend foods
 * based on a user's medical condition.
 *
 * RULES (Rule-Based AI):
 * - Diabetes   → Exclude foods with sugar >= 5g
 * - Hypertension → Exclude foods with sodium >= 140mg
 * - Normal     → No restrictions
 *
 * NO machine learning is used. Filtering is 100% explainable.
 */

const fs = require('fs');
const path = require('path');

// Load the nutrition dataset
const FOODS_PATH = path.join(__dirname, 'data', 'foods.json');

/**
 * loadFoods
 * Loads the nutrition dataset from the JSON file.
 * @returns {Array} Array of food objects
 */
function loadFoods() {
  const data = fs.readFileSync(FOODS_PATH, 'utf-8');
  return JSON.parse(data);
}

/**
 * filterByCondition
 * Applies rule-based filtering to the food dataset.
 *
 * RULE-BASED AI LOGIC:
 * IF condition = "diabetes"
 *   THEN filter out foods where sugar >= 5g
 *   REASON: High sugar foods spike blood glucose levels
 *
 * IF condition = "hypertension"
 *   THEN filter out foods where sodium >= 140mg
 *   REASON: High sodium intake raises blood pressure
 *
 * IF condition = "normal"
 *   THEN no filtering applied
 *
 * @param {Array} foods - Array of food objects
 * @param {string} condition - Medical condition
 * @returns {Array} Filtered foods with explanatory reasons
 */
function filterByCondition(foods, condition) {
  let filtered = [];

  if (condition === 'diabetes') {
    // RULE: For diabetic users, only allow foods with sugar < 5g
    filtered = foods
      .filter(food => food.sugar < 5)
      .map(food => ({
        ...food,
        reason: `Low sugar (${food.sugar}g) – suitable for diabetes management`
      }));
  } else if (condition === 'hypertension') {
    // RULE: For hypertensive users, only allow foods with sodium < 140mg
    filtered = foods
      .filter(food => food.sodium < 140)
      .map(food => ({
        ...food,
        reason: `Low sodium (${food.sodium}mg) – suitable for blood pressure management`
      }));
  } else {
    // No medical restriction for normal users
    filtered = foods.map(food => ({
      ...food,
      reason: 'No dietary restriction – balanced nutrition'
    }));
  }

  return filtered;
}

/**
 * scoreAndRank
 * Scores foods based on nutrient density (protein per calorie ratio).
 * This is a simple rule-based scoring — NOT machine learning.
 *
 * RULE: Score = (protein / calories) × 100
 * Higher score = more protein-dense = more nutritionally efficient
 *
 * @param {Array} foods - Filtered food array
 * @returns {Array} Sorted by score descending
 */
function scoreAndRank(foods) {
  return foods
    .map(food => ({
      ...food,
      score: food.calories > 0 ? Math.round((food.protein / food.calories) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * getRecommendations
 * Main entry point — returns top N food recommendations.
 *
 * Pipeline:
 * 1. Load dataset
 * 2. Apply rule-based medical filtering
 * 3. Score and rank by nutrient density
 * 4. Return top N results with explanations
 *
 * @param {string} condition - Medical condition ('normal', 'diabetes', 'hypertension')
 * @param {string} goal - Fitness goal (used for additional context)
 * @param {number} topN - Number of recommendations (default 10)
 * @returns {Object} { recommendations, filterExplanation }
 */
function getRecommendations(condition, goal, topN = 10) {
  const allFoods = loadFoods();

  // Step 1: Apply rule-based condition filter
  const filtered = filterByCondition(allFoods, condition);

  // Step 2: Score and rank
  const ranked = scoreAndRank(filtered);

  // Step 3: Take top N
  const recommendations = ranked.slice(0, topN);

  // Generate filter explanation for the dashboard
  let filterExplanation = '';
  if (condition === 'diabetes') {
    filterExplanation = 'Foods filtered to exclude items with sugar ≥ 5g (rule-based AI for diabetes safety)';
  } else if (condition === 'hypertension') {
    filterExplanation = 'Foods filtered to exclude items with sodium ≥ 140mg (rule-based AI for blood pressure safety)';
  } else {
    filterExplanation = 'No medical restrictions applied – showing highest-rated foods by nutrient density';
  }

  return {
    recommendations,
    filterExplanation,
    totalFoodsInDataset: allFoods.length,
    foodsAfterFilter: filtered.length
  };
}

/**
 * getMealPlan
 * Generates a simple meal-type breakdown from recommendations.
 *
 * Groups recommendations by meal_type for a structured daily plan.
 *
 * @param {Array} recommendations - Array of food recommendations
 * @returns {Object} Foods grouped by meal_type
 */
function getMealPlan(recommendations) {
  const plan = {
    Breakfast: [],
    Lunch: [],
    Dinner: [],
    Snack: []
  };

  recommendations.forEach(food => {
    const type = food.meal_type || 'Snack';
    if (plan[type]) {
      plan[type].push(food);
    }
  });

  return plan;
}

module.exports = { getRecommendations, getMealPlan };

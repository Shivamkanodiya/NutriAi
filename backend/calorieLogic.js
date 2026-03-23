/**
 * calorieLogic.js
 * ===============
 * AI Rule-Based Calorie & Macro Calculation Module
 *
 * This module implements rule-based AI logic for:
 * 1. BMR calculation using Mifflin–St Jeor Equation
 * 2. TDEE calculation with activity factor
 * 3. Goal-oriented calorie adjustment
 * 4. Medical safety rules (rule-based AI)
 * 5. Macro-nutrient breakdown in grams
 *
 * NO machine learning or neural networks are used.
 * All logic is explainable via IF-ELSE rules.
 */

// ─────────────────────────────────────────────────
// ACTIVITY FACTOR LOOKUP TABLE (Rule-Based)
// ─────────────────────────────────────────────────
const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725
};

// GOAL-BASED CALORIE ADJUSTMENTS (Rule-Based)

const GOAL_ADJUSTMENTS = {
  'weight-loss': -500,
  'maintenance': 0,
  'muscle-gain': 300
};

// MACRO RATIOS BY CONDITION & GOAL (Rule-Based AI)
// IF condition = Diabetes → fixed macro split to manage blood sugar
// IF condition = Hypertension → fixed macro split to manage blood pressure
// IF condition = Normal → macro split depends on goal
const MACRO_RULES = {
  diabetes: { protein: 0.30, carbs: 0.40, fat: 0.30 },
  hypertension: { protein: 0.25, carbs: 0.45, fat: 0.30 },
  normal: {
    'weight-loss': { protein: 0.30, carbs: 0.40, fat: 0.30 },
    'maintenance': { protein: 0.25, carbs: 0.50, fat: 0.25 },
    'muscle-gain': { protein: 0.30, carbs: 0.50, fat: 0.20 }
  }
};

// CALORIC CONVERSION FACTORS

const KCAL_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9
};

/**
 * calculateBMR
 * Calculates Basal Metabolic Rate using Mifflin–St Jeor Equation.
 *
 * Male:   BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) + 5
 * Female: BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) − 161
 *
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm
 * @param {number} age - Age in years
 * @param {string} gender - 'male' or 'female'
 * @returns {number} BMR value
 */
function calculateBMR(weight, height, age, gender) {
  const base = (10 * weight) + (6.25 * height) - (5 * age);

  // RULE: Gender-based BMR adjustment
  if (gender === 'male') {
    return base + 5;
  } else {
    return base - 161;
  }
}

/**
 * calculateTDEE
 * Total Daily Energy Expenditure = BMR × Activity Factor
 *
 * @param {number} bmr - Basal Metabolic Rate
 * @param {string} activity - Activity level key
 * @returns {number} TDEE value
 */
function calculateTDEE(bmr, activity) {
  const factor = ACTIVITY_FACTORS[activity] || 1.2;
  return bmr * factor;
}

/**
 * applyGoalAdjustment
 * Adjusts TDEE based on user's fitness goal.
 *
 * RULE:
 * - Weight Loss → subtract 500 kcal
 * - Maintenance → no change
 * - Muscle Gain → add 300 kcal
 *
 * @param {number} tdee - Total Daily Energy Expenditure
 * @param {string} goal - User's fitness goal
 * @returns {number} Adjusted daily calorie target
 */
function applyGoalAdjustment(tdee, goal) {
  const adjustment = GOAL_ADJUSTMENTS[goal] || 0;
  return tdee + adjustment;
}

/**
 * applyMedicalSafetyRules
 * Enforces minimum calorie limits for medical conditions.
 *
 * RULE (Rule-Based AI):
 * IF condition = Diabetes AND calories < 1500 THEN set calories = 1500
 * (Safety rule to prevent dangerous calorie restriction for diabetic users)
 *
 * @param {number} calories - Calculated calorie target
 * @param {string} condition - Medical condition
 * @returns {number} Safe calorie target
 */
function applyMedicalSafetyRules(calories, condition) {
  // RULE: Diabetic users should not go below 1500 calories
  if (condition === 'diabetes' && calories < 1500) {
    return 1500;
  }
  // General safety: nobody should go below 1200 calories
  if (calories < 1200) {
    return 1200;
  }
  return calories;
}

/**
 * getMacroRatios
 * Returns macro-nutrient ratios based on medical condition and goal.
 *
 * RULE-BASED AI LOGIC:
 * IF condition is diabetes → use diabetes-specific ratios
 * ELSE IF condition is hypertension → use hypertension-specific ratios
 * ELSE → use goal-based ratios for normal users
 *
 * @param {string} condition - Medical condition
 * @param {string} goal - Fitness goal
 * @returns {Object} { protein, carbs, fat } ratios (0-1)
 */
function getMacroRatios(condition, goal) {
  if (condition === 'diabetes') {
    return MACRO_RULES.diabetes;
  } else if (condition === 'hypertension') {
    return MACRO_RULES.hypertension;
  } else {
    return MACRO_RULES.normal[goal] || MACRO_RULES.normal['maintenance'];
  }
}

/**
 * calculateMacros
 * Converts calorie targets to gram values for each macronutrient.
 *
 * Formula: grams = (calories × ratio) / kcal_per_gram
 *
 * @param {number} calories - Daily calorie target
 * @param {Object} ratios - { protein, carbs, fat } ratios
 * @returns {Object} { proteinGrams, carbGrams, fatGrams }
 */
function calculateMacros(calories, ratios) {
  return {
    proteinGrams: Math.round((calories * ratios.protein) / KCAL_PER_GRAM.protein),
    carbGrams: Math.round((calories * ratios.carbs) / KCAL_PER_GRAM.carbs),
    fatGrams: Math.round((calories * ratios.fat) / KCAL_PER_GRAM.fat)
  };
}

/**
 * generateExplanation
 * Creates human-readable explanation of the AI rule-based calculation.
 * Important for project report / viva — shows that the system is explainable.
 *
 * @param {Object} params - All calculation parameters
 * @returns {Array} Array of explanation strings
 */
function generateExplanation(params) {
  const explanations = [];

  explanations.push(
    `BMR calculated using Mifflin–St Jeor Equation for ${params.gender}: ${Math.round(params.bmr)} kcal`
  );
  explanations.push(
    `Activity level "${params.activity}" applies a factor of ${ACTIVITY_FACTORS[params.activity]}, giving TDEE = ${Math.round(params.tdee)} kcal`
  );

  if (params.goal === 'weight-loss') {
    explanations.push('Goal "Weight Loss" reduces TDEE by 500 kcal to create a calorie deficit');
  } else if (params.goal === 'muscle-gain') {
    explanations.push('Goal "Muscle Gain" adds 300 kcal to TDEE to support muscle growth');
  } else {
    explanations.push('Goal "Maintenance" keeps TDEE unchanged');
  }

  if (params.condition === 'diabetes') {
    explanations.push('Medical rule: Diabetes detected — enforcing minimum 1500 kcal and balanced macro split (30% protein, 40% carbs, 30% fat)');
  } else if (params.condition === 'hypertension') {
    explanations.push('Medical rule: Hypertension detected — applying heart-healthy macro split (25% protein, 45% carbs, 30% fat)');
  }

  explanations.push(`Final daily target: ${Math.round(params.finalCalories)} kcal`);

  return explanations;
}

/**
 * calculateAll
 * Main entry point — orchestrates the full AI rule-based calculation pipeline.
 *
 * @param {Object} userInput - { age, gender, height, weight, activity, goal, condition }
 * @returns {Object} Complete calculation results with explanations
 */
function calculateAll(userInput) {
  const { age, gender, height, weight, activity, goal, condition } = userInput;

  // Step 1: Calculate BMR (Mifflin–St Jeor)
  const bmr = calculateBMR(weight, height, age, gender);

  // Step 2: Calculate TDEE (BMR × Activity Factor)
  const tdee = calculateTDEE(bmr, activity);

  // Step 3: Apply goal-based calorie adjustment
  let adjustedCalories = applyGoalAdjustment(tdee, goal);

  // Step 4: Apply medical safety rules (Rule-Based AI)
  const finalCalories = applyMedicalSafetyRules(adjustedCalories, condition);

  // Step 5: Get macro ratios based on condition/goal (Rule-Based AI)
  const macroRatios = getMacroRatios(condition, goal);

  // Step 6: Convert calorie targets to grams
  const macros = calculateMacros(finalCalories, macroRatios);

  // Step 7: Generate human-readable explanations
  const explanations = generateExplanation({
    gender, bmr, activity, tdee, goal, condition, finalCalories
  });

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    goalAdjustment: GOAL_ADJUSTMENTS[goal] || 0,
    dailyCalories: Math.round(finalCalories),
    macroRatios: {
      protein: Math.round(macroRatios.protein * 100),
      carbs: Math.round(macroRatios.carbs * 100),
      fat: Math.round(macroRatios.fat * 100)
    },
    macros,
    explanations
  };
}

module.exports = { calculateAll };

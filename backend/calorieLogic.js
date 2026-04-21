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

// MULTIPLIERS FOR PROTEIN (g per kg) AND FAT (g per kg) (Bodyweight-Based AI)
// The Gold Standard method: Protein and Fat calculated by bodyweight, Carbs fill the remainder
const BODYWEIGHT_RULES = {
  diabetes: { proteinMultiplier: 1.8, fatMultiplier: 1.0 },
  hypertension: { proteinMultiplier: 1.6, fatMultiplier: 1.0 },
  normal: {
    'weight-loss': { proteinMultiplier: 2.0, fatMultiplier: 1.0 },
    'maintenance': { proteinMultiplier: 1.6, fatMultiplier: 1.0 },
    'muscle-gain': { proteinMultiplier: 2.2, fatMultiplier: 1.0 }
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
 * calculateMacros
 * Converts calorie targets to gram values using the Bodyweight-Based Approach.
 *
 * @param {number} calories - Daily calorie target
 * @param {number} weight - User weight in kg
 * @param {string} condition - Medical condition
 * @param {string} goal - User fitness goal
 * @returns {Object} { proteinGrams, carbGrams, fatGrams }
 */
function calculateMacros(calories, weight, condition, goal) {
  let rules;
  if (condition === 'diabetes') rules = BODYWEIGHT_RULES.diabetes;
  else if (condition === 'hypertension') rules = BODYWEIGHT_RULES.hypertension;
  else rules = BODYWEIGHT_RULES.normal[goal] || BODYWEIGHT_RULES.normal['maintenance'];

  // Base calculation on body weight (g per kg)
  let proteinGrams = Math.round(weight * rules.proteinMultiplier);
  let fatGrams = Math.round(weight * rules.fatMultiplier);

  const proteinCals = proteinGrams * KCAL_PER_GRAM.protein;
  const fatCals = fatGrams * KCAL_PER_GRAM.fat;

  // Safeguard: Ensure protein and fat don't exceed calorie budget (leaves ~15% for trace carbs)
  if (proteinCals + fatCals >= calories) {
    const availableCals = calories * 0.85;
    const scaleFactor = availableCals / (proteinCals + fatCals);
    proteinGrams = Math.floor(proteinGrams * scaleFactor);
    fatGrams = Math.floor(fatGrams * scaleFactor);
  }

  // Carbs fill the complete remainder
  const remainingCals = calories - (proteinGrams * KCAL_PER_GRAM.protein) - (fatGrams * KCAL_PER_GRAM.fat);
  const carbGrams = Math.floor(remainingCals / KCAL_PER_GRAM.carbs);

  return { proteinGrams, carbGrams, fatGrams };
}

/**
 * getMacroRatios
 * Dynamically computes exact percentage ratios from grammatical split for the UI.
 *
 * @param {Object} macros - Calculated gram targets
 * @returns {Object} { protein, carbs, fat } ratio decimals
 */
function getMacroRatios(macros) {
  const proteinCals = macros.proteinGrams * KCAL_PER_GRAM.protein;
  const carbCals = macros.carbGrams * KCAL_PER_GRAM.carbs;
  const fatCals = macros.fatGrams * KCAL_PER_GRAM.fat;
  const actualTotal = proteinCals + carbCals + fatCals;

  return {
    protein: proteinCals / actualTotal,
    carbs: carbCals / actualTotal,
    fat: fatCals / actualTotal
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
    explanations.push('Medical rule: Diabetes detected — enforcing minimum 1500 kcal. Macros custom-calculated by bodyweight for safely managing blood sugar.');
  } else if (params.condition === 'hypertension') {
    explanations.push('Medical rule: Hypertension detected — ensuring safe minimum calories and custom bodyweight-based macros for heart health.');
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

  // Step 5: Convert calorie targets to grams using scientific Bodyweight method
  const macros = calculateMacros(finalCalories, weight, condition, goal);

  // Step 6: Get exact percentage ratios for the frontend UI charts
  const macroRatios = getMacroRatios(macros);

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

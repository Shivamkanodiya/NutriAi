/**
 * script.js
 * =========
 * Frontend JavaScript for the AI Nutrition System
 *
 * Handles:
 * - Hamburger mobile navigation
 * - Form submission → API call → redirect to dashboard
 * - Dashboard rendering (stats, charts, food recs, progress)
 * - Progress tracking form
 * - Weekly summary display
 */

// ─── API CONFIGURATION ───────────────────────────────────────────────
// window.API_BASE is set by config.js (loaded before this script)
// On Vercel: points to your Render backend URL
// In local dev: empty string (same-origin)
const API_BASE = window.API_BASE || '';


// ─── HAMBURGER MOBILE NAV ────────────────────────────────────────────

const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('nav-open');
    hamburger.classList.toggle('hamburger-open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Close nav when a link is clicked (mobile UX)
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('nav-open');
      hamburger.classList.remove('hamburger-open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // Close nav when clicking outside
  document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
      navLinks.classList.remove('nav-open');
      hamburger.classList.remove('hamburger-open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}


// ─── UTILITY FUNCTIONS ───────────────────────────────────────────────

/**
 * Makes a fetch request to the backend API.
 */
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

/**
 * Generates a simple userId from user profile data.
 * (No authentication needed — this is a mini project)
 */
function getUserId() {
  const profile = JSON.parse(localStorage.getItem('nutriai_profile') || '{}');
  if (profile.age && profile.gender) {
    return `user_${profile.age}_${profile.gender}_${profile.weight}`;
  }
  return 'default_user';
}


// ─── HOME PAGE — FORM HANDLING ───────────────────────────────────────

const nutritionForm = document.getElementById('nutrition-form');

if (nutritionForm) {
  nutritionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    // Show loading state
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-flex';
    submitBtn.disabled = true;

    try {
      // Collect form data
      const formData = {
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        height: document.getElementById('height').value,
        weight: document.getElementById('weight').value,
        activity: document.getElementById('activity').value,
        goal: document.getElementById('goal').value,
        condition: document.getElementById('condition').value
      };

      // Call the /api/calculate endpoint
      const calcResult = await apiCall('/api/calculate', 'POST', formData);

      // Call the /api/recommend endpoint
      const recResult = await apiCall('/api/recommend', 'POST', {
        condition: formData.condition,
        goal: formData.goal
      });

      // Store results in localStorage for the dashboard
      localStorage.setItem('nutriai_profile', JSON.stringify(formData));
      localStorage.setItem('nutriai_calculation', JSON.stringify(calcResult.data));
      localStorage.setItem('nutriai_recommendations', JSON.stringify(recResult.data));

      // Redirect to dashboard
      window.location.href = 'dashboard.html';

    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please check your internet connection and try again.');
    } finally {
      btnText.style.display = 'inline';
      btnLoader.style.display = 'none';
      submitBtn.disabled = false;
    }
  });
}


// ─── DASHBOARD PAGE — RENDERING ──────────────────────────────────────

const dashboardContent = document.getElementById('dashboard-content');

if (dashboardContent) {
  initDashboard();
}

async function initDashboard() {
  const calcData = JSON.parse(localStorage.getItem('nutriai_calculation'));
  const recData = JSON.parse(localStorage.getItem('nutriai_recommendations'));
  const profile = JSON.parse(localStorage.getItem('nutriai_profile'));

  if (!calcData || !profile) {
    // Show the "no data" state
    document.getElementById('no-data-state').style.display = 'block';
    return;
  }

  // Hide no-data, show dashboard
  document.getElementById('no-data-state').style.display = 'none';
  dashboardContent.style.display = 'block';

  // Render everything
  renderProfileBar(profile);
  renderStats(calcData);
  renderCharts(calcData);
  renderExplanations(calcData.explanations);
  renderFoods(recData);
  renderProgressForm();
  await loadProgressHistory();

  // Set today's date in progress form
  document.getElementById('prog-date').valueAsDate = new Date();
  document.getElementById('prog-weight').value = profile.weight;
}

/**
 * Renders the profile summary bar
 */
function renderProfileBar(profile) {
  const goalNames = { 'weight-loss': 'Weight Loss', 'maintenance': 'Maintenance', 'muscle-gain': 'Muscle Gain' };
  const condNames = { normal: 'Normal', diabetes: 'Diabetes', hypertension: 'Hypertension' };
  const actNames = { sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', heavy: 'Heavy' };

  document.getElementById('profile-summary').innerHTML =
    `<strong>${profile.gender === 'male' ? '👨' : '👩'} ${profile.age} yrs</strong> · ` +
    `${profile.height} cm · ${profile.weight} kg · ` +
    `${actNames[profile.activity]} · ${goalNames[profile.goal]} · ${condNames[profile.condition]}`;
}

/**
 * Renders the stat cards with animated counters
 */
function renderStats(data) {
  animateValue('stat-calories', data.dailyCalories, ' kcal');
  animateValue('stat-protein', data.macros.proteinGrams, 'g');
  animateValue('stat-carbs', data.macros.carbGrams, 'g');
  animateValue('stat-fat', data.macros.fatGrams, 'g');
}

/**
 * Animates a number counting up
 */
function animateValue(elementId, target, suffix = '') {
  const el = document.getElementById(elementId);
  const duration = 1000;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * eased);
    el.textContent = current + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Renders macro breakdown and calorie charts using Chart.js
 */
function renderCharts(data) {
  // Macro Doughnut Chart
  const macroCtx = document.getElementById('macro-chart');
  if (macroCtx) {
    new Chart(macroCtx, {
      type: 'doughnut',
      data: {
        labels: ['Protein', 'Carbs', 'Fat'],
        datasets: [{
          data: [data.macroRatios.protein, data.macroRatios.carbs, data.macroRatios.fat],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(245, 158, 11, 0.8)'
          ],
          borderColor: [
            'rgba(16, 185, 129, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(245, 158, 11, 1)'
          ],
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              padding: 16,
              font: { family: 'Inter', size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.parsed}%`
            }
          }
        }
      }
    });
  }

  // Calorie Bar Chart
  const calCtx = document.getElementById('calorie-chart');
  if (calCtx) {
    new Chart(calCtx, {
      type: 'bar',
      data: {
        labels: ['BMR', 'TDEE', 'Daily Target'],
        datasets: [{
          label: 'Calories (kcal)',
          data: [data.bmr, data.tdee, data.dailyCalories],
          backgroundColor: [
            'rgba(99, 102, 241, 0.6)',
            'rgba(139, 92, 246, 0.6)',
            'rgba(6, 182, 212, 0.6)'
          ],
          borderColor: [
            'rgba(99, 102, 241, 1)',
            'rgba(139, 92, 246, 1)',
            'rgba(6, 182, 212, 1)'
          ],
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#64748b', font: { family: 'Inter' } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: 'Inter', weight: 600 } }
          }
        }
      }
    });
  }
}

/**
 * Renders AI explanations list
 */
function renderExplanations(explanations) {
  const container = document.getElementById('explanations-list');
  if (!container || !explanations) return;

  container.innerHTML = explanations.map(exp =>
    `<div class="explanation-item">
      <div class="explanation-icon">🤖</div>
      <div class="explanation-text">${exp}</div>
    </div>`
  ).join('');
}

/**
 * Renders food recommendation cards
 */
function renderFoods(recData) {
  if (!recData) return;

  const filterEl = document.getElementById('filter-explanation');
  if (filterEl) {
    filterEl.textContent = recData.filterExplanation;
  }

  const gridEl = document.getElementById('food-grid');
  if (!gridEl) return;

  gridEl.innerHTML = recData.recommendations.map(food =>
    `<div class="food-card glass-card">
      <div class="food-name">${food.food_name}</div>
      <div class="food-meta">
        <span class="food-tag tag-cal">${food.calories} kcal</span>
        <span class="food-tag tag-pro">P: ${food.protein}g</span>
        <span class="food-tag tag-carb">C: ${food.carbohydrates}g</span>
        <span class="food-tag tag-fat">F: ${food.fat}g</span>
        <span class="food-tag tag-meal">${food.meal_type}</span>
      </div>
      <div class="food-reason">💡 ${food.reason}</div>
    </div>`
  ).join('');
}

/**
 * Sets up the progress tracking form
 */
function renderProgressForm() {
  const form = document.getElementById('progress-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('progress-submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-flex';
    submitBtn.disabled = true;

    try {
      const calcData = JSON.parse(localStorage.getItem('nutriai_calculation'));
      const userId = getUserId();

      const result = await apiCall('/api/progress', 'POST', {
        userId,
        date: document.getElementById('prog-date').value,
        caloriesConsumed: document.getElementById('prog-calories').value,
        weight: document.getElementById('prog-weight').value,
        workoutDone: document.getElementById('prog-workout').value === 'yes',
        calorieTarget: calcData ? calcData.dailyCalories : 2000
      });

      const feedbackEl = document.getElementById('feedback-message');
      feedbackEl.style.display = 'block';

      if (result.data.feedback.shouldAdjust) {
        feedbackEl.className = 'feedback-message feedback-warning';
        feedbackEl.innerHTML = `⚠️ ${result.data.feedback.explanation}`;

        if (calcData) {
          calcData.dailyCalories = result.data.feedback.adjustedTarget;
          localStorage.setItem('nutriai_calculation', JSON.stringify(calcData));
          document.getElementById('stat-calories').textContent = result.data.feedback.adjustedTarget + ' kcal';
        }
      } else {
        feedbackEl.className = 'feedback-message feedback-success';
        feedbackEl.innerHTML = `✅ Progress logged! ${result.data.feedback.explanation}`;
      }

      document.getElementById('prog-calories').value = '';
      await loadProgressHistory();

    } catch (error) {
      console.error('Error logging progress:', error);
      const feedbackEl = document.getElementById('feedback-message');
      feedbackEl.style.display = 'block';
      feedbackEl.className = 'feedback-message feedback-warning';
      feedbackEl.innerHTML = '❌ Error logging progress. Please try again.';
    } finally {
      btnText.style.display = 'inline';
      btnLoader.style.display = 'none';
      submitBtn.disabled = false;
    }
  });
}

/**
 * Loads and displays progress history + weekly summary
 */
async function loadProgressHistory() {
  const userId = getUserId();

  try {
    const progressResult = await apiCall(`/api/progress/${userId}`);
    const entries = progressResult.data.entries || [];

    if (entries.length > 0) {
      renderProgressHistory(entries);
      renderProgressCharts(entries);

      const weeklyResult = await apiCall(`/api/weekly-summary/${userId}`);
      if (weeklyResult.data.hasData) {
        renderWeeklySummary(weeklyResult.data);
      }
    }
  } catch (error) {
    console.error('Error loading progress:', error);
  }
}

/**
 * Renders the progress history table
 */
function renderProgressHistory(entries) {
  const section = document.getElementById('history-section');
  const tbody = document.getElementById('history-tbody');
  if (!section || !tbody) return;

  section.style.display = 'block';

  const recent = [...entries].reverse().slice(0, 10);

  tbody.innerHTML = recent.map(entry => {
    const met = entry.caloriesConsumed >= entry.calorieTarget * 0.9;
    return `<tr>
      <td>${entry.date}</td>
      <td>${entry.caloriesConsumed} kcal</td>
      <td>${entry.calorieTarget} kcal</td>
      <td>${entry.weight} kg</td>
      <td>${entry.workoutDone ? '✅' : '❌'}</td>
      <td class="${met ? 'status-met' : 'status-missed'}">${met ? '✅ On Track' : '⚠️ Missed'}</td>
    </tr>`;
  }).join('');
}

/**
 * Renders progress charts (calorie tracking & weight tracking)
 */
let progressCalorieChart = null;
let progressWeightChart = null;

function renderProgressCharts(entries) {
  const section = document.getElementById('progress-chart-section');
  if (!section) return;
  section.style.display = 'block';

  const labels = entries.map(e => e.date);
  const caloriesData = entries.map(e => e.caloriesConsumed);
  const targetData = entries.map(e => e.calorieTarget);
  const weightData = entries.map(e => e.weight);

  if (progressCalorieChart) progressCalorieChart.destroy();
  if (progressWeightChart) progressWeightChart.destroy();

  const calCtx = document.getElementById('progress-calorie-chart');
  if (calCtx) {
    progressCalorieChart = new Chart(calCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Consumed',
            data: caloriesData,
            borderColor: 'rgba(6, 182, 212, 1)',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Target',
            data: targetData,
            borderColor: 'rgba(239, 68, 68, 0.7)',
            borderDash: [5, 5],
            fill: false,
            tension: 0,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Inter' } }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#64748b' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', maxRotation: 45 }
          }
        }
      }
    });
  }

  const wtCtx = document.getElementById('progress-weight-chart');
  if (wtCtx) {
    progressWeightChart = new Chart(wtCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Weight (kg)',
          data: weightData,
          borderColor: 'rgba(139, 92, 246, 1)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Inter' } }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#64748b' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', maxRotation: 45 }
          }
        }
      }
    });
  }
}

/**
 * Renders the weekly summary section
 */
function renderWeeklySummary(data) {
  const section = document.getElementById('weekly-section');
  const card = document.getElementById('weekly-card');
  if (!section || !card) return;

  section.style.display = 'block';

  const weightChangeColor = data.weightChange < 0 ? '#10b981' : data.weightChange > 0 ? '#ef4444' : '#94a3b8';
  const weightChangeIcon = data.weightChange < 0 ? '↓' : data.weightChange > 0 ? '↑' : '→';

  card.innerHTML = `
    <div class="weekly-stats">
      <div class="weekly-stat">
        <div class="weekly-stat-value" style="color: var(--accent-3);">${data.avgCalories}</div>
        <div class="weekly-stat-label">Avg Calories</div>
      </div>
      <div class="weekly-stat">
        <div class="weekly-stat-value" style="color: ${weightChangeColor};">${weightChangeIcon} ${Math.abs(data.weightChange)} kg</div>
        <div class="weekly-stat-label">Weight Change</div>
      </div>
      <div class="weekly-stat">
        <div class="weekly-stat-value" style="color: var(--accent-4);">${data.workoutDays}/${data.daysTracked}</div>
        <div class="weekly-stat-label">Workout Days</div>
      </div>
      <div class="weekly-stat">
        <div class="weekly-stat-value" style="color: var(--accent-1);">${data.adherenceRate}%</div>
        <div class="weekly-stat-label">Adherence Rate</div>
      </div>
    </div>
    <div class="weekly-insight">
      <strong>📊 AI Insight:</strong> ${data.insight}
      ${data.adjustedCalorieTarget ? `<br><strong>🔄 Adjusted Target:</strong> ${data.adjustedCalorieTarget} kcal (feedback rule applied)` : ''}
    </div>
    <p style="margin-top: var(--space-md); font-size: 0.8rem; color: var(--text-muted);">
      Period: ${data.period} · ${data.daysTracked} days tracked
    </p>
  `;
}

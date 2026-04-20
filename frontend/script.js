/**
 * script.js
 * =========
 * Frontend JavaScript for the AI Nutrition System
 *
 * Handles:
 * - Auth: register, login, logout, token management
 * - Auth guards (redirect to login if no token)
 * - Hamburger mobile navigation
 * - Form submission → API call → redirect to dashboard
 * - Dashboard rendering (stats, charts, food recs, progress)
 * - Progress tracking form
 * - Weekly summary display
 */

// ─── API CONFIGURATION ───────────────────────────────────────────────
const API_BASE = window.API_BASE || '';

// ─── AUTH HELPERS ────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('nutriai_token');
}

function setToken(token) {
  localStorage.setItem('nutriai_token', token);
}

function clearAuth() {
  localStorage.removeItem('nutriai_token');
  localStorage.removeItem('nutriai_user');
  localStorage.removeItem('nutriai_profile');
  localStorage.removeItem('nutriai_calculation');
  localStorage.removeItem('nutriai_recommendations');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('nutriai_user') || 'null');
  } catch { return null; }
}

/**
 * Redirects to login if user is not logged in.
 * Call this at the top of any protected page.
 */
function requireAuth() {
  if (!getToken()) {
    window.location.href = 'login.html';
  }
}

/**
 * Redirects to home if user IS already logged in.
 * Call this on login/register pages.
 */
function redirectIfLoggedIn() {
  if (getToken()) {
    window.location.href = 'index.html';
  }
}

// ─── HAMBURGER MOBILE NAV ────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('nav-open');
    hamburger.classList.toggle('hamburger-open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('nav-open');
      hamburger.classList.remove('hamburger-open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
      navLinks.classList.remove('nav-open');
      hamburger.classList.remove('hamburger-open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}

// ─── LOGOUT & NAV USER ───────────────────────────────────────────────
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    clearAuth();
    window.location.href = 'login.html';
  });
}

const navUserName = document.getElementById('nav-user-name');
if (navUserName) {
  const user = getUser();
  if (user) navUserName.textContent = `Hi, ${user.name.split(' ')[0]} 👋`;
}

// ─── UTILITY FUNCTIONS ───────────────────────────────────────────────
async function apiCall(endpoint, method = 'GET', body = null, requiresAuth = false) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };

  if (requiresAuth) {
    const token = getToken();
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE}${endpoint}`, options);

  if (response.status === 401) {
    clearAuth();
    window.location.href = 'login.html';
    return;
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `API error: ${response.status}`);
  }

  return response.json();
}

// ─── AUTH ERROR DISPLAY ──────────────────────────────────────────────
function showAuthError(message) {
  const el = document.getElementById('auth-error');
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  }
}

function hideAuthError() {
  const el = document.getElementById('auth-error');
  if (el) el.style.display = 'none';
}

// ─── PASSWORD TOGGLE ─────────────────────────────────────────────────
const passwordToggle = document.getElementById('password-toggle');
const passwordInput = document.getElementById('password');
if (passwordToggle && passwordInput) {
  passwordToggle.addEventListener('click', () => {
    const isText = passwordInput.type === 'text';
    passwordInput.type = isText ? 'password' : 'text';
    passwordToggle.textContent = isText ? '👁️' : '🙈';
  });
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────
const loginForm = document.getElementById('login-form');
if (loginForm) {
  redirectIfLoggedIn();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError();

    const btn = document.getElementById('login-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-flex';
    btn.disabled = true;

    try {
      const result = await apiCall('/api/auth/login', 'POST', {
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      });

      setToken(result.token);
      localStorage.setItem('nutriai_user', JSON.stringify(result.user));
      window.location.href = 'index.html';

    } catch (error) {
      showAuthError(error.message || 'Login failed. Please try again.');
    } finally {
      btnText.style.display = 'inline';
      btnLoader.style.display = 'none';
      btn.disabled = false;
    }
  });
}

// ─── REGISTER PAGE ───────────────────────────────────────────────────
const registerForm = document.getElementById('register-form');
if (registerForm) {
  redirectIfLoggedIn();

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError();

    const btn = document.getElementById('register-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-flex';
    btn.disabled = true;

    try {
      const result = await apiCall('/api/auth/register', 'POST', {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      });

      setToken(result.token);
      localStorage.setItem('nutriai_user', JSON.stringify(result.user));
      window.location.href = 'index.html';

    } catch (error) {
      showAuthError(error.message || 'Registration failed. Please try again.');
    } finally {
      btnText.style.display = 'inline';
      btnLoader.style.display = 'none';
      btn.disabled = false;
    }
  });
}

// ─── REPORT UPLOAD HANDLING ──────────────────────────────────────────
const reportDropzone = document.getElementById('report-dropzone');
const reportFileInput = document.getElementById('report-file-input');
const reportBrowseBtn = document.getElementById('report-browse-btn');

if (reportDropzone && reportFileInput) {
  let detectedConditionValue = null;

  // Browse button proxy
  if (reportBrowseBtn) {
    reportBrowseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      reportFileInput.click();
    });
  }
  
  // Click on dropzone
  reportDropzone.addEventListener('click', () => reportFileInput.click());

  // Drag and drop events
  reportDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    reportDropzone.classList.add('dragover');
  });

  reportDropzone.addEventListener('dragleave', () => {
    reportDropzone.classList.remove('dragover');
  });

  reportDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    reportDropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleReportFile(e.dataTransfer.files[0]);
    }
  });

  // File input change
  reportFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleReportFile(e.target.files[0]);
    }
  });

  // Reset button
  const reportResetBtn = document.getElementById('report-reset-btn');
  if (reportResetBtn) {
    reportResetBtn.addEventListener('click', resetReportUI);
  }

  // Apply button
  const reportApplyBtn = document.getElementById('report-apply-btn');
  if (reportApplyBtn) {
    reportApplyBtn.addEventListener('click', () => {
      if (detectedConditionValue) {
        const conditionSelect = document.getElementById('condition');
        if (conditionSelect) {
          conditionSelect.value = detectedConditionValue;
          // Visual feedback
          conditionSelect.style.transition = 'box-shadow 0.3s';
          conditionSelect.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.4)';
          setTimeout(() => conditionSelect.style.boxShadow = 'none', 1500);
          
          // Scroll to form
          conditionSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }

  async function handleReportFile(file) {
    if (!window.ReportParser) {
      alert("ReportParser module not loaded.");
      return;
    }

    // UI transitions
    reportDropzone.style.display = 'none';
    document.getElementById('report-results').style.display = 'none';
    
    const progressWrap = document.getElementById('report-progress-wrap');
    const progressBar = document.getElementById('report-progress-bar');
    const progressLabel = document.getElementById('report-progress-label');
    
    progressWrap.style.display = 'block';
    progressBar.style.width = '0%';
    progressLabel.textContent = 'Preparing file...';

    try {
      const result = await window.ReportParser.parseReport(file, (percent, msg) => {
        progressBar.style.width = `${percent}%`;
        progressLabel.textContent = msg;
      });

      // Hide progress, show results
      setTimeout(() => {
        progressWrap.style.display = 'none';
        showReportResults(result);
      }, 500);

    } catch (err) {
      alert(err.message || 'Failed to parse report');
      resetReportUI();
    }
  }

  function showReportResults(result) {
    const resultsPanel = document.getElementById('report-results');
    resultsPanel.style.display = 'block';

    // Condition Box
    const info = window.ReportParser.getConditionInfo(result.condition);
    detectedConditionValue = info.value;

    const rcbCond = document.getElementById('rcb-condition');
    rcbCond.textContent = info.label;
    rcbCond.style.color = info.color;
    
    const rcbBox = document.getElementById('report-condition-box');
    rcbBox.style.backgroundColor = info.bg;
    rcbBox.style.borderColor = info.border;

    const rcbConf = document.getElementById('rcb-confidence');
    rcbConf.textContent = `Confidence: ${result.confidence.toUpperCase()}`;
    
    // Extracted Markers
    const rmpPanel = document.getElementById('report-markers-panel');
    const rmpMarkers = document.getElementById('rmp-markers');
    
    if (result.method === 'ocr') {
      rmpPanel.style.display = 'block';
      rmpMarkers.innerHTML = window.ReportParser.formatMarkersHTML(result.markers);
    } else {
      rmpPanel.style.display = 'none';
    }

    // Evidence List
    const evidenceList = document.getElementById('report-evidence-list');
    if (result.evidence && result.evidence.length > 0) {
      evidenceList.innerHTML = '<strong>Reasoning:</strong><ul>' + 
        result.evidence.map(e => `<li>${e}</li>`).join('') + 
        '</ul>';
      evidenceList.style.display = 'block';
    } else {
      evidenceList.style.display = 'none';
    }

    // Method Note (e.g. for PDF)
    const methodNote = document.getElementById('report-method-note');
    if (result.note) {
      methodNote.innerHTML = `⚠️ ${result.note}`;
      methodNote.style.display = 'block';
    } else {
      methodNote.style.display = 'none';
    }
  }

  function resetReportUI() {
    reportFileInput.value = '';
    detectedConditionValue = null;
    reportDropzone.style.display = 'flex';
    document.getElementById('report-progress-wrap').style.display = 'none';
    document.getElementById('report-results').style.display = 'none';
  }
}

// ─── HOME PAGE — FORM HANDLING ───────────────────────────────────────
const nutritionForm = document.getElementById('nutrition-form');
if (nutritionForm) {
  requireAuth();

  nutritionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-flex';
    submitBtn.disabled = true;

    try {
      const formData = {
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        height: document.getElementById('height').value,
        weight: document.getElementById('weight').value,
        activity: document.getElementById('activity').value,
        goal: document.getElementById('goal').value,
        condition: document.getElementById('condition').value
      };

      const calcResult = await apiCall('/api/calculate', 'POST', formData);
      const recResult = await apiCall('/api/recommend', 'POST', {
        condition: formData.condition,
        goal: formData.goal
      });

      localStorage.setItem('nutriai_profile', JSON.stringify(formData));
      localStorage.setItem('nutriai_calculation', JSON.stringify(calcResult.data));
      localStorage.setItem('nutriai_recommendations', JSON.stringify(recResult.data));

      window.location.href = 'dashboard.html';

    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please check your connection and try again.');
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
  requireAuth();
  initDashboard();
}

async function initDashboard() {
  const calcData = JSON.parse(localStorage.getItem('nutriai_calculation'));
  const recData = JSON.parse(localStorage.getItem('nutriai_recommendations'));
  const profile = JSON.parse(localStorage.getItem('nutriai_profile'));

  if (!calcData || !profile) {
    document.getElementById('no-data-state').style.display = 'block';
    return;
  }

  document.getElementById('no-data-state').style.display = 'none';
  dashboardContent.style.display = 'block';

  renderProfileBar(profile);
  renderStats(calcData);
  renderCharts(calcData);
  renderExplanations(calcData.explanations);
  renderFoods(recData);
  renderProgressForm();
  await loadProgressHistory();

  document.getElementById('prog-date').valueAsDate = new Date();
  document.getElementById('prog-weight').value = profile.weight;
}

function renderProfileBar(profile) {
  const goalNames = { 'weight-loss': 'Weight Loss', 'maintenance': 'Maintenance', 'muscle-gain': 'Muscle Gain' };
  const condNames = { normal: 'Normal', diabetes: 'Diabetes', hypertension: 'Hypertension' };
  const actNames = { sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', heavy: 'Heavy' };

  document.getElementById('profile-summary').innerHTML =
    `<strong>${profile.gender === 'male' ? '👨' : '👩'} ${profile.age} yrs</strong> · ` +
    `${profile.height} cm · ${profile.weight} kg · ` +
    `${actNames[profile.activity]} · ${goalNames[profile.goal]} · ${condNames[profile.condition]}`;
}

function renderStats(data) {
  animateValue('stat-calories', data.dailyCalories, ' kcal');
  animateValue('stat-protein', data.macros.proteinGrams, 'g');
  animateValue('stat-carbs', data.macros.carbGrams, 'g');
  animateValue('stat-fat', data.macros.fatGrams, 'g');
}

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
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

function renderCharts(data) {
  const macroCtx = document.getElementById('macro-chart');
  if (macroCtx) {
    new Chart(macroCtx, {
      type: 'doughnut',
      data: {
        labels: ['Protein', 'Carbs', 'Fat'],
        datasets: [{
          data: [data.macroRatios.protein, data.macroRatios.carbs, data.macroRatios.fat],
          backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(59,130,246,0.8)', 'rgba(245,158,11,0.8)'],
          borderColor: ['rgba(16,185,129,1)', 'rgba(59,130,246,1)', 'rgba(245,158,11,1)'],
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
          legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, font: { family: 'Inter', size: 12 } } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}%` } }
        }
      }
    });
  }

  const calCtx = document.getElementById('calorie-chart');
  if (calCtx) {
    new Chart(calCtx, {
      type: 'bar',
      data: {
        labels: ['BMR', 'TDEE', 'Daily Target'],
        datasets: [{
          label: 'Calories (kcal)',
          data: [data.bmr, data.tdee, data.dailyCalories],
          backgroundColor: ['rgba(99,102,241,0.6)', 'rgba(139,92,246,0.6)', 'rgba(6,182,212,0.6)'],
          borderColor: ['rgba(99,102,241,1)', 'rgba(139,92,246,1)', 'rgba(6,182,212,1)'],
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { family: 'Inter' } } },
          x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Inter', weight: 600 } } }
        }
      }
    });
  }
}

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

function renderFoods(recData) {
  if (!recData) return;
  const filterEl = document.getElementById('filter-explanation');
  if (filterEl) filterEl.textContent = recData.filterExplanation;

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

      const result = await apiCall('/api/progress', 'POST', {
        date: document.getElementById('prog-date').value,
        caloriesConsumed: document.getElementById('prog-calories').value,
        weight: document.getElementById('prog-weight').value,
        workoutDone: document.getElementById('prog-workout').value === 'yes',
        calorieTarget: calcData ? calcData.dailyCalories : 2000
      }, true); // requiresAuth = true

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

async function loadProgressHistory() {
  try {
    const progressResult = await apiCall('/api/progress', 'GET', null, true);
    const entries = progressResult.data.entries || [];

    if (entries.length > 0) {
      renderProgressHistory(entries);
      renderProgressCharts(entries);
      const weeklyResult = await apiCall('/api/weekly-summary', 'GET', null, true);
      if (weeklyResult.data.hasData) renderWeeklySummary(weeklyResult.data);
    }
  } catch (error) {
    console.error('Error loading progress:', error);
  }
}

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
          { label: 'Consumed', data: caloriesData, borderColor: 'rgba(6,182,212,1)', backgroundColor: 'rgba(6,182,212,0.1)', fill: true, tension: 0.3, pointRadius: 4, pointHoverRadius: 6 },
          { label: 'Target', data: targetData, borderColor: 'rgba(239,68,68,0.7)', borderDash: [5,5], fill: false, tension: 0, pointRadius: 3 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } }, x: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 45 } } } }
    });
  }

  const wtCtx = document.getElementById('progress-weight-chart');
  if (wtCtx) {
    progressWeightChart = new Chart(wtCtx, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Weight (kg)', data: weightData, borderColor: 'rgba(139,92,246,1)', backgroundColor: 'rgba(139,92,246,0.1)', fill: true, tension: 0.3, pointRadius: 4, pointHoverRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } }, x: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 45 } } } }
    });
  }
}

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
    </div>
    <p style="margin-top: var(--space-md); font-size: 0.8rem; color: var(--text-muted);">
      Period: ${data.period} · ${data.daysTracked} days tracked
    </p>
  `;
}

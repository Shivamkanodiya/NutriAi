/**
 * report-parser.js
 * ================
 * Client-side medical report parsing module for NutriAI.
 *
 * Capabilities:
 * - Supports image files (JPG, PNG, WEBP) via Tesseract.js OCR
 * - Supports PDFs via filename heuristics + user-readable note
 * - Detects health markers: Blood Glucose / HbA1c → Diabetes
 *                           Systolic/Diastolic / Blood Pressure → Hypertension
 *                           Cholesterol (LDL, HDL, total) → Hypertension or normal
 * - Returns detected condition + extracted values for user confirmation
 */

// ─── TESSERACT CDN LOADER ────────────────────────────────────────────────────
// Tesseract.js is loaded dynamically so it only impacts the profile page.
let tesseractLoaded = false;
let tesseractLoadPromise = null;

function loadTesseract() {
  if (tesseractLoaded) return Promise.resolve();
  if (tesseractLoadPromise) return tesseractLoadPromise;

  tesseractLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload = () => { tesseractLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load Tesseract.js'));
    document.head.appendChild(script);
  });

  return tesseractLoadPromise;
}

// ─── KEYWORD PATTERNS ────────────────────────────────────────────────────────

const DIABETES_PATTERNS = [
  /\bglucose\b/i,
  /\bblood\s*sugar\b/i,
  /\bhba1c\b/i,
  /\bhaemoglobin\s*a1c\b/i,
  /\bfasting\s*glucose\b/i,
  /\bppbs\b/i,              // Post-prandial blood sugar
  /\bfbs\b/i,               // Fasting blood sugar
  /\brbs\b/i,               // Random blood sugar
  /\bdiabetes\b/i,
  /\bhyperglycemi/i
];

const HYPERTENSION_PATTERNS = [
  /\bsystolic\b/i,
  /\bdiastolic\b/i,
  /\bblood\s*pressure\b/i,
  /\bbp\b/i,
  /\bhypertension\b/i,
  /\b\d{2,3}\s*\/\s*\d{2,3}\s*mmhg\b/i,   // e.g. "130/85 mmHg"
  /\bcholesterol\b/i,
  /\bldl\b/i,
  /\bhdl\b/i,
  /\btriglycerides\b/i,
  /\blipid\s*profile\b/i
];

// ─── VALUE EXTRACTORS ────────────────────────────────────────────────────────

/**
 * Extract common numeric health markers from raw OCR text.
 * Returns an object with detected values (may be null if not found).
 */
function extractHealthMarkers(text) {
  const markers = {};

  // Blood Glucose (e.g. "Glucose: 180 mg/dL" or "FBS: 126")
  const glucoseMatch = text.match(/(?:glucose|fbs|rbs|ppbs|blood\s*sugar)[:\s]*(\d{2,3}(?:\.\d+)?)\s*(?:mg\/dl|mg%)?/i);
  if (glucoseMatch) markers.glucose = parseFloat(glucoseMatch[1]);

  // HbA1c (e.g. "HbA1c: 7.5%" or "A1C 8.2")
  const hba1cMatch = text.match(/(?:hba1c|a1c|haemoglobin\s*a1c)[:\s]*(\d{1,2}(?:\.\d+)?)\s*%?/i);
  if (hba1cMatch) markers.hba1c = parseFloat(hba1cMatch[1]);

  // Blood Pressure (e.g. "BP: 145/90" or "130/80 mmHg")
  const bpMatch = text.match(/(?:bp|blood\s*pressure)?[:\s]*(\d{2,3})\s*\/\s*(\d{2,3})\s*(?:mmhg)?/i);
  if (bpMatch) {
    markers.systolic = parseInt(bpMatch[1]);
    markers.diastolic = parseInt(bpMatch[2]);
  }

  // Total Cholesterol (e.g. "Total Cholesterol: 240 mg/dL")
  const cholMatch = text.match(/(?:total\s*)?cholesterol[:\s]*(\d{2,3}(?:\.\d+)?)\s*(?:mg\/dl)?/i);
  if (cholMatch) markers.cholesterol = parseFloat(cholMatch[1]);

  // LDL (e.g. "LDL: 160 mg/dL")
  const ldlMatch = text.match(/\bldl[:\s]*(\d{2,3}(?:\.\d+)?)/i);
  if (ldlMatch) markers.ldl = parseFloat(ldlMatch[1]);

  // HDL (e.g. "HDL: 35 mg/dL")
  const hdlMatch = text.match(/\bhdl[:\s]*(\d{2,3}(?:\.\d+)?)/i);
  if (hdlMatch) markers.hdl = parseFloat(hdlMatch[1]);

  return markers;
}

// ─── CONDITION DETECTION LOGIC ────────────────────────────────────────────────

/**
 * Decide condition based on:
 *  1. Numeric marker thresholds (clinical guidelines)
 *  2. Keyword frequency scoring
 * Returns: { condition: 'diabetes'|'hypertension'|'normal', confidence: 'high'|'medium'|'low', evidence: [...] }
 */
function detectCondition(text, markers) {
  const evidence = [];
  let diabetesScore = 0;
  let hypertensionScore = 0;

  // ── Numeric thresholds ──
  if (markers.glucose !== undefined) {
    if (markers.glucose >= 126) {
      diabetesScore += 3;
      evidence.push(`Fasting glucose ${markers.glucose} mg/dL (≥126 = Diabetic range)`);
    } else if (markers.glucose >= 100) {
      diabetesScore += 1;
      evidence.push(`Glucose ${markers.glucose} mg/dL (Pre-diabetic range)`);
    }
  }

  if (markers.hba1c !== undefined) {
    if (markers.hba1c >= 6.5) {
      diabetesScore += 3;
      evidence.push(`HbA1c ${markers.hba1c}% (≥6.5% = Diabetic range)`);
    } else if (markers.hba1c >= 5.7) {
      diabetesScore += 1;
      evidence.push(`HbA1c ${markers.hba1c}% (Pre-diabetic range 5.7–6.4%)`);
    }
  }

  if (markers.systolic !== undefined && markers.diastolic !== undefined) {
    if (markers.systolic >= 140 || markers.diastolic >= 90) {
      hypertensionScore += 3;
      evidence.push(`Blood pressure ${markers.systolic}/${markers.diastolic} mmHg (≥140/90 = Hypertensive range)`);
    } else if (markers.systolic >= 130 || markers.diastolic >= 80) {
      hypertensionScore += 2;
      evidence.push(`Blood pressure ${markers.systolic}/${markers.diastolic} mmHg (Stage 1 Hypertension range)`);
    }
  }

  if (markers.cholesterol !== undefined && markers.cholesterol >= 240) {
    hypertensionScore += 2;
    evidence.push(`Total cholesterol ${markers.cholesterol} mg/dL (≥240 = High)`);
  }

  if (markers.ldl !== undefined && markers.ldl >= 160) {
    hypertensionScore += 2;
    evidence.push(`LDL ${markers.ldl} mg/dL (≥160 = High)`);
  }

  if (markers.hdl !== undefined && markers.hdl < 40) {
    hypertensionScore += 1;
    evidence.push(`HDL ${markers.hdl} mg/dL (<40 = Low — cardiovascular risk)`);
  }

  // ── Keyword scoring ──
  DIABETES_PATTERNS.forEach(p => { if (p.test(text)) diabetesScore += 1; });
  HYPERTENSION_PATTERNS.forEach(p => { if (p.test(text)) hypertensionScore += 1; });

  // ── Decision ──
  let condition = 'normal';
  let confidence = 'low';

  if (diabetesScore >= 3 && diabetesScore >= hypertensionScore) {
    condition = 'diabetes';
    confidence = diabetesScore >= 5 ? 'high' : 'medium';
  } else if (hypertensionScore >= 3) {
    condition = 'hypertension';
    confidence = hypertensionScore >= 5 ? 'high' : 'medium';
  } else if (diabetesScore >= 1 || hypertensionScore >= 1) {
    condition = diabetesScore >= hypertensionScore ? 'diabetes' : 'hypertension';
    confidence = 'low';
    evidence.push('Weak signal – please verify manually');
  }

  return { condition, confidence, evidence, diabetesScore, hypertensionScore };
}

// ─── FILENAME HEURISTIC (PDF fallback) ───────────────────────────────────────

function guessFromFilename(filename) {
  const name = filename.toLowerCase();
  const evidence = [];
  let diabetesScore = 0;
  let hypertensionScore = 0;

  if (/glucose|hba1c|diabet|sugar|a1c/.test(name)) {
    diabetesScore += 2;
    evidence.push(`Filename contains diabetes-related keywords`);
  }
  if (/bp|hypertens|cholesterol|lipid|cardiac|blood.?press/.test(name)) {
    hypertensionScore += 2;
    evidence.push(`Filename contains hypertension-related keywords`);
  }

  let condition = 'normal';
  let confidence = 'low';

  if (diabetesScore > 0 || hypertensionScore > 0) {
    condition = diabetesScore >= hypertensionScore ? 'diabetes' : 'hypertension';
    confidence = 'low';
    evidence.push('Based on filename only — please confirm manually');
  }

  return { condition, confidence, evidence, diabetesScore, hypertensionScore };
}

// ─── MAIN PARSE FUNCTION ─────────────────────────────────────────────────────

/**
 * parseReport(file, onProgress)
 *
 * @param {File} file - The file object from the file input
 * @param {Function} onProgress - Called with (percent, message) during OCR
 * @returns {Promise<{
 *   condition: string,
 *   confidence: string,
 *   evidence: string[],
 *   markers: object,
 *   rawText: string,
 *   method: string
 * }>}
 */
async function parseReport(file, onProgress = () => {}) {
  const ext = file.name.split('.').pop().toLowerCase();
  const isPDF = ext === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'].includes(ext);

  // ── PDF: file API cannot read binary text without PDF.js, use filename ──
  if (isPDF) {
    onProgress(100, 'PDF detected — using filename analysis');
    const result = guessFromFilename(file.name);
    return {
      ...result,
      markers: {},
      rawText: '',
      method: 'filename',
      note: 'PDF text extraction requires server-side processing. Condition was guessed from the filename. Please confirm below.'
    };
  }

  // ── Image: run Tesseract.js OCR ──
  if (isImage) {
    onProgress(5, 'Loading OCR engine…');
    await loadTesseract();

    onProgress(15, 'Initializing Tesseract…');

    const { createWorker } = Tesseract;
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pct = Math.round(15 + m.progress * 70);
          onProgress(pct, `Recognizing text… ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    onProgress(85, 'Extracting text…');
    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();

    onProgress(95, 'Analyzing health markers…');
    const markers = extractHealthMarkers(text);
    const detection = detectCondition(text, markers);

    onProgress(100, 'Analysis complete!');

    return {
      ...detection,
      markers,
      rawText: text,
      method: 'ocr'
    };
  }

  // ── Unsupported type ──
  throw new Error(`Unsupported file type: .${ext}. Please upload a JPG, PNG, or PDF file.`);
}

// ─── CONDITION DISPLAY HELPERS ────────────────────────────────────────────────

const CONDITION_INFO = {
  diabetes: {
    label: '🩸 Diabetes',
    value: 'diabetes',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.3)',
    description: 'AI detected diabetes-related markers. The nutrition plan will use low-glycemic index foods and limit added sugars.'
  },
  hypertension: {
    label: '❤️ Hypertension',
    value: 'hypertension',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
    description: 'AI detected hypertension/cholesterol markers. The nutrition plan will limit sodium and saturated fats.'
  },
  normal: {
    label: '✅ Normal',
    value: 'normal',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.3)',
    description: 'No significant abnormal markers detected. You\'ll receive a balanced nutrition plan.'
  }
};

function getConditionInfo(condition) {
  return CONDITION_INFO[condition] || CONDITION_INFO.normal;
}

function formatMarkersHTML(markers) {
  const entries = Object.entries(markers);
  if (entries.length === 0) return '<span style="color:var(--text-muted)">No numeric values extracted</span>';

  const labels = {
    glucose: 'Blood Glucose', hba1c: 'HbA1c',
    systolic: 'Systolic BP', diastolic: 'Diastolic BP',
    cholesterol: 'Total Cholesterol', ldl: 'LDL', hdl: 'HDL'
  };

  const units = {
    glucose: 'mg/dL', hba1c: '%',
    systolic: 'mmHg', diastolic: 'mmHg',
    cholesterol: 'mg/dL', ldl: 'mg/dL', hdl: 'mg/dL'
  };

  return entries.map(([k, v]) =>
    `<div class="extracted-marker">
      <span class="marker-name">${labels[k] || k}</span>
      <span class="marker-value">${v} ${units[k] || ''}</span>
    </div>`
  ).join('');
}

// ─── EXPORTS (module pattern) ─────────────────────────────────────────────────
window.ReportParser = {
  parseReport,
  getConditionInfo,
  formatMarkersHTML
};

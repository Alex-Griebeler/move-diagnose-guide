// ============================================
// Clinical Validation Metrics
// Confusion matrix, kappa, sensitivity, specificity, F1, ICC
// ============================================

// ============================================
// Binary Confusion Matrix
// ============================================

export interface ConfusionMatrix {
  tp: number; // true positives
  fp: number; // false positives
  fn: number; // false negatives
  tn: number; // true negatives
}

export interface ValidationMetrics {
  accuracy: number;
  sensitivity: number;   // recall / true positive rate
  specificity: number;   // true negative rate
  precision: number;     // positive predictive value
  npv: number;           // negative predictive value
  f1: number;
  balancedAccuracy: number;
  kappa: number;
}

/**
 * Build a binary confusion matrix from two sets of IDs against a universe of all possible IDs.
 */
export function deriveBinaryObservations(
  universe: string[],
  predictedIds: string[],
  referenceIds: string[]
): ConfusionMatrix {
  const predictedSet = new Set(predictedIds);
  const referenceSet = new Set(referenceIds);

  let tp = 0, fp = 0, fn = 0, tn = 0;

  for (const id of universe) {
    const predicted = predictedSet.has(id);
    const reference = referenceSet.has(id);
    if (predicted && reference) tp++;
    else if (predicted && !reference) fp++;
    else if (!predicted && reference) fn++;
    else tn++;
  }

  return { tp, fp, fn, tn };
}

/**
 * Compute all validation metrics from a confusion matrix.
 */
export function computeValidationMetrics(cm: ConfusionMatrix): ValidationMetrics {
  const { tp, fp, fn, tn } = cm;
  const total = tp + fp + fn + tn;

  const accuracy = total > 0 ? (tp + tn) / total : 0;
  const sensitivity = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  const specificity = (tn + fp) > 0 ? tn / (tn + fp) : 0;
  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  const npv = (tn + fn) > 0 ? tn / (tn + fn) : 0;
  const f1 = (precision + sensitivity) > 0
    ? 2 * (precision * sensitivity) / (precision + sensitivity)
    : 0;
  const balancedAccuracy = (sensitivity + specificity) / 2;

  // Cohen's Kappa
  const kappa = computeCohenKappa(cm);

  return {
    accuracy: round4(accuracy),
    sensitivity: round4(sensitivity),
    specificity: round4(specificity),
    precision: round4(precision),
    npv: round4(npv),
    f1: round4(f1),
    balancedAccuracy: round4(balancedAccuracy),
    kappa: round4(kappa),
  };
}

/**
 * Cohen's Kappa for binary confusion matrix.
 */
export function computeCohenKappa(cm: ConfusionMatrix): number {
  const { tp, fp, fn, tn } = cm;
  const total = tp + fp + fn + tn;
  if (total === 0) return 0;

  const po = (tp + tn) / total; // observed agreement
  const pYes = ((tp + fp) / total) * ((tp + fn) / total);
  const pNo = ((tn + fn) / total) * ((tn + fp) / total);
  const pe = pYes + pNo; // expected agreement

  if (pe >= 1) return 1;
  return (po - pe) / (1 - pe);
}

/**
 * Intraclass Correlation Coefficient (ICC) — Two-way random, single measures, absolute agreement (ICC(2,1)).
 * Simplified for two raters with paired measurements.
 */
export function computeIntraclassCorrelation(raterA: number[], raterB: number[]): number {
  const n = Math.min(raterA.length, raterB.length);
  if (n < 2) return 0;

  const k = 2; // two raters
  const means: number[] = [];
  let grandSum = 0;

  for (let i = 0; i < n; i++) {
    const m = (raterA[i] + raterB[i]) / k;
    means.push(m);
    grandSum += raterA[i] + raterB[i];
  }

  const grandMean = grandSum / (n * k);

  // Between-subjects sum of squares
  let bms = 0;
  for (let i = 0; i < n; i++) {
    bms += (means[i] - grandMean) ** 2;
  }
  bms = (k * bms) / (n - 1);

  // Within-subjects sum of squares
  let wms = 0;
  for (let i = 0; i < n; i++) {
    wms += (raterA[i] - means[i]) ** 2 + (raterB[i] - means[i]) ** 2;
  }
  wms = wms / (n * (k - 1));

  // Between-raters sum of squares
  const raterMeanA = raterA.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const raterMeanB = raterB.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let jms = n * ((raterMeanA - grandMean) ** 2 + (raterMeanB - grandMean) ** 2) / (k - 1);

  // ICC(2,1) = (BMS - WMS) / (BMS + (k-1)*WMS + k*(JMS - WMS)/n)
  const denominator = bms + (k - 1) * wms + (k * (jms - wms)) / n;
  if (denominator <= 0) return 0;

  return round4((bms - wms) / denominator);
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

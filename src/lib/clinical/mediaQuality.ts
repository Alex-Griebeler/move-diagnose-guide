// ============================================
// Media Quality Assessment
// Análise client-side via Canvas API
// v3 — Dynamic scoreWeights from config
// ============================================

import { getClinicalThresholds } from './clinicalThresholds';
import { QUALITY_ISSUE_LABELS } from './clinicalThresholds';
import type { QualityResult, QualityIssue, QualityMetrics } from './types';

/**
 * Assess media quality from an image element, video element, or ImageBitmap.
 * Uses Canvas API to extract pixel data and compute quality metrics.
 */
export function assessMediaQuality(
  source: HTMLImageElement | HTMLVideoElement | ImageBitmap
): QualityResult {
  const config = getClinicalThresholds();
  const thresholds = config.mediaQuality;
  const weights = config.scoreWeights;

  // Get source dimensions
  const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

  // Downsample for performance (max 320px wide for analysis)
  const maxAnalysisWidth = 320;
  const scale = Math.min(1, maxAnalysisWidth / sourceWidth);
  const analysisWidth = Math.round(sourceWidth * scale);
  const analysisHeight = Math.round(sourceHeight * scale);

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = analysisWidth;
  canvas.height = analysisHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return {
      passed: false,
      score: 0,
      issues: [{ code: 'low_resolution', label: 'Erro ao processar imagem', value: 0, threshold: 0 }],
      metrics: { brightness: 0, contrast: 0, sharpness: 0, width: sourceWidth, height: sourceHeight },
    };
  }

  ctx.drawImage(source, 0, 0, analysisWidth, analysisHeight);
  const imageData = ctx.getImageData(0, 0, analysisWidth, analysisHeight);
  const pixels = imageData.data;
  const totalPixels = analysisWidth * analysisHeight;

  // Convert to grayscale luminance array
  const luminance = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    luminance[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // 1. Brightness: average luminance
  let sumLum = 0;
  for (let i = 0; i < totalPixels; i++) {
    sumLum += luminance[i];
  }
  const brightness = sumLum / totalPixels;

  // 2. Contrast: RMS contrast
  let sumSqDiff = 0;
  for (let i = 0; i < totalPixels; i++) {
    const diff = luminance[i] - brightness;
    sumSqDiff += diff * diff;
  }
  const contrast = Math.sqrt(sumSqDiff / totalPixels);

  // 3. Sharpness: Laplacian variance
  const sharpness = computeLaplacianVariance(luminance, analysisWidth, analysisHeight);

  const metrics: QualityMetrics = {
    brightness: Math.round(brightness * 100) / 100,
    contrast: Math.round(contrast * 100) / 100,
    sharpness: Math.round(sharpness * 100) / 100,
    width: sourceWidth,
    height: sourceHeight,
  };

  // Evaluate against thresholds
  const issues: QualityIssue[] = [];

  if (brightness < thresholds.minBrightness) {
    issues.push({ code: 'low_brightness', label: QUALITY_ISSUE_LABELS.low_brightness, value: brightness, threshold: thresholds.minBrightness });
  }
  if (brightness > thresholds.maxBrightness) {
    issues.push({ code: 'high_brightness', label: QUALITY_ISSUE_LABELS.high_brightness, value: brightness, threshold: thresholds.maxBrightness });
  }
  if (contrast < thresholds.minContrast) {
    issues.push({ code: 'low_contrast', label: QUALITY_ISSUE_LABELS.low_contrast, value: contrast, threshold: thresholds.minContrast });
  }
  if (sharpness < thresholds.minSharpness) {
    issues.push({ code: 'low_sharpness', label: QUALITY_ISSUE_LABELS.low_sharpness, value: sharpness, threshold: thresholds.minSharpness });
  }
  if (sourceWidth < thresholds.minResolution.width || sourceHeight < thresholds.minResolution.height) {
    issues.push({ code: 'low_resolution', label: QUALITY_ISSUE_LABELS.low_resolution, value: Math.min(sourceWidth, sourceHeight), threshold: Math.min(thresholds.minResolution.width, thresholds.minResolution.height) });
  }

  const passed = issues.length === 0;

  // Composite score: dynamic weights from config (meeting threshold = 1.0)
  const brightnessScore = clamp01(
    brightness >= thresholds.minBrightness && brightness <= thresholds.maxBrightness
      ? 1
      : brightness < thresholds.minBrightness
        ? brightness / thresholds.minBrightness
        : thresholds.maxBrightness / brightness
  );
  const contrastScore = clamp01(contrast / thresholds.minContrast);
  const sharpnessScore = clamp01(sharpness / thresholds.minSharpness);
  const resolutionScore = clamp01(
    Math.min(sourceWidth / thresholds.minResolution.width, sourceHeight / thresholds.minResolution.height)
  );

  const score = Math.round(
    (brightnessScore * weights.brightness +
     contrastScore * weights.contrast +
     sharpnessScore * weights.sharpness +
     resolutionScore * weights.resolution) * 100
  ) / 100;

  return { passed, score, issues, metrics };
}

/**
 * Extract a quality-assessable frame from a video URL.
 */
export async function extractFrameForQuality(videoUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => { video.currentTime = video.duration / 2; };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
      ctx.drawImage(video, 0, 0);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Frame extraction failed'));
      img.src = canvas.toDataURL('image/jpeg', 0.9);
    };
    video.onerror = () => reject(new Error('Video load failed'));
    video.load();
  });
}

// ============================================
// Internal Helpers
// ============================================

function computeLaplacianVariance(luminance: Float32Array, width: number, height: number): number {
  let sumLap = 0;
  let sumLapSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap = 4 * luminance[idx] - luminance[idx - 1] - luminance[idx + 1] - luminance[idx - width] - luminance[idx + width];
      sumLap += lap;
      sumLapSq += lap * lap;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sumLap / count;
  return Math.max(0, sumLapSq / count - mean * mean);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// ============================================
// Global Test Utilities
// Centralized helper functions for test processing
// ============================================

/**
 * Determine test type from test name string
 */
export function getTestTypeFromName(testName: string): 'ohs' | 'sls' | 'pushup' {
  const name = testName.toLowerCase();
  if (name.includes('overhead') || name.includes('ohs')) return 'ohs';
  if (name.includes('single') || name.includes('sls')) return 'sls';
  if (name.includes('push')) return 'pushup';
  return 'ohs';
}

/**
 * Determine view type from database column name
 */
export function getViewFromColumn(column: string): string {
  if (column.includes('anterior')) return 'anterior';
  if (column.includes('lateral')) return 'lateral';
  if (column.includes('posterior')) return 'posterior';
  if (column.includes('left')) return 'left';
  if (column.includes('right')) return 'right';
  return column;
}

/**
 * Get side from column name
 */
export function getSideFromColumn(column: string): 'left' | 'right' | undefined {
  if (column.includes('left')) return 'left';
  if (column.includes('right')) return 'right';
  return undefined;
}

/**
 * Get all view columns to check for global test results
 */
export function getViewColumns(): string[] {
  return ['anterior_view', 'lateral_view', 'posterior_view', 'left_side', 'right_side'];
}

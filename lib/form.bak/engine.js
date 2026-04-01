import { buildConstraint, evaluateExpression, evaluateField } from './validation';

// Add a weakmap to cache results and prevent infinite recursion
const evaluationCache = new WeakMap();

/**
 * Determine if a field should be visible (relevant)
 */
export function isFieldRelevant(field, formData) {
  if (!field.relevant) return true;

  // Add recursion prevention
  const cacheKey = { field, formData };
  if (evaluationCache.has(cacheKey)) {
    return evaluationCache.get(cacheKey);
  }

  try {
    const result = evaluateField('relevant', field, formData);
    evaluationCache.set(cacheKey, result);

    // Clear cache after a short delay to prevent memory buildup
    setTimeout(() => {
      evaluationCache.delete(cacheKey);
    }, 100);

    return result;
  } catch (e) {
    console.warn('Relevant evaluation error:', field.name, e);
    evaluationCache.set(cacheKey, true);
    return true;
  }
}

/**
 * Returns visible choices after applying:
 * - choice_filter
 * - option constraint
 */
export function getAvailableChoices(element, formData, currentSelections = null) {
  if (!element?.options) return [];

  // Add recursion depth limit
  let result = [];

  try {
    result = element.options.filter(option => {
      if (!option) return false;

      const passChoiceFilter = evaluateChoiceFilter(element, option, formData, currentSelections);
      if (!passChoiceFilter) return false;

      const passConstraint = evaluateOptionConstraint(element, option, formData, currentSelections);
      if (!passConstraint) return false;

      return true;
    });
  } catch (error) {
    console.error('Error in getAvailableChoices:', error);
    return [];
  }

  return result;
}

/**
 * Convert select_multiple values to ODK-style space-separated string
 */
export function serializeMultiSelect(values) {
  if (!values) return '';
  if (Array.isArray(values)) {
    return values.join(' ');
  }
  return String(values);
}

/**
 * Convert stored value to array for UI
 */
export function deserializeMultiSelect(value) {
  try {
    if (!value) return [];

    if (Array.isArray(value)) return value;

    if (typeof value === 'string') {
      if (value.trim() === '') return [];
      return value.split(/\s+/).filter(Boolean);
    }

    return [String(value)];
  } catch (e) {
    console.error('Error in deserializeMultiSelect:', e, 'value:', value);
    return [];
  }
}

// FIXED: Add recursion prevention and better error handling
function evaluateChoiceFilter(element, option, formData, currentSelections, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) {
    console.warn('Max recursion depth reached in evaluateChoiceFilter');
    return true;
  }

  if (!element?.choice_filter) return true;

  try {
    // Clone formData to prevent mutations
    const context = {
      ...(formData || {}),
      _current_selections: currentSelections,
      _candidate_option: option?.name
    };

    const constraint = buildConstraint(option, element.choice_filter);
    if (!constraint) return true;

    const result = evaluateExpression(constraint, context, element.name);
    return result !== false;
  } catch (e) {
    console.warn('Choice filter error:', element?.name, e);
    return true;
  }
}

function evaluateOptionConstraint(element, option, formData, currentSelections, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) {
    console.warn('Max recursion depth reached in evaluateOptionConstraint');
    return true;
  }

  if (!element?.constraint) return true;

  try {
    const context = {
      ...(formData || {}),
      _current_selections: currentSelections,
      _candidate_option: option?.name
    };

    const result = evaluateExpression(element.constraint, context, element.name);
    return result !== false;
  } catch (e) {
    console.warn('Option constraint error:', element?.name, e);
    return true;
  }
}

export function toggleMultiSelect(currentValues, optionValue) {
  if (!optionValue) return currentValues;

  try {
    const values = Array.isArray(currentValues) ? [...currentValues] : [];

    if (values.includes(optionValue)) {
      return values.filter(v => v !== optionValue);
    }
    values.push(optionValue);
    return values;
  } catch (error) {
    console.error('Error in toggleMultiSelect:', error);
    return currentValues;
  }
}
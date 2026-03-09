import { evaluateExpression, buildConstraint, evaluateField } from './validation';

/**
 * Determine if a field should be visible (relevant)
 */
export function isFieldRelevant(field, formData) {
  if (!field.relevant) return true;

  try {
    return evaluateField('relevant', field, formData);
  } catch (e) {
    console.warn('Relevant evaluation error:', field.name, e);
    return true;
  }
}

/**
 * Determine if an option passes choice_filter
 */
function evaluateChoiceFilter(element, option, formData) {
  if (!element.choice_filter) return true;

  try {
    const tmpData = {
      ...formData,
      [element.name]: option.name
    };

    const constraint = buildConstraint(option, element.choice_filter);

    if (!constraint) return true;

    return evaluateExpression(constraint, tmpData, element.name) !== false;
  } catch (e) {
    console.warn('Choice filter error:', element.name, e);
    return true;
  }
}

/**
 * Determine if an option passes option-level constraint
 */
function evaluateOptionConstraint(element, option, formData) {
  if (!element.constraint) return true;

  try {
    const tmpData = {
      ...formData,
      [element.name]: option.name
    };

    return evaluateExpression(element.constraint, tmpData, element.name) !== false;
  } catch (e) {
    console.warn('Option constraint error:', element.name, e);
    return true;
  }
}

/**
 * Returns visible choices after applying:
 * - choice_filter
 * - option constraint
 */
export function getAvailableChoices(element, formData) {
  if (!element.options) return [];

  return element.options.filter(option => {

    const passChoiceFilter = evaluateChoiceFilter(element, option, formData);

    if (!passChoiceFilter) return false;

    const passConstraint = evaluateOptionConstraint(element, option, formData);

    if (!passConstraint) return false;

    return true;
  });
}

/**
 * Convert select_multiple values to ODK-style space-separated string
 */
export function serializeMultiSelect(values) {
  if (!values) return '';
  if (Array.isArray(values)) {
    return values.join(' ');
  }
  return values;
}

/**
 * Convert stored value to array for UI
 */
export function deserializeMultiSelect(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(/\s+/).filter(Boolean);
  }
  return [];
}

/**
 * Toggle value for select_multiple
 */
export function toggleMultiSelect(currentValues, optionValue) {
  const values = deserializeMultiSelect(currentValues);

  if (values.includes(optionValue)) {
    return values.filter(v => v !== optionValue);
  }

  return [...values, optionValue];
}
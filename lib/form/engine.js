import { buildConstraint, evaluateExpression, evaluateField } from './validation';


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
  try {
    if (!value) return [];

    if (Array.isArray(value)) return value;

    if (typeof value === 'string') {
      // Handle empty string
      if (value.trim() === '') return [];
      return value.split(/\s+/).filter(Boolean);
    }

    // Handle other types (number, boolean, etc)
    return [String(value)];
  } catch (e) {
    console.error('Error in deserializeMultiSelect:', e, 'value:', value);
    return [];
  }
}



















// Fix in engine.js


function evaluateChoiceFilter(element, option, formData, currentSelections) {
  if (!element?.choice_filter) return true;

  try {
    // Instead, evaluate the filter without modifying formData
    const constraint = buildConstraint(option, element.choice_filter);
    if (!constraint) return true;

    //console.log('evaluate choice filter constraint', constraint)

    // Pass current selections as context without modifying formData
    return evaluateExpression(constraint, {
      ...formData,
      _current_selections: currentSelections,
      _candidate_option: option.name
    }, element.name) !== false;
  } catch (e) {
    console.warn('Choice filter error:', element?.name, e);
    return true;
  }
}

function evaluateOptionConstraint(element, option, formData, currentSelections) {
  if (!element?.constraint) return true;

  try {
    // Same fix here - don't modify formData
    return evaluateExpression(element.constraint, {
      ...formData,
      _current_selections: currentSelections,
      _candidate_option: option.name
    }, element.name) !== false;
  } catch (e) {
    console.warn('Option constraint error:', element?.name, e);
    return true;
  }
}






























































































// In engine.js - Fixed version using buildConstraint



export function toggleMultiSelect(currentValues, optionValue) {
  if (!optionValue) return currentValues;
  const values = Array.isArray(currentValues) ? [...currentValues] : [];

  if (values.includes(optionValue)) {
    return values.filter(v => v !== optionValue);
  }
  values.push(optionValue);
  return values;
}
import { all, create } from 'mathjs';
import { getLabel } from '../../lib/form/utils';

const math = create(all);

// Custom operator for 'div'
math.import({
  div: function (a, b) {
    return b !== 0 ? a / b : 0; // Avoid division by zero
  },
});


export function recursiveJSONParse(input, maxDepth = 5) {
  let depth = 0;
  let current = input;

  while (typeof current === 'string' && depth < maxDepth) {
    try {
      current = JSON.parse(current);
      depth += 1;
    } catch (e) {
      // Return the last successful parse if failed mid-way
      break;
    }
  }

  return current;
}
/**
 * Calculate the area of a geographic polygon in square meters.
 * @param {Array} polygon - An array of [longitude, latitude] coordinates forming the polygon.
 * @returns {number} - The area of the polygon in square meters.
 */
export function calculatePolygonArea(polygon) {
  try {
    // Clean the input string by removing outer quotes if present
    let cleanInput = typeof polygon === 'string'
      ? polygon.replace(/^['"]|['"]$/g, '').trim()
      : polygon;

    // Parse the JSON if it's a string
    let npol = typeof cleanInput === 'string' ? recursiveJSONParse(cleanInput) : cleanInput;
    if (!Array.isArray(npol)) {
      //console.log('Polygon data is not an array:', npol);
      return 0;
    }

    // Convert the object format to array format expected by the calculation
    let coordinates = npol.map(point => [point.longitude, point.latitude]);

    //console.log('calculatePolygonArea coordinates:', coordinates);

    if (coordinates.length < 3) {
      //console.log('A polygon must have at least three points.');
      return 0;
    }

    const R = 6378137; // Earth's radius in meters (WGS84)
    let total = 0;

    for (let i = 0; i < coordinates.length; i++) {
      const [lon1, lat1] = coordinates[i];
      const [lon2, lat2] = coordinates[(i + 1) % coordinates.length]; // Wrap to the first point

      // Convert degrees to radians
      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

      // Calculate the area using spherical excess
      total += deltaLambda * (2 + Math.sin(phi1) + Math.sin(phi2));
    }

    // Final area calculation
    const area = Math.abs((total * R * R) / 2); // Ensure the area is positive

    // Convert to hectares (1 hectare = 10000 square meters)
    const areaInHectares = area

    //console.log('Area calculated:', area, 'heactares');
    return areaInHectares; // Return with 4 decimal places

  } catch (e) {
    //console.log('error calculating polygon area:', e, '\nInput:', polygon);
    return 0;
  }
}


const customFunctions = {
  // Selection functions
  selected: (fieldValue, value) => {

    const cleanValue = typeof value === 'string' ? value.replace(/^'|'$/g, '') : value;

    let tmp = fieldValue
    if (typeof fieldValue !== 'string') recursiveJSONParse(fieldValue, 5)
    if (typeof tmp === 'string') tmp = tmp.split(',')

    return Array.isArray(tmp) ? tmp.includes(cleanValue) : false

  },

  'count-selected': (fieldValue) => {
    // console.log('count selected', fieldValue)
    let tmp = fieldValue
    if (typeof fieldValue !== 'string') recursiveJSONParse(fieldValue, 5)
    if (typeof tmp === 'string') tmp = tmp.split(',')
    return tmp.length || 0
  },

  'string-length': (fieldValue) => {
    if (fieldValue == null) return 0;
    return String(fieldValue).length;
  },

  not: (value) => {
    let tmp;
    if (typeof value === 'string') {
      // If it's still a string, it's an expression. Use math.evaluate to parse it.
      tmp = math.evaluate(value);
    } else {
      tmp = value;
    }
    return !tmp;
  },

  and: (...args) => args.every(arg => Boolean(arg)),

  or: (...args) => args.some(arg => Boolean(arg)),

  if: (condition, trueValue, falseValue) => condition ? trueValue : falseValue,

  // String functions
  regex: (fieldValue, pattern) => {
    const regex = new RegExp(pattern.replace(/^'|'$/g, ''));
    return regex.test(fieldValue);
  },

  contains: (str, substring) => {
    if (str == null) return false;
    return String(str).includes(substring);
  },

  startsWith: (str, prefix) => {
    if (str == null) return false;
    return String(str).startsWith(prefix);
  },

  endsWith: (str, suffix) => {
    if (str == null) return false;
    return String(str).endsWith(suffix);
  },

  substring: (str, start, length) => {
    if (str == null) return '';
    const s = Number(start);
    const l = length !== undefined ? Number(length) : undefined;
    return String(str).substr(s, l);
  },

  stringLength: (str) => {
    if (str == null) return 0;
    return String(str).length;
  },

  concat: (...args) => args.join(''),

  normalizeSpace: (str) => {
    if (str == null) return '';
    return String(str).replace(/\s+/g, ' ').trim();
  },

  translate: (str, fromChars, toChars) => {
    if (str == null) return '';
    const from = String(fromChars).split('');
    const to = String(toChars).split('');

    return String(str).split('').map(char => {
      const index = from.indexOf(char);
      return index !== -1 && index < to.length ? to[index] : char;
    }).join('');
  },

  // Date/time functions
  today: () => new Date().toISOString().split('T')[0],

  now: () => new Date().toISOString(),

  date: (dateString) => {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
  },

  dateTime: (dateString) => {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '' : date.toISOString();
  },

  // Numeric functions
  sum: (...args) => args.reduce((total, num) => total + Number(num || 0), 0),

  count: (nodeset) => {
    if (!nodeset) return 0;
    return Array.isArray(nodeset) ? nodeset.length : 1;
  },

  min: (...args) => Math.min(...args.map(Number)),

  max: (...args) => Math.max(...args.map(Number)),

  abs: (num) => Math.abs(Number(num)),

  round: (num) => Math.round(Number(num)),

  floor: (num) => Math.floor(Number(num)),

  ceiling: (num) => Math.ceil(Number(num)),

  // Type conversion
  boolean: (value) => Boolean(value),

  number: (value) => {
    if (value === true) return 1;
    if (value === false) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  },

  string: (value) => String(value),

  // Positional functions
  position: (context) => context?.position ?? 1,

  last: (context) => context?.last ?? 1,

  // Math functions
  pow: (base, exponent) => Math.pow(Number(base), Number(exponent)),

  sqrt: (num) => Math.sqrt(Number(num)),

  random: () => Math.random(),

  // Utility functions
  coalesce: (...args) => args.find(arg => arg != null && arg !== '') || '',

  'decimal-date-time': (dateString) => {
    if (!dateString) return 0;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 0 : date.getTime() / 86400000 + 25569; // Convert to Excel-style date number
  },

  'format-date': (dateString, format) => {
    // Basic implementation - would need to be expanded for full format support
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const pad = num => String(num).padStart(2, '0');

    return format
      .replace(/yyyy/g, date.getFullYear())
      .replace(/MM/g, pad(date.getMonth() + 1))
      .replace(/dd/g, pad(date.getDate()))
      .replace(/HH/g, pad(date.getHours()))
      .replace(/mm/g, pad(date.getMinutes()))
      .replace(/ss/g, pad(date.getSeconds()));
  }
};



export function replaceVariables(expression, formData, currentFieldName) {
  if (!expression) return expression;

  // First handle the special '.' variable which represents the current field value
  let result = expression;
  if (currentFieldName && formData[currentFieldName] !== undefined) {
    const currentValue = formData[currentFieldName];

    // Improved regex to handle cases like .>=0 without requiring whitespace
    result = result.replace(/(^|[^\w])\.(?=$|[^\w]|>=|<=|==|!=|[<>]=?)/g, (match, prefix) => {
      // Preserve any non-word character before the dot
      const prefixChar = prefix || '';

      if (currentValue === null || currentValue === undefined) return `${prefixChar}undefined`;
      if (typeof currentValue === 'number') return `${prefixChar}${currentValue}`;
      if (typeof currentValue === 'boolean') return `${prefixChar}${currentValue ? '1' : '0'}`;
      return `${prefixChar}'${String(currentValue).replace(/'/g, "\\'")}'`;
    });
  }

  // Then handle other variables (${variableName})
  return result.replace(/\${([\w.]+)}/g, (match, fieldName) => {
    // Handle nested properties (e.g., ${group.field})
    const value = fieldName.split('.').reduce((obj, prop) => {
      if (obj && typeof obj === 'object' && prop in obj) {
        return obj[prop];
      }
      return undefined;
    }, formData);

    if (value === undefined || value === null) {
      return 'undefined';
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }

    if (Array.isArray(value)) {
      return `'${JSON.stringify(value).replace(/'/g, "\\'")}'`;
    }

    const escapedString = String(value).replace(/'/g, "\\'");
    return `'${escapedString}'`;
  });
}

export function evaluateCustomFunctions(expression, formData, currentFieldName) {
  if (!expression) return expression;

  // This regex matches function calls, including nested ones
  const functionRegex = /([a-zA-Z_][\w-]*)\(((?:[^()]|\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\))*)\)/g;

  // First evaluate inner-most functions and work outward
  let result = expression;
  let changed;
  let iterations = 0;
  const maxIterations = 50; // Prevent infinite recursion

  do {
    changed = false;
    result = result.replace(functionRegex, (match, funcName, args) => {

      //console.log('match', match, 'funcName', funcName, 'args', args, JSON.stringify(formData, null, 3));

      if (!customFunctions[funcName]) {
        console.warn(`Unknown function: ${funcName}`);
        return match; // Leave unknown functions as-is
      }

      changed = true;

      // Process arguments recursively
      const processedArgs = [];
      let currentArg = '';
      let parenDepth = 0;

      for (let i = 0; i < args.length; i++) {
        const char = args[i];

        if (char === '(') {
          parenDepth++;
          currentArg += char;
        } else if (char === ')') {
          parenDepth--;
          currentArg += char;
        } else if (char === ',' && parenDepth === 0) {
          // Found an argument separator at top level
          processedArgs.push(currentArg.trim());
          currentArg = '';
        } else {
          currentArg += char;
        }
      }

      if (currentArg) {
        processedArgs.push(currentArg.trim());
      }

      // Evaluate each argument (which might contain nested functions or variables)

      const evaluatedArgs = processedArgs.map(arg => {
        // First evaluate any nested functions in the argument
        let evaluated = evaluateCustomFunctions(arg, formData, currentFieldName);
        //console.log('evaluated func', arg, evaluated, currentFieldName);
        // Then replace any variables in the argument
        evaluated = replaceVariables(evaluated, formData, currentFieldName);
        //console.log('evaluated and replace var', arg, evaluated, currentFieldName);

        evaluated = normalizeExpression(evaluated)

        // 3. Evaluate the argument string using a safe JS environment
        try {
          const context = {
            ...formData,
            true: true,
            false: false
          };

          if (!evaluated.trim()) return true;

          const evaluator = new Function(
            'context',
            `return (function() {
                  const { ${Object.keys(context).join(', ')} } = context;
                  return ${evaluated};
                })();`
          );

          // Return the evaluated result (should be a boolean, number, or string)
          return evaluator(context);

        } catch (e) {
          // If evaluation fails (e.g., if it's a simple unquoted string literal), 
          // return the string itself to be handled below.
          console.warn(`Failed to fully evaluate argument '${arg}' in custom function:`, e);

        }











        // Handle quoted strings
        if (evaluated.match(/^'.*'$/)) {
          return evaluated.slice(1, -1); // Remove quotes
        }

        // Handle boolean literals
        if (evaluated === 'true') return true;
        if (evaluated === 'false') return false;

        // Handle numbers
        if (!isNaN(evaluated)) {
          return Number(evaluated);
        }
        // Handle undefined/null
        if (evaluated === 'undefined' || evaluated === 'null') {
          return undefined;
        }

        return evaluated;
      });

      try {
        // Evaluate the function
        //console.log('custom func', funcName, evaluatedArgs);
        const funcResult = customFunctions[funcName](...evaluatedArgs);
        //console.log('custom func', funcName, funcResult, evaluatedArgs);

        // Convert result to appropriate string representation
        if (funcResult === true) return '1';
        if (funcResult === false) return '0';
        if (funcResult === undefined || funcResult === null) return 'undefined';
        if (typeof funcResult === 'number') return String(funcResult);
        if (typeof funcResult === 'string') return `'${funcResult.replace(/'/g, "\\'")}'`;
        return `'${JSON.stringify(funcResult).replace(/'/g, "\\'")}'`;
      } catch (error) {
        console.error(`Error executing ${funcName}:`, error);
        return '0';
      }
    });

    if (iterations++ > maxIterations) {
      console.error('Max iterations reached in evaluateCustomFunctions');
      break;
    }
  } while (changed);

  return result;
}


export function evaluateExpression(expression, formData, currentFieldName) {

  if (!expression) return true;

  const field = {}
  field.name = currentFieldName;
  field.constraint = expression;
  const eva = evaluateField('constraint', field, formData);
  return eva
}

function normalizeExpression(expression) {

  let parsedExpression = expression
    .replace(/(?<![\=\>\<\!])\s*=\s*(?![\=\>\<\!])/g, ' == ') // Replace = with ==
    .replace(/\band\b/g, ' && ') // Convert and to &&
    .replace(/\bor\b/g, ' || ') // Convert or to ||
    .replace(/\bnot\s+/g, '!') // Convert not to !
    .replace(/div/g, '/') // Replace XPath div with /
    .replace(/\bmod\b/g, '%'); // Replace XPath mod with %

  // Handle undefined values to prevent evaluation errors
  parsedExpression = parsedExpression.replace(/undefined/g, 'null');
  return parsedExpression
}


export function evaluateField(type, field, formData) {

  const expression = field && field[type];

  if (type === 'constraint' && (formData[field.name] === '' || formData[field.name] === undefined)) return true

  if (!expression) return true;

  try {
    // Step 1: Evaluate custom functions (which may contain variables)
    let parsedExpression = evaluateCustomFunctions(expression, formData, field.name);
    // Step 2: Replace variables (including the special '.' variable)
    parsedExpression = replaceVariables(parsedExpression, formData, field.name);

    // Step 3: Normalize expression for evaluation - 
    parsedExpression = normalizeExpression(parsedExpression)

    // Special case: simple equality check (common pattern)
    const simpleEqualityMatch = parsedExpression.match(/^'([^']*)'\s*==\s*'([^']*)'$/);
    if (simpleEqualityMatch) {
      return simpleEqualityMatch[1] === simpleEqualityMatch[2];
    }

    // Step 4: Evaluate the expression
    const context = {
      ...formData,
      true: true,
      false: false
    };

    // Handle empty/undefined expressions
    if (!parsedExpression.trim()) return true;

    // Use Function constructor for evaluation
    try {
      const evaluator = new Function(
        'context',
        `return (function() {
          const { ${Object.keys(context).join(', ')} } = context;
          return ${parsedExpression};
        })();`
      );
      const result = evaluator(context);
      return type === 'calculation' ? result : Boolean(result);
    } catch (e) {
      // Fallback to simpler evaluation for basic expressions
      console.log('Function evaluation error:', field.name, e, 'Expression:', parsedExpression);
      try {
        // For simple comparisons, handle them manually
        if (parsedExpression.includes('>=') || parsedExpression.includes('<=') ||
          parsedExpression.includes('>') || parsedExpression.includes('<') ||
          parsedExpression.includes('==') || parsedExpression.includes('!=')) {
          return evaluateSimpleComparison(parsedExpression, context);
        }
        return true; // Default to true for complex failed expressions
      } catch (mathError) {
        console.log('Evaluation error:', field.name, mathError, 'Expression:', parsedExpression);
        return true; // Default to true if evaluation fails
      }
    }
  } catch (error) {
    console.error('evaluateRelevant error:', error, 'Expression:', expression);
    return true;
  }
}

// Helper function for simple comparisons
function evaluateSimpleComparison(expression, context) {
  const comparisons = expression.split(/\s+(&&|\|\|)\s+/);

  let result = true;
  let currentOperator = null;

  for (const part of comparisons) {
    if (part === '&&' || part === '||') {
      currentOperator = part;
      continue;
    }

    let partResult = false;

    // Handle basic comparison operators
    if (part.includes('>=')) {
      const [left, right] = part.split('>=').map(s => s.trim());
      const leftVal = getValue(left, context);
      const rightVal = getValue(right, context);
      partResult = leftVal >= rightVal;
    } else if (part.includes('<=')) {
      const [left, right] = part.split('<=').map(s => s.trim());
      const leftVal = getValue(left, context);
      const rightVal = getValue(right, context);
      partResult = leftVal <= rightVal;
    } else if (part.includes('>')) {
      const [left, right] = part.split('>').map(s => s.trim());
      const leftVal = getValue(left, context);
      const rightVal = getValue(right, context);
      partResult = leftVal > rightVal;
    } else if (part.includes('<')) {
      const [left, right] = part.split('<').map(s => s.trim());
      const leftVal = getValue(left, context);
      const rightVal = getValue(right, context);
      partResult = leftVal < rightVal;
    } else if (part.includes('==')) {
      const [left, right] = part.split('==').map(s => s.trim());
      const leftVal = getValue(left, context);
      const rightVal = getValue(right, context);
      partResult = leftVal == rightVal;
    } else if (part.includes('!=')) {
      const [left, right] = part.split('!=').map(s => s.trim());
      const leftVal = getValue(left, context);
      const rightVal = getValue(right, context);
      partResult = leftVal != rightVal;
    } else {
      // Simple boolean value
      partResult = Boolean(getValue(part, context));
    }

    if (currentOperator === null) {
      result = partResult;
    } else if (currentOperator === '&&') {
      result = result && partResult;
    } else if (currentOperator === '||') {
      result = result || partResult;
    }
  }

  return result;
}

// Helper function to get values from context or parse literals
function getValue(expression, context) {
  // Handle string literals
  if (expression.startsWith("'") && expression.endsWith("'")) {
    return expression.slice(1, -1);
  }

  // Handle numbers
  if (!isNaN(expression)) {
    return Number(expression);
  }

  // Handle boolean literals
  if (expression === 'true') return true;
  if (expression === 'false') return false;
  if (expression === 'null') return null;
  if (expression === 'undefined') return undefined;

  // Get value from context
  return context[expression];
}

export function validatePage(page, formData) {
  const errors = {};
  let isValid = true;

  page.fields.forEach((fieldGroup) => {
    Object.keys(fieldGroup).forEach((colName) => {
      const element = fieldGroup[colName];
      const value = formData[element.name];
      const isRelevant = element.relevant
        ? evaluateField('relevant', element, formData)
        : true;

      if (!isRelevant) return;

      if (element.required) {
        //console.log('REQUIRED', JSON.stringify(element, null, 5))

        let required_msg = getLabel(element, 'required_message')
        let default_required_msg = getLabel(element, 'label')

        if (element.type === 'select_multiple') {
          if (!Array.isArray(value) || value.length === 0) {
            errors[element.name] = required_msg || `${default_required_msg} requires at least one selection`;
            isValid = false;
            return;
          }
        } else if (element.type === 'geopoint') {
          if (!value || typeof value !== 'object' || !value.latitude || !value.longitude) {
            errors[element.name] = required_msg || `${default_required_msg} is required`;
            isValid = false;
            return;
          }
        } else if (value === undefined || value === '' || value === null) {
          errors[element.name] = required_msg || `${default_required_msg} is required`;
          isValid = false;
          return;
        }
      }

      if (element.constraint) {
        try {


          let constraint_msg = getLabel(element, 'constraint_message')
          let default_constraint_msg = getLabel(element, 'label')

          const result = evaluateField('constraint', element, formData);
          //console.log('constraint result', element.name, result)
          if (!result) {
            errors[element.name] = constraint_msg || `Invalid ${default_constraint_msg}`;
            isValid = false;
          }
        } catch {
          errors[element.name] = element.constraint_message || `Invalid ${element.label}`;
          isValid = false;
        }
      }
    });
  });

  return { isValid, errors };
}


//export default { evaluateRelevant, calculateField, validatePage };
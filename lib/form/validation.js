
import { getLabel } from '../../lib/form/utils';





const evaluatorCache = new Map();
let cacheSize = 0;
const MAX_CACHE_SIZE = 100;

// Add this function to clear cache when needed
export function clearEvaluationCache() {
  console.log(`🧹 Clearing evaluation cache (${evaluatorCache.size} entries)`);
  evaluatorCache.clear();
  cacheSize = 0;
}


export const buildConstraint = (options, filterString) => {
  const expressions = filterString.split(/\s+or\s+/i);

  const processedExpressions = expressions.map(expression => {

    // -------- HANDLE selected(filter_x, ${value}) ----------
    const selectedMatch = expression.match(
      /^selected\(\s*(\w+)\s*,\s*([^)]+)\)/
    );

    if (selectedMatch) {
      const key = selectedMatch[1];
      const value = selectedMatch[2];

      if (options.hasOwnProperty(key)) {
        const optionValue = options[key];

        if (!optionValue) return '';

        // convert "a b c" → ['a','b','c']
        const values = optionValue.split(/\s+/);

        const conditions = values.map(v => `${value} = '${v}'`);

        return `(${conditions.join(' or ')})`;
      }
    }

    // -------- HANDLE filter_x = something ----------
    const match = expression.match(
      /^(\w+)\s*=\s*('[^']*'|"[^"]*"|\$\{[^}]+\}|\d+|[^\s\)]+)/
    );

    if (match) {
      const key = match[1];
      const rightValue = match[2];

      if (options.hasOwnProperty(key)) {
        if (options[key] === null) {
          return '';
        }

        let leftValue =
          typeof options[key] === "string"
            ? `'${options[key]}'`
            : options[key];

        return `${leftValue} = ${rightValue}`;
      }
    }

    return expression;
  });

  return processedExpressions
    .filter(expr => expr !== '')
    .join(' or ');
};

export const buildConstraint1 = (options, filterString) => {
  // First, split by 'or' to handle each expression separately
  const expressions = filterString.split(/\s+or\s+/i);

  const processedExpressions = expressions.map(expression => {
    // Enhanced pattern to match numbers without quotes
    const match = expression.match(/^(\w+)\s*=\s*('[^']*'|"[^"]*"|\$\{[^}]+\}|\d+|[^\s\)]+)/);

    if (match) {
      const key = match[1];
      const rightValue = match[2];

      // Check if key exists in options
      if (options.hasOwnProperty(key)) {
        if (options[key] === null) {
          // Return empty string for null values (will be filtered out)
          return '';
        } else {
          // Handle different value types for left side
          let leftValue;
          if (typeof options[key] === 'string') {
            leftValue = `'${options[key]}'`;
          } else {
            leftValue = options[key];
          }
          return `${leftValue} = ${rightValue}`;
        }
      }
    }

    // Return original expression if no match or key not found
    return expression;
  });

  // Filter out empty expressions and join with 'or'
  const result = processedExpressions
    .filter(expr => expr !== '')
    .join(' or ');

  return result;
};

// Helper function to process a single condition
export const processSingleCondition = (condition) => {
  if (!condition) {
    return { whereClause: '', whereArgs: [] };
  }

  // Handle different comparison operators: =, !=, <, >, <=, >=
  const operatorMatch = condition.match(/(.*?)\s*(=|!=|<|>|<=|>=)\s*(.*)/);
  if (!operatorMatch) {
    console.warn('Invalid condition format:', condition);
    return { whereClause: '', whereArgs: [] };
  }

  const [, fieldPart, operator, valuePart] = operatorMatch;
  const field = fieldPart.trim();
  let value = valuePart.trim();

  // Remove surrounding quotes if present
  if ((value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith('“') && value.endsWith('“')) ||
    (value.startsWith('’') && value.endsWith('’'))) {
    value = value.slice(1, -1);
  }

  // Check if field starts with 'form_data.'
  if (field.startsWith('form_data.')) {
    const jsonField = field.replace(/^form_data\./, '');
    const whereClause = `LOWER(json_extract(form_data, '$.${jsonField}')) ${operator} LOWER(?)`;
    //const whereClause = `json_extract(REPLACE(form_data, '"', ''), '$.${jsonField}') ${operator} ?`;
    return { whereClause, whereArgs: [value] };
  }

  // For non-JSON fields
  const whereClause = `${field} ${operator} ?`;
  return { whereClause, whereArgs: [value] };
};


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


const customFunctions = {
  // Selection functions
  selected: (fieldValue, value) => {

    const cleanValue = typeof value === 'string' ? value.replace(/^'|'$/g, '') : value;

    // let tmp = fieldValue
    // if (typeof fieldValue !== 'string') tmp = recursiveJSONParse(fieldValue, 5)
    // if (typeof tmp === 'string') tmp = tmp.split(',')

    // return Array.isArray(tmp) ? tmp.includes(cleanValue) : false``

    let tmp = fieldValue;

    if (typeof fieldValue !== 'string') {
      tmp = recursiveJSONParse(fieldValue, 5);
    }

    if (Array.isArray(tmp)) return tmp.includes(cleanValue);

    if (typeof tmp === 'string') {
      tmp = tmp.split(/[,\s]+/);
      return tmp.includes(cleanValue);
    }

    return false;

  },

  'count-selected': (fieldValue) => {


    let tmp = fieldValue;

    if (typeof fieldValue !== 'string') {
      tmp = recursiveJSONParse(fieldValue, 5);
    }

    if (Array.isArray(tmp)) return tmp.length;

    if (typeof tmp === 'string') {
      //return tmp.split(/[,\s]+/).filter(Boolean).length;
      return tmp.split(',').length;
    }

    return 0;

  },

  'string-length': (fieldValue) => {
    if (fieldValue == null) return 0;
    return String(fieldValue).length;
  },

  not: (value) => {
    let tmp;
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



export function replaceVariables1(expression, formData, currentFieldName) {
  if (!expression) return expression;

  // First handle the special '.' variable which represents the current field value
  let result = expression;
  if (currentFieldName && formData[currentFieldName] !== undefined) {
    const currentValue = formData[currentFieldName];

    console.log('replace variables, current value', currentValue)

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
      //return 'undefined';
      return '0';
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

export function replaceVariables(expression, formData, currentFieldName) {
  if (!expression || typeof expression !== 'string') return expression;

  // Helper to safely format values for the expression string
  const getSafeValue = (val) => {
    if (val === undefined || val === null) return 'null';
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    // Wrap strings in quotes and escape internal single quotes
    return `'${String(val).replace(/'/g, "\\'")}'`;
  };

  let result = expression;

  // 1. Replace the standalone dot "." with current field value
  if (currentFieldName) {
    const currentValue = formData[currentFieldName];
    const replacement = getSafeValue(currentValue);

    // Regex Explanation:
    // (^|[^.\w]) -> Start of string OR any char that isn't a dot/word char
    // \.         -> The literal dot
    // (?![0-9])  -> Negative lookahead: Make sure a digit doesn't follow (prevents breaking 0.5)
    result = result.replace(/(^|[^.\w])\.(?![0-9])/g, (match, prefix) => {
      return prefix + replacement;
    });
  }

  // 2. Replace ${var_name} or ${nested.prop}
  result = result.replace(/\${([\w.]+)}/g, (match, path) => {
    // Dig into formData using the path (handles "name" or "user.age")
    const value = path.split('.').reduce((obj, key) =>
      (obj && typeof obj === 'object') ? obj[key] : undefined,
      formData);

    return getSafeValue(value);
  });

  return result;
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
        //console.log('evaluated and replace var', arg, ' ## ', evaluated, ' ## ', currentFieldName);

        evaluated = evaluated
          .replace(/undefined/g, '0')
          .replace(/null/g, '0');

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
        console.log(`Error executing ${funcName}:`, error)
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


// validation.js optimizations



// Update getCachedEvaluator to limit cache size
function getCachedEvaluator(expression, contextKeys) {
  const cacheKey = expression + contextKeys.join(',');

  // Check cache
  if (evaluatorCache.has(cacheKey)) {
    return evaluatorCache.get(cacheKey);
  }

  // Limit cache size
  if (cacheSize >= MAX_CACHE_SIZE) {
    const firstKey = evaluatorCache.keys().next().value;
    evaluatorCache.delete(firstKey);
    cacheSize--;
  }

  // Pre-compile the function once
  const fn = new Function(
    'context',
    `const { ${contextKeys.join(', ')} } = context; return (${expression});`
  );

  evaluatorCache.set(cacheKey, fn);
  cacheSize++;
  return fn;
}


export function evaluateExpression1(expression, formData, currentFieldName) {
  if (!expression || expression === 'true') return true;

  try {
    let parsed = evaluateCustomFunctions(expression, formData, currentFieldName);
    parsed = replaceVariables(parsed, formData, currentFieldName);
    parsed = normalizeExpression(parsed);

    // Filter valid JS keys from formData to avoid syntax errors in destructuring
    const context = { ...formData, true: true, false: false };
    const validKeys = Object.keys(context).filter(k => /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(k));

    const evalFn = getCachedEvaluator(parsed, validKeys);
    return !!evalFn(context);
  } catch (e) {
    return true;
  }
}


export function evaluateExpression(expression, formData, currentFieldName) {
  if (!expression || expression === 'true') return true;

  try {
    let parsed = evaluateCustomFunctions(expression, formData, currentFieldName);
    parsed = replaceVariables(parsed, formData, currentFieldName);
    parsed = normalizeExpression(parsed);

    // 1. FAST PATH: Check for simple equality/literals to skip 'new Function'
    if (parsed === 'true' || parsed === '1') return true;
    if (parsed === 'false' || parsed === '0') return false;

    // 2. CACHED EVALUATION
    const context = { ...formData, true: true, false: false };
    const validKeys = Object.keys(context).filter(k => /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(k)).sort();
    const cacheKey = `${parsed}-${validKeys.join(',')}`;

    let evalFn = evaluatorCache.get(cacheKey);
    if (!evalFn) {
      evalFn = new Function('context', `
        const { ${validKeys.join(', ')} } = context;
        return Boolean(${parsed});
      `);
      evaluatorCache.set(cacheKey, evalFn);
    }

    return evalFn(context);
  } catch (e) {
    return true;
  }
}


export function evaluateExpression3(expression, formData, currentFieldName) {
  if (!expression) return true;

  try {
    // 1. Pre-process the expression
    let parsedExpression = evaluateCustomFunctions(expression, formData, currentFieldName);
    parsedExpression = replaceVariables(parsedExpression, formData, currentFieldName);
    parsedExpression = normalizeExpression(parsedExpression);

    // 2. FAST PATH: Check for simple equality/literal results without new Function()
    // This handles cases like: 'all' == 'all' or 'morogoro' == 'arusha'
    const simpleMatch = parsedExpression.match(/^\s*['"]?([^'"]*)['"]?\s*==\s*['"]?([^'"]*)['"]?\s*$/);
    if (simpleMatch) {
      return simpleMatch[1] === simpleMatch[2];
    }

    // If it's just '1' or '0' after processing
    if (parsedExpression === '1' || parsedExpression === 'true') return true;
    if (parsedExpression === '0' || parsedExpression === 'false') return false;

    // 3. Fallback to Function only if complex logic is needed
    const context = { ...formData, true: true, false: false };
    const contextKeys = Object.keys(context).filter(k => /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(k));


    const evalFn = getCachedEvaluator(parsedExpression, contextKeys);
    return !!evalFn(context);

  } catch (e) {
    return true;
  }
}

// Global stack with cleanup
let evaluationStack = new Set();
export function evaluateField(type, field, formData) {
  const fieldId = `${type}:${field.name}`;
  if (evaluationStack.has(fieldId)) return true;

  evaluationStack.add(fieldId);
  try {
    return evaluateExpression(field[type], formData, field.name);
  } finally {
    evaluationStack.delete(fieldId);
  }
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


export const generateUUID = () => {
  // Use crypto.getRandomValues if available (React Native 0.60+)
  const getRandomValues = (typeof crypto !== 'undefined' && crypto.getRandomValues)
    ? crypto.getRandomValues.bind(crypto)
    : (arr) => {
      // Fallback for environments without crypto.getRandomValues
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    };

  const randomBytes = (size) => {
    const arr = new Uint8Array(size);
    return getRandomValues(arr);
  };

  const hex = (buffer) => {
    return Array.prototype.map.call(buffer, (x) => {
      return ('00' + x.toString(16)).slice(-2);
    }).join('');
  };

  const rnds = randomBytes(16);
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  const uuid = [
    hex(rnds.slice(0, 4)),
    hex(rnds.slice(4, 6)),
    hex(rnds.slice(6, 8)),
    hex(rnds.slice(8, 10)),
    hex(rnds.slice(10, 16))
  ].join('-');

  return uuid;
};



export const getParam = (element, key, defaultValue = null) => {
  if (!element.parameters) return defaultValue;
  const regex = new RegExp(`${key}=([^\\s]+)`);
  const match = element.parameters.match(regex);
  return match ? match[1] : defaultValue;
};

export function validatePage(page, formData, language = '::Default', langList = ['::Default']) {
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

        let required_msg = getLabel(element, 'required_message', language, langList)
        let default_required_msg = getLabel(element, 'label', language, langList)

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
        //console.log('CONSTRAINT', value, JSON.stringify(element, null, 5))

        if (value !== null && value !== undefined && value !== '') {
          //console.log('logic for constraint', value, element.name)
          try {

            let constraint_msg = getLabel(element, 'constraint_message', language, langList)
            let default_constraint_msg = getLabel(element, 'label', language, langList)

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
      }
    });
  });

  return { isValid, errors };
}


//export default { evaluateRelevant, calculateField, validatePage };
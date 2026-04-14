
const MAX_CACHE_SIZE = 100;

const addToCache = (cache, key, value) => {
  if (cache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry (first key)
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, value);
  return value;
};


const expressionCache = new Map();

const compileExpression = (expression) => {
  if (expressionCache.has(expression)) {
    return expressionCache.get(expression);
  }

  const jsExpression = prepareJsExpression(expression);

  // 1. Use a Set to ensure variable names are unique
  const variables = new Set();
  const varRegex = /\${(\w+)}/g;
  let match;
  while ((match = varRegex.exec(expression)) !== null) {
    variables.add(match[1]); // Set automatically handles duplicates
  }

  const validIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  const reservedWords = new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue',
    'default', 'if', 'else', 'import', 'return', 'this', 'var', 'let'
  ]);

  // 2. Build the keys array starting with unique variables
  const keys = Array.from(variables).filter(key =>
    validIdentifier.test(key) && !reservedWords.has(key)
  );

  // 3. Add helper functions, ensuring no overlap with existing keys
  Object.keys(ODK_HELPERS).forEach((key) => {
    if (validIdentifier.test(key) && !reservedWords.has(key) && !variables.has(key)) {
      keys.push(key);
    }
  });

  if (!variables.has('current_value')) {
    keys.push('current_value');
  }

  const fn = new Function(
    ...keys,
    `"use strict"; return (${jsExpression})`
  );

  return addToCache(expressionCache, expression, { fn, keys });
};

const compileExpression1 = (expression) => {
  if (expressionCache.has(expression)) {
    return expressionCache.get(expression);
  }

  const jsExpression = prepareJsExpression(expression);

  // Extract variables from ${var}
  const variables = [];
  const varRegex = /\${(\w+)}/g;
  let match;
  while ((match = varRegex.exec(expression)) !== null) {
    variables.push(match[1]);
  }

  const validIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  const reservedWords = new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue',
    'default', 'if', 'else', 'import', 'return', 'this', 'var', 'let'
  ]);

  // Pre-build static keys (helpers always included)
  const baseContext = { ...ODK_HELPERS };

  const keys = [];
  Object.keys(baseContext).forEach((key) => {
    if (validIdentifier.test(key) && !reservedWords.has(key)) {
      keys.push(key);
    }
  });

  // Add dynamic variables
  variables.forEach(v => {
    if (validIdentifier.test(v) && !reservedWords.has(v)) {
      keys.push(v);
    }
  });

  // Always include current_value
  keys.push('current_value');

  const fn = new Function(
    ...keys,
    `"use strict"; return (${jsExpression})`
  );

  const compiled = { fn, keys, variables };

  //expressionCache.set(expression, compiled);
  return addToCache(expressionCache, expression, compiled);

};
/**
 * ODK Logic Engine
 * Processes choice_filters, relevance, constraints, and calculations
 */

const ODK_HELPERS = {
  // --- Selection Functions ---
  selected1: (list, value) => {
    if (!list || value === undefined || value === null) return false;
    const selectedArray = list.toString().split(' ').filter(v => v !== '');
    return selectedArray.includes(value.toString());
  },
  selected: (list, value) => {
    if (!list || value === undefined || value === null) return false;

    // Handle arrays (from JavaScript formData)
    if (Array.isArray(list)) {
      return list.map(item => item.toString()).includes(value.toString());
    }

    // Handle ODK space-separated strings
    const selectedArray = list.toString().split(' ').filter(v => v !== '');
    return selectedArray.includes(value.toString());
  },
  countSelected1: (list) => {
    if (!list) return 0;
    return list.toString().split(' ').filter(v => v !== '').length;
  },
  countSelected: (list) => {
    if (!list) return 0;

    // Handle arrays
    if (Array.isArray(list)) {
      return list.length;
    }

    // Handle ODK space-separated strings
    return list.toString().split(' ').filter(v => v !== '').length;
  },

  // --- String Functions ---
  stringLength: (str) => (str ? str.toString().length : 0),
  contains: (haystack, needle) =>
    haystack && needle ? haystack.toString().includes(needle.toString()) : false,
  startsWith: (str, prefix) =>
    str && prefix ? str.toString().startsWith(prefix.toString()) : false,
  endsWith: (str, suffix) =>
    str && suffix ? str.toString().endsWith(suffix.toString()) : false,
  substr: (str, start, len) => str ? str.toString().substr(start, len) : '',
  substring: (str, start, end) => str ? str.toString().substring(start, end) : '',
  concat: (...args) => args.join(''),
  normalizeSpace: (str) => str ? str.toString().trim().replace(/\s+/g, ' ') : '',
  translate: (str, from, to) => {
    if (!str) return '';
    let res = str.toString();
    for (let i = 0; i < from.length; i++) {
      res = res.split(from[i]).join(to[i] || '');
    }
    return res;
  },

  // --- Math Functions ---
  abs: (n) => Math.abs(Number(n) || 0),
  round: (n, dec) => {
    const num = Number(n) || 0;
    return dec ? Number(num.toFixed(dec)) : Math.round(num);
  },
  floor: (n) => Math.floor(Number(n) || 0),
  ceiling: (n) => Math.ceil(Number(n) || 0),
  pow: (base, exp) => Math.pow(Number(base), Number(exp)),
  sqrt: (n) => Math.sqrt(Number(n)),
  random: () => Math.random(),
  int: (n) => Math.floor(Number(n) || 0),

  // --- Date & Time ---
  today: () => new Date().toISOString().split('T')[0],
  now: () => new Date().toISOString(),
  date: (val) => val ? new Date(val).toISOString().split('T')[0] : '',
  decimalDateTime: (val) => val ? new Date(val).getTime() / 86400000 + 25569 : 0,
  formatDate: (date, format) => {
    if (!date) return '';
    const d = new Date(date);
    // Simple implementation of ODK format-date
    const map = {
      '%Y': d.getFullYear(),
      '%m': String(d.getMonth() + 1).padStart(2, '0'),
      '%d': String(d.getDate()).padStart(2, '0'),
      '%H': String(d.getHours()).padStart(2, '0'),
      '%M': String(d.getMinutes()).padStart(2, '0'),
      '%S': String(d.getSeconds()).padStart(2, '0'),
    };
    return format.replace(/%[YmdHMS]/g, (m) => map[m]);
  },

  // --- Logic & Control ---
  if: (cond, a, b) => (cond ? a : b),
  coalesce: (a, b) => (a !== undefined && a !== null && a !== '' ? a : b),
  not: (expr) => !expr,
  regex: (value, pattern) => {
    if (!value) return false;
    try {
      const valueStr = value.toString();
      const patternStr = pattern.toString();
      // Force full string matching
      const regex = new RegExp(`^${patternStr}$`);
      return regex.test(valueStr);
    } catch {
      return false;
    }
  },



  // --- Type Conversion ---
  boolean: (val) => !!val,
  number: (val) => Number(val) || 0,
  string: (val) => (val !== null && val !== undefined ? val.toString() : ''),
};

/**
 * Transforms ODK expression string into executable JS
 */
const prepareJsExpressionFn = (expression) => {
  if (!expression) return '';
  return expression
    // 1. Handle ${var} -> convert to var name
    .replace(/\${(\w+)}/g, (_, name) => name)
    // 2. Map ODK Hyphenated functions to CamelCase
    .replace(/count-selected/g, 'countSelected')
    .replace(/string-length/g, 'stringLength')
    .replace(/normalize-space/g, 'normalizeSpace')
    .replace(/decimal-date-time/g, 'decimalDateTime')
    .replace(/format-date/g, 'formatDate')
    // 3. Handle ODK operators
    .replace(/\s+or\s+/gi, ' || ')
    .replace(/\s+and\s+/gi, ' && ')
    // 4. Handle ODK equals (convert = to ===, but avoid changing >= or <=)
    .replace(/(?<![<>!])=(?!=)/g, '===')
    // 5. Handle current field '.'
    .replace(/(?<!\w)\.(?!\w)/g, 'current_value');
};

const preparedExpressionCache = new Map();

const prepareJsExpression = (expression) => {
  if (preparedExpressionCache.has(expression)) {
    return preparedExpressionCache.get(expression);
  }
  const result = prepareJsExpressionFn(expression);
  //preparedExpressionCache.set(expression, result);

  return addToCache(preparedExpressionCache, expression, result);
  //return result;
};

const filterExpressionCache = new Map();

const compileFilterExpression = (expression) => {
  if (filterExpressionCache.has(expression)) {
    return filterExpressionCache.get(expression);
  }

  const preparedExpression = prepareJsExpression(expression);

  // Extract ${vars}
  const variables = [];
  const varRegex = /\${(\w+)}/g;
  let match;
  while ((match = varRegex.exec(expression)) !== null) {
    variables.push(match[1]);
  }

  const validIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  const reservedWords = new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue',
    'default', 'if', 'else', 'import', 'return', 'this', 'var', 'let'
  ]);

  // Precompute static keys (helpers always included)
  const baseKeys = Object.keys(ODK_HELPERS).filter(
    key => validIdentifier.test(key) && !reservedWords.has(key)
  );

  // Add variables
  const dynamicKeys = variables.filter(
    key => validIdentifier.test(key) && !reservedWords.has(key)
  );

  const keys = [...baseKeys, ...dynamicKeys];

  const fn = new Function(
    ...keys,
    `"use strict"; return (${preparedExpression})`
  );

  const compiled = { fn, keys, variables };

  filterExpressionCache.set(expression, compiled);

  return compiled;
};



const reservedWords = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue',
  'default', 'if', 'else', 'import', 'return', 'this', 'var', 'let'
]);

const validIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;


export const filterOptions3 = (options, filterExpression, formData) => {
  if (!filterExpression || !options || options.length === 0) return options;

  // Compile the function ONCE for the whole loop
  const { fn, keys } = compileExpression(filterExpression);

  return options.filter(option => {
    const context = { ...formData, ...option };
    const values = keys.map(key => {
      if (key === 'current_value') return null;
      if (key in ODK_HELPERS) return ODK_HELPERS[key];
      return context[key] ?? null; // Context now includes option-specific attributes
    });

    return fn(...values);
  });
};

export const filterOptions2 = (options, filterExpression, formData) => {

  //console.log('filter options', filterExpression)

  if (!filterExpression || !options) return options;

  const preparedExpression = prepareJsExpression(filterExpression);

  // Extract variables once
  const variablesInExpression = [];
  const varRegex = /\${(\w+)}/g;
  let match;
  while ((match = varRegex.exec(filterExpression)) !== null) {
    variablesInExpression.push(match[1]);
  }

  // Build BASE context once (helpers + formData)
  const baseContext = { ...ODK_HELPERS, ...formData };

  // Precompute BASE keys (huge win)
  const baseKeys = [];
  const baseValues = [];


  Object.entries(baseContext).forEach(([key, value]) => {
    if (validIdentifier.test(key) && !reservedWords.has(key)) {
      baseKeys.push(key);
      baseValues.push(value);

    }
  });

  return options.filter(option => {
    try {
      // Merge option into base context (cheaper than full spread)
      const context = { ...baseContext, ...option };

      // Ensure variables exist
      variablesInExpression.forEach(varName => {
        if (!context.hasOwnProperty(varName)) {
          context[varName] = null;
        }
      });

      const keys = [...baseKeys];
      const values = [...baseValues];

      const keySet = new Set(keys);

      variablesInExpression.forEach(varName => {
        if (!keySet.has(varName)) {
          keySet.add(varName);
          keys.push(varName);

          if (varName in option) values.push(option[varName]);
          else values.push(formData[varName] ?? null);
        }
      });

      // variablesInExpression.forEach(varName => {
      //   if (!keys.includes(varName)) {
      //     keys.push(varName);

      //     if (varName in option) values.push(option[varName]);
      //     else values.push(formData[varName] ?? null);
      //   }
      // });

      // Only process option-specific keys
      Object.entries(option).forEach(([key, value]) => {
        if (validIdentifier.test(key) && !reservedWords.has(key)) {
          keys.push(key);
          values.push(value);
        }
      });

      return new Function(
        ...keys,
        `"use strict"; return (${preparedExpression})`
      )(...values);

    } catch (e) {
      console.error("Filter Eval Error:", {
        error: e.message,
        expression: filterExpression,
        js: preparedExpression
      });
      return true;
    }
  });
};

// Add this helper to odkEngine.js if not already there
const filterCache = new Map();

export const filterOptions4 = (options, filterExpression, formData) => {
  if (!filterExpression || !options || options.length === 0) return options;

  // 1. Get or Compile the filter function ONCE for the entire list
  let compiled;
  if (filterCache.has(filterExpression)) {
    compiled = filterCache.get(filterExpression);
  } else {
    const { fn, keys } = compileExpression(filterExpression); // Reuse your existing compiler
    compiled = { fn, keys };
    filterCache.set(filterExpression, compiled);
  }

  const { fn, keys } = compiled;

  // 2. Run the pre-compiled function against the options
  return options.filter(option => {
    try {
      // Create a combined context for this specific option
      const values = keys.map(key => {
        if (key in option) return option[key]; // Option-specific data (e.g., filter_six)
        if (key in ODK_HELPERS) return ODK_HELPERS[key];
        return formData[key] ?? null; // Global form data (e.g., selected region)
      });

      return fn(...values);
    } catch (e) {
      return true; // Fallback to showing option on error
    }
  });
};


export const filterOptions1 = (options, filterExpression, formData) => {
  if (!filterExpression || !options) return options;

  const preparedExpression = prepareJsExpression(filterExpression);

  // 1. Identify all variables needed by the expression
  // This finds 'region' in 'filter_six === region'
  const variablesInExpression = [];
  const varRegex = /\${(\w+)}/g;
  let match;
  while ((match = varRegex.exec(filterExpression)) !== null) {
    variablesInExpression.push(match[1]);
  }

  const reservedWords = new Set(['break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'if', 'else', 'import', 'return', 'this', 'var', 'let']);

  return options.filter(option => {
    try {
      const context = { ...ODK_HELPERS, ...formData, ...option };
      const keys = [];
      const values = [];
      const validIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

      // 2. Ensure every variable referenced in ${} is present in the keys
      // even if it is currently undefined/null in formData.
      variablesInExpression.forEach(varName => {
        if (!context.hasOwnProperty(varName)) {
          context[varName] = null;
        }
      });

      // 3. Build the evaluation context
      Object.entries(context).forEach(([key, value]) => {
        if (validIdentifier.test(key) && !reservedWords.has(key)) {
          keys.push(key);
          values.push(value);
        }
      });

      return new Function(...keys, `"use strict"; return (${preparedExpression})`)(...values);
    } catch (e) {
      console.error("Filter Eval Error:", {
        error: e.message,
        expression: filterExpression,
        js: preparedExpression
      });
      return true;
    }
  });
};


export const evaluateODKExpression1 = (expression, formData, current_value = null) => {
  if (!expression || expression === 'null') return true;

  try {
    // 1. Prepare the expression (converts ${var} to var, handles operators/hyphens)
    const jsExpression = prepareJsExpression(expression);

    // 2. Identify variables requested in the expression to prevent ReferenceErrors
    const variablesInExpression = [];
    const varRegex = /\${(\w+)}/g;
    let match;
    while ((match = varRegex.exec(expression)) !== null) {
      variablesInExpression.push(match[1]);
    }

    // 3. Build the context
    const context = { ...ODK_HELPERS, ...formData, current_value };

    // Ensure every variable referenced in ${} exists in context (even if null)
    variablesInExpression.forEach(v => {
      if (!(v in context)) context[v] = null;
    });

    const keys = [];
    const values = [];

    // 4. STRICT IDENTIFIER CHECK
    // Only pass keys that are valid JS variable names. 
    // This strips out "label::English", "audio::Swahili", etc.
    const validIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    const reservedWords = new Set(['break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'if', 'else', 'import', 'return', 'this', 'var', 'let']);

    Object.entries(context).forEach(([key, value]) => {
      if (validIdentifier.test(key) && !reservedWords.has(key)) {
        keys.push(key);
        values.push(value);
      }
    });

    // 5. Safely Evaluate
    return new Function(...keys, `"use strict"; return (${jsExpression})`)(...values);
  } catch (e) {
    console.error("ODK Eval Error:", {
      expression,
      error: e.message,
      // availableKeys: Object.keys(formData).filter(k => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k))
    });
    return false;
  }
};

export const evaluateODKExpression = (
  expression,
  formData,
  current_value = null
) => {
  if (!expression || expression === 'null') return true;

  try {
    const { fn, keys } = compileExpression(expression);

    const values = keys.map((key) => {
      if (key === 'current_value') return current_value;
      if (key in ODK_HELPERS) return ODK_HELPERS[key];
      return formData[key] ?? null;
    });

    return fn(...values);

  } catch (e) {
    console.error("ODK Eval Error:", {
      expression,
      error: e.message,
    });
    return false;
  }
};













export const findFieldInSchema = (schema, fieldName) => {
  if (!schema?.form_defn?.pages) return null;

  for (const page of schema.form_defn.pages) {
    for (const fieldGroup of page.fields) {
      // fieldGroup is an object where keys are column names/indices 
      // and values are the field definitions
      const fields = Object.values(fieldGroup);
      const found = fields.find(f => f.name === fieldName);
      if (found) return found;
    }
  }
  return null;
};









export const clearExpressionCache = () => {
  expressionCache.clear();
  preparedExpressionCache.clear();
  //filterExpressionCache.clear();
};






















/**
 * Adapting your successful approach: 
 * Replaces ODK keys (like filter_six) with the actual values from the option
 */
const buildLiteralFilter1 = (option, filterString) => {
  // Split by 'or' / 'and' to process parts (handling case-insensitive)
  const expressions = filterString.split(/\s+(or|and)\s+/i);

  console.log('buildliter filter function', expressions, JSON.stringify(option, null, 3))

  return expressions.map(expression => {
    // Match: key = value (handles quotes, ${var}, or numbers)
    const match = expression.match(/^(\w+)\s*(=|!=)\s*(.*)/);

    if (match) {
      const key = match[1];
      const operator = match[2];
      const rightValue = match[3];

      // If the key exists in the option (e.g. 'filter_six'), replace it with the value
      if (Object.prototype.hasOwnProperty.call(option, key)) {
        const val = option[key];
        if (val === null || val === undefined) return 'false';

        const leftValue = typeof val === 'string' ? `'${val}'` : val;
        return `${leftValue} ${operator} ${rightValue}`;
      }
    }
    return expression;
  }).join(' ');
};

const buildLiteralFilter = (option, filterString) => {
  if (!filterString) return '';

  let processed = filterString;

  // 1. Get all potential column names from the option (e.g., filter_three, filter_six)
  const keys = Object.keys(option);

  // 2. Replace every occurrence of a column name with its actual value from the option
  // We use a word-boundary regex (\b) so we don't accidentally replace parts of other words
  keys.forEach(key => {
    const value = option[key];

    // Create a regex to find the bare column name (e.g., filter_three)
    // but NOT if it's already inside a ${} (to avoid double processing)
    const regex = new RegExp(`\\b${key}\\b`, 'g');

    if (value === null || value === undefined) {
      processed = processed.replace(regex, "''");
    } else {
      // If it's a string, wrap it in single quotes so the ODK engine handles it as a literal
      const literalValue = typeof value === 'string' ? `'${value}'` : value;
      processed = processed.replace(regex, literalValue);
    }
  });

  return processed;
};

export const filterOptions = (options, filterExpression, formData) => {
  if (!filterExpression || !options || options.length === 0) return options;

  return options.filter((option) => {
    try {
      // 1. Transform "filter_six = ${region}" into "'Morogoro' = 'Morogoro'"
      const literalExpression = buildLiteralFilter(option, filterExpression);
      //console.log('literal Expression', literalExpression)

      // 2. Evaluate using your existing engine (which now only has to handle ${region})
      return evaluateODKExpression(literalExpression, formData);
    } catch (e) {
      console.error("Filter Error:", e);
      return true;
    }
  });
};
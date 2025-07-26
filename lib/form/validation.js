import { all, create } from 'mathjs';

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
export function replaceVariables(expression, formData) {

  //console.log('replace variables', expression, JSON.stringify(formData, null, 4))
  return expression.replace(/\${(\w+)}/g, (match, fieldName) => {

    //console.log('field. name', fieldName)
    const originalValue = formData[fieldName];

    // 1. Handle undefined or null
    if (originalValue === undefined || originalValue === null) {
      return "undefined"; // Return "0" as a string, as per original behavior
    }

    const numericValue = Number(originalValue);

    // 2. Check if the value was successfully cast to a number
    // Number.isNaN() is the reliable way to check if the result is NaN.
    if (!Number.isNaN(numericValue)) {
      return numericValue;
    } else {
      // 3. The value could not be cast to a valid number (resulted in NaN).
      const stringRepresentation = String(originalValue);
      // Escape any single quotes within the string to prevent syntax errors
      const escapedString = stringRepresentation.replace(/'/g, "\\'");
      return `'${escapedString}'`;
    }
  });
}

const customFunctions = {
  selected: (fieldValue, value) => {
    // Remove quotes from value if present (e.g., 'active' -> active)
    const cleanValue = typeof value === 'string' ? value.replace(/^'|'$/g, '') : value;
    return fieldValue === cleanValue;
  },
  regex: (fieldValue, value) => fieldValue.match(value),
  not: (fieldValue, value) => {
    console.log('not', fieldValue, `!(${fieldValue})`);
    return `not(${fieldValue})`
  },
  contains: (fieldValue, value) => fieldValue.includes(value),
  today: () => new Date().toISOString().split('T')[0],
  concat: (...args) => args.join(''),
  countSelected: (fieldValue, value) => {
    // Remove quotes from value if present (e.g., 'active' -> active)
    const cleanValue = typeof value === 'string' ? value.replace(/^'|'$/g, '') : value;
    return fieldValue.filter(item => item === cleanValue).length
  },
};




// Parse and evaluate custom functions
export function evaluateCustomFunctions(expression, formData) {
  // Regex to match function_name(arguments), capturing nested parentheses correctly
  const functionRegex = /(\w+)\(([^()]+(?:\([^()]*\)[^()]*)*)\)/g;

  let result = expression;
  let previousResult;
  let maxIterations = 100; // Prevent infinite loops

  // Recursively evaluate until no function calls remain
  do {
    previousResult = result;
    result = result.replace(functionRegex, (match, funcName, args) => {
      if (!customFunctions[funcName]) {
        console.warn(`Unknown custom function: ${funcName}`);
        return '0'; // Fallback to 0 for unknown functions
      }

      // Split arguments and trim, handling nested expressions
      const argList = args.split(',').map(arg => arg.trim());

      // Evaluate each argument
      const evaluatedArgs = argList.map(arg => {
        // Handle field references (${field_name})
        const fieldMatch = arg.match(/\${(\w+)}/);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          return formData[fieldName] ?? 0; // Use 0 if undefined
        }
        // Handle quoted strings
        if (arg.match(/^'.*'$/)) {
          return arg.slice(1, -1); // Remove quotes
        }
        // Handle nested function calls by recursively evaluating
        if (arg.match(/\w+\([^)]+\)/)) {
          return evaluateCustomFunctions(arg, formData);
        }
        // Handle numbers or other literals
        return arg;
      });

      try {
        const funcResult = customFunctions[funcName](...evaluatedArgs);
        return funcResult === true ? '1' : funcResult === false ? '0' : funcResult;
      } catch (error) {
        console.error(`Error in ${funcName}:`, error);
        return '0';
      }
    });

    if (--maxIterations <= 0) {
      console.error('Max iterations reached in evaluateCustomFunctions');
      break;
    }
  } while (result !== previousResult && result.match(functionRegex));

  return result;
}

export function evaluateRelevant(field, formData, constraint = false) {

  const relevant = constraint ? field.constraint : field.relevant;
  const currentField = formData[field.name];
  if (!relevant) return true;

  //console.log('\n\nevaluateRelevant', relevant, currentField);

  try {
    // Replace . with currentField value
    let parsedExpression = relevant;
    if (currentField !== null && currentField !== undefined) {
      parsedExpression = relevant.replace(/\./g, currentField);
    }
    //console.log('Replace . with currentField value', parsedExpression);

    // Replace variables
    parsedExpression = replaceVariables(parsedExpression, formData);
    //console.log('Replace variables', parsedExpression);


    // Evaluate custom functions
    parsedExpression = evaluateCustomFunctions(parsedExpression, formData, currentField);
    //console.log('Evaluate custom functions', parsedExpression);

    // Normalize operators for mathjs
    parsedExpression = parsedExpression
      .replace(/(?<![\=\>\<\!])\s*=\s*(?![\=\>\<\!])/g, ' == ') // Replace standalone = with ==
      .replace(/\b&&\b/g, ' and ') // Replace && with and
      .replace(/\band\b/g, ' and ') // Normalize and to and
      .replace(/div/g, '/');


    // Handle simple equality checks (e.g., ${field} = 'value')
    const match = parsedExpression.match(/\${(\w+)}\s*=\s*'([^']+)'/);
    if (match) {
      const [, field, value] = match;
      return formData[field] === value;
    }


    // Evaluate with mathjs for complex expressions
    const result = math.evaluate(parsedExpression, formData);
    //console.log('Evaluate with mathjs', result);

    return !!result;
  } catch (error) {
    console.error('evaluateRelevant error:', error, 'Expression:', relevant);
    return true; // Default to true if evaluation fails
  }
}

export function calculateField(field, formData) {

  const expression = field.calculate;
  const currentField = formData[field.name];

  if (!expression || !formData) return null;

  try {
    // Replace ${field_name} with formData[field_name]

    // Replace variables
    let parsedExpression = replaceVariables(expression, formData);
    console.log('Replace variables', parsedExpression);

    // Replace . with currentFielnd Value
    if (currentField !== null && currentField !== undefined) {
      parsedExpression = parsedExpression.replace(/\./g, currentField);
    }

    // Evaluate custom functions
    parsedExpression = evaluateCustomFunctions(parsedExpression, formData);

    // Normalize operators for mathjs
    parsedExpression = parsedExpression
      .replace(/(?<![\=\>\<\!])\s*=\s*(?![\=\>\<\!])/g, ' == ') // Replace standalone = with ==
      .replace(/\b&&\b/g, ' and ') // Replace && with and
      .replace(/\band\b/g, ' and ') // Normalize and to and
      .replace(/div/g, '/');

    console.log('Normalize operators', parsedExpression);

    // Handle nested if expressions
    parsedExpression = parsedExpression.replace(
      /if\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g,
      '($1) ? ($2) : ($3)'
    );

    // Evaluate using mathjs
    const result = math.evaluate(parsedExpression);
    return Number.isFinite(result) ? result : null;
  } catch (error) {
    console.error('Calculation error:', error, 'Expression:', expression);
    return null;
  }
}



export function validatePage(page, formData) {
  const errors = {};
  let isValid = true;

  page.fields.forEach((fieldGroup) => {
    Object.keys(fieldGroup).forEach((colName) => {
      const element = fieldGroup[colName];
      const value = formData[element.name];
      const isRelevant = element.relevant
        ? evaluateRelevant(element, formData)
        : true;

      if (!isRelevant) return;

      if (element.required) {
        if (element.type === 'select_multiple') {
          if (!Array.isArray(value) || value.length === 0) {
            errors[element.name] = element.constraint_message || `${element.label} requires at least one selection`;
            isValid = false;
            return;
          }
        } else if (element.type === 'geopoint') {
          if (!value || typeof value !== 'object' || !value.latitude || !value.longitude) {
            errors[element.name] = element.constraint_message || `${element.label} is required`;
            isValid = false;
            return;
          }
        } else if (value === undefined || value === '' || value === null) {
          errors[element.name] = element.constraint_message || `${element.label} is required`;
          isValid = false;
          return;
        }
      }

      if (element.constraint) {
        try {

          const result = evaluateRelevant(element, formData, true);
          if (!result) {
            errors[element.name] = element.constraint_message || `Invalid ${element.label}`;
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
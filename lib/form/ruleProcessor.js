import { evaluateODKExpression } from './odkEngine';

/**
 * Processes reactions after a form is saved.
 * @param {string} formId - The ID of the form just saved.
 * @param {Object} flatData - Key-value pairs of field names and their values.
 * @param {Array} allRules - The list of rules fetched from SQLite.
 */
export const processFormReactions = (formId, flatData, allRules) => {
    let triggeredActions = [];

    // 1. Filter rules for this specific form
    const formRules = allRules.filter(rule => rule.form_id === formId);

    formRules.forEach(rule => {
        try {
            // Re-use the engine to evaluate the ODK condition string
            const isMatch = evaluateODKExpression(rule.condition, flatData);

            if (isMatch) {
                const actions = JSON.parse(rule.actions_json);
                // Attach rule priority to actions for final sorting
                const prioritizedActions = actions.map(act => ({
                    ...act,
                    rule_priority: rule.priority
                }));
                triggeredActions.push(...prioritizedActions);
            }
        } catch (e) {
            console.error(`Logic error in Rule ${rule.id}:`, e);
        }
    });

    // 2. De-duplicate by Action ID and sort by Rule Priority
    // (Lowest priority number comes first)
    return [...new Map(triggeredActions.map(a => [a.id, a])).values()]
        .sort((a, b) => a.rule_priority - b.rule_priority);
};

/**
 * Evaluates rules against form data and returns triggered actions
 */
export const processFormRules = (formData, rules) => {
    let triggeredActions = [];

    rules.forEach(rule => {
        try {
            // Re-use your ODK Engine
            //console.log('evaluateodk expression', rule.condition, formData)
            const isMatch = evaluateODKExpression(rule.condition, formData);
            if (isMatch) {
                const actions = JSON.parse(rule.actions_json);
                triggeredActions.push(...actions);
            }
        } catch (e) {
            console.error(`Rule evaluation error: ${rule.rule_name}`, e);
        }
    });

    //console.log('triggered actions', triggeredActions)

    return triggeredActions;
};
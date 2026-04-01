// useFormStore.js
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { evaluateODKExpression, filterOptions, findFieldInSchema } from '../lib/form/odkEngine';

export const useFormStore = create((set, get) => ({
    schema: null,
    formData: {},
    errors: {},
    language: '::Default',
    currentPage: 0,
    formUUID: null,
    parentUUID: null,
    _isUpdating: false,

    // ✅ New: Track choice filter versions
    choiceFilterVersion: 0,
    choiceFilterDependencies: new Map(),

    // ✅ New: Register a choice filter's dependencies
    registerChoiceFilter: (fieldName, dependencies) => {
        const { choiceFilterDependencies } = get();

        // Clean up old registrations first (optional but good for memory)
        // This would require storing which fields registered which dependencies

        dependencies.forEach(dep => {
            if (!choiceFilterDependencies.has(dep)) {
                choiceFilterDependencies.set(dep, new Set());
            }
            choiceFilterDependencies.get(dep).add(fieldName);
        });
    },

    // ✅ New: Get current choice filter version for a specific field
    getChoiceFilterVersion: (fieldName) => {
        return get().choiceFilterVersion;
    },

    // Initialize the form state
    initForm: (schema, existingData = null, existingUUID = null, parentUUID = null) => {
        const defaultLang = schema.meta?.default_language || schema.language?.[0] || 'English (en)';
        set({
            schema,
            formData: existingData || {},
            formUUID: existingUUID || Crypto.randomUUID(),
            parentUUID: parentUUID || null,
            currentPage: 0,
            errors: {},
            language: defaultLang,
            choiceFilterVersion: 0, // Reset version
            choiceFilterDependencies: new Map(), // Reset dependencies
        });
    },

    // Helper to get filtered options for a specific field
    getFilteredOptions: (field) => {
        const { formData } = get();
        if (!field.options) return [];
        if (!field.choice_filter) return field.options;
        return filterOptions(field.options, field.choice_filter, formData);
    },

    calculatingFields: new Set(),

    batchUpdateFields: (updates) => {
        if (get()._isUpdating) return;

        set((state) => {
            const hasChanges = Object.keys(updates).some(key => state.formData[key] !== updates[key]);
            if (!hasChanges) return state;

            // ✅ Check if updates affect any choice filters
            const { choiceFilterDependencies } = get();
            let versionIncrease = false;

            Object.keys(updates).forEach(changedField => {
                if (choiceFilterDependencies.has(changedField)) {
                    versionIncrease = true;
                }
            });

            return {
                formData: { ...state.formData, ...updates },
                choiceFilterVersion: versionIncrease ? state.choiceFilterVersion + 1 : state.choiceFilterVersion,
            };
        });
    },





    setFormData: (data) => {
        set((state) => {
            // Check if new data affects choice filters
            const { choiceFilterDependencies } = get();
            let versionIncrease = false;

            Object.keys(data).forEach(changedField => {
                if (choiceFilterDependencies.has(changedField)) {
                    versionIncrease = true;
                }
            });

            return {
                formData: data,
                choiceFilterVersion: versionIncrease ? state.choiceFilterVersion + 1 : state.choiceFilterVersion,
            };
        });
    },

    getRawOptions: (fieldDef) => {
        if (!fieldDef) return [];
        // If it's select_from_file, you'd handle file reading here.
        // For standard selects, return the options array.
        return fieldDef.options || [];
    },

    filteredOptionsCache: {},

    updateField: (name, value) => {
        const { schema, formData, choiceFilterDependencies } = get();
        if (formData[name] === value) return;

        const nextData = { ...formData, [name]: value };

        // Check if any other fields depend on THIS field for their choice_filter
        const fieldsToRefresh = choiceFilterDependencies.get(name) || new Set();
        let nextCache = { ...get().filteredOptionsCache };

        fieldsToRefresh.forEach(targetField => {
            const fieldDef = findFieldInSchema(schema, targetField); // Helper to get field def
            if (fieldDef?.choice_filter) {
                // Recalculate filter ONLY for affected fields
                const options = get().getRawOptions(fieldDef);
                nextCache[targetField] = filterOptions(options, fieldDef.choice_filter, nextData);
            }
        });

        set({
            formData: nextData,
            filteredOptionsCache: nextCache,
            choiceFilterVersion: get().choiceFilterVersion + 1
        });
    },

    updateField1: (name, value) => {
        if (get()._isUpdating) return;

        set((state) => {
            if (state.formData[name] === value) return state;

            // ✅ Check if this field affects any choice filters
            const { choiceFilterDependencies } = get();
            const versionIncrease = choiceFilterDependencies.has(name);

            return {
                formData: { ...state.formData, [name]: value },
                errors: { ...state.errors, [name]: null },
                choiceFilterVersion: versionIncrease ? state.choiceFilterVersion + 1 : state.choiceFilterVersion,
            };
        });
    },

    // Skip Logic check
    isRelevant: (element) => {
        if (!element.relevant || element.relevant === 'null') return true;
        try {
            return evaluateODKExpression(element.relevant, get().formData);
        } catch (error) {
            console.error('Error evaluating relevance:', error);
            return false;
        }
    },

    validatePage: (pageIndex) => {
        const { schema, formData, isRelevant } = get();
        const page = schema.form_defn.pages[pageIndex];
        const newErrors = {};
        let isValid = true;

        page.fields.forEach(group => {
            Object.values(group).forEach(field => {
                if (!isRelevant(field)) return;

                const val = formData[field.name];

                if (field.required === 'yes' && (!val || val === '')) {
                    newErrors[field.name] = field[`required_message::${get().language}`] || "Required";
                    isValid = false;
                }

                if (field.constraint && val) {
                    if (!evaluateODKExpression(field.constraint, formData)) {
                        newErrors[field.name] = field[`constraint_message::${get().language}`] || "Invalid";
                        isValid = false;
                    }
                }
            });
        });

        set({ errors: newErrors });
        return isValid;
    },

    nextPage: () => {
        const { currentPage, validatePage, schema } = get();
        if (validatePage(currentPage)) {
            if (currentPage < schema.form_defn.pages.length) {
                set({ currentPage: currentPage + 1 });
            } else {
                return true;
            }
        }
        return false;
    },

    prevPage: () => {
        const { currentPage } = get();
        if (currentPage > 0) set({ currentPage: currentPage - 1 });
    },

    setLanguage: (language) => set({ language }),

    reset: () => set({
        schema: null,
        formData: {},
        errors: {},
        currentPage: 0,
        formUUID: null,
        choiceFilterVersion: 0,
        choiceFilterDependencies: new Map(),
    })
}));
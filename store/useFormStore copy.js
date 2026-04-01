import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { evaluateODKExpression, filterOptions } from '../lib/form/odkEngine';

export const useFormStore = create((set, get) => ({
    schema: null,
    formData: {},
    errors: {},
    language: '::Default',
    currentPage: 0,
    formUUID: null,
    parentUUID: null,
    _isUpdating: false,

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
            language: defaultLang
        });
    },

    // Helper to get filtered options for a specific field
    getFilteredOptions: (field) => {
        const { formData } = get();
        if (!field.options) return [];
        if (!field.choice_filter) return field.options;
        //return field.options
        return filterOptions(field.options, field.choice_filter, formData);
    },

    calculatingFields: new Set(),


    batchUpdateFields: (updates) => {
        if (get()._isUpdating) return;

        set((state) => {
            const hasChanges = Object.keys(updates).some(key => state.formData[key] !== updates[key]);
            if (!hasChanges) return state;

            return {
                formData: { ...state.formData, ...updates }
            };
        });
    },



    setFormData: (data) => set({ formData: data }),


    updateField: (name, value) => {
        // Prevent updates if we're already updating to avoid loops
        if (get()._isUpdating) return;

        set((state) => {
            // Skip update if value hasn't changed
            if (state.formData[name] === value) return state;

            return {
                formData: { ...state.formData, [name]: value },
                errors: { ...state.errors, [name]: null }
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

                // 1. Required Validation
                if (field.required === 'yes' && (!val || val === '')) {
                    newErrors[field.name] = field[`required_message::${get().language}`] || "Required";
                    isValid = false;
                }

                // 2. Constraint Validation
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
                // Logic to navigate to SavePage can go here or in NavigationButtons
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

    reset: () => set({ schema: null, formData: {}, errors: {}, currentPage: 0, formUUID: null })

}));
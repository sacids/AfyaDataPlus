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
    filteredOptionsCache: new Map(),

    // Initialize the form state
    initForm: (schema, existingData = null, existingUUID = null, parentUUID = null) => {
        const defaultLang = schema.form_defn?.meta?.default_language || schema.form_defn?.language?.[0] || 'English (en)';
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


    getFilteredOptions1: (field) => {
        const state = get();
        const formData = state.formData;

        if (!field.options) return [];
        if (!field.choice_filter) return field.options;

        // Use the optimized filterOptions
        return filterOptions(field.options, field.choice_filter, formData);
    },

    getFilteredOptions: (field) => {
        const state = get();
        if (!field.options) return [];
        if (!field.choice_filter) return field.options;

        // Create a cache key from the fields the filter depends on
        const depKeys = field.choice_filter.match(/\${(\w+)}/g)?.map(m => m.slice(2, -1)) || [];
        const cacheKey = `${field.name}_${depKeys.map(k => state.formData[k] ?? 'null').join('|')}`;

        if (state.filteredOptionsCache.has(cacheKey)) {
            return state.filteredOptionsCache.get(cacheKey);
        }

        const filtered = filterOptions(field.options, field.choice_filter, state.formData);
        state.filteredOptionsCache.set(cacheKey, filtered);

        // Optional: limit cache size
        if (state.filteredOptionsCache.size > 200) {
            const firstKey = state.filteredOptionsCache.keys().next().value;
            state.filteredOptionsCache.delete(firstKey);
        }

        return filtered;
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

            //console.log('updateField', name, value)

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
                //console.log('isrelevant', field.name)
                if (!isRelevant(field)) return;
                //console.log(field.name, ' is relevant')

                const val = formData[field.name];

                // 1. Required Validation
                if (field.required === 'yes' && (!val || val === '')) {
                    newErrors[field.name] = field[`required_message::${get().language}`] || "Required";
                    isValid = false;
                }

                // 2. Constraint Validation
                if (field.constraint && val) {
                    console.log('constraint', field.constraint)
                    if (!evaluateODKExpression(field.constraint, formData, val)) {
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

        console.log('current page', currentPage)

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
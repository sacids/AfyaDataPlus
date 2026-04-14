// In useFormStore.js - Production version with minimal logging

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
    _fieldDependencies: new Map(),



    initForm: (schema, existingData = null, existingUUID = null, parentUUID = null) => {
        const defaultLang = schema.form_defn?.meta?.default_language || schema.form_defn?.language?.[0] || 'English (en)';

        // Pre-compute field dependencies
        const fieldDependencies = new Map();
        if (schema?.form_defn?.pages) {
            for (const page of schema.form_defn.pages) {
                for (const fieldGroup of page.fields) {
                    const fields = Object.values(fieldGroup);
                    fields.forEach(field => {
                        if (field.choice_filter) {
                            const deps = [...field.choice_filter.matchAll(/\${(\w+)}/g)]
                                .map(m => m[1]);
                            // Remove duplicates
                            const uniqueDeps = [...new Set(deps)];
                            fieldDependencies.set(field.name, {
                                filter: field.choice_filter,
                                dependencies: uniqueDeps,
                                options: field.options || []
                            });
                        }
                    });
                }
            }
        }

        set({
            schema,
            formData: existingData || {},
            formUUID: existingUUID || Crypto.randomUUID(),
            parentUUID: parentUUID || null,
            currentPage: 0,
            errors: {},
            language: defaultLang,
            _fieldDependencies: fieldDependencies,
            filteredOptionsCache: new Map(),
        });
    },

    invalidateCacheForField: (changedFieldName) => {
        const state = get();
        const toInvalidate = new Set();

        // Find all fields that depend on the changed field
        for (const [fieldName, deps] of state._fieldDependencies.entries()) {
            if (deps.dependencies.includes(changedFieldName)) {
                toInvalidate.add(fieldName);
            }
        }

        // Clear cache for affected fields
        if (toInvalidate.size > 0) {
            const newCache = new Map(state.filteredOptionsCache);
            for (const fieldName of toInvalidate) {
                // Remove all cache entries for this field
                for (const [key] of newCache) {
                    if (key.startsWith(`${fieldName}|`)) {
                        newCache.delete(key);
                    }
                }
            }
            set({ filteredOptionsCache: newCache });
        }
    },

    getFilteredOptions: (field) => {
        const state = get();

        if (!field?.options?.length) return [];
        if (!field.choice_filter) return field.options;

        // Get or compute field dependencies
        let fieldInfo = state._fieldDependencies.get(field.name);
        if (!fieldInfo) {
            const deps = [...field.choice_filter.matchAll(/\${(\w+)}/g)]
                .map(m => m[1]);
            fieldInfo = {
                filter: field.choice_filter,
                dependencies: [...new Set(deps)], // Remove duplicates
                options: field.options
            };
            state._fieldDependencies.set(field.name, fieldInfo);
        }

        // Build cache key efficiently
        let cacheKey = field.name;
        for (const dep of fieldInfo.dependencies) {
            const value = state.formData[dep];
            //cacheKey += `|${dep}:${value === undefined ? 'u' : value === null ? 'n' : value}`;
            cacheKey += `|${dep}:${value === undefined ? 'u' : value === null ? 'n' : String(value)}`;
        }

        // Check cache
        if (state.filteredOptionsCache.has(cacheKey)) {
            return state.filteredOptionsCache.get(cacheKey);
        }

        // Compute filtered options
        const filtered = filterOptions(field.options, field.choice_filter, state.formData);

        // Store in cache with size limit
        if (state.filteredOptionsCache.size >= 100) {
            const firstKey = state.filteredOptionsCache.keys().next().value;
            state.filteredOptionsCache.delete(firstKey);
        }

        state.filteredOptionsCache.set(cacheKey, filtered);
        return filtered;
    },


    updateField: (name, value) => {
        const state = get();
        const current = state.formData[name];

        // Faster comparison for arrays/strings
        if (Array.isArray(value) && Array.isArray(current)) {
            if (value.length === current.length && value.every((v, i) => v === current[i])) return;
        } else if (current === value) {
            return;
        }

        //console.log('updating field')
        set({ formData: { ...state.formData, [name]: value } });


        get().invalidateCacheForField(name);
    },

    batchUpdateFields: (updates) => {
        const changedFields = Object.keys(updates);
        if (changedFields.length === 0) return;

        set((state) => {
            const hasChanges = changedFields.some(key => state.formData[key] !== updates[key]);
            if (!hasChanges) return state;

            return {
                formData: { ...state.formData, ...updates }
            };
        });

        // Invalidate caches for all changed fields
        const uniqueChangedFields = [...new Set(changedFields)];
        for (const field of uniqueChangedFields) {
            get().invalidateCacheForField(field);
        }
    },

    setFormData: (data) => set({ formData: data }),

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
        const { schema, formData, isRelevant, language } = get();
        const page = schema.form_defn.pages[pageIndex];
        const newErrors = {};
        let isValid = true;

        page.fields.forEach(group => {
            Object.values(group).forEach(field => {
                if (!isRelevant(field)) return;

                const val = formData[field.name];

                if (field.required === 'yes' && (!val || val === '')) {
                    newErrors[field.name] = field[`required_message::${language}`] || "Required";
                    isValid = false;
                }

                if (field.constraint && val) {
                    if (!evaluateODKExpression(field.constraint, formData, val)) {
                        newErrors[field.name] = field[`constraint_message::${language}`] || "Invalid";
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
        get().clearExpiredCaches();

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

    clearExpiredCaches: () => {
        const cache = get().filteredOptionsCache;
        if (cache.size > 50) {
            const newCache = new Map();
            let count = 0;
            for (const [key, value] of cache) {
                if (count < 50) newCache.set(key, value);
                count++;
            }
            set({ filteredOptionsCache: newCache });
        }
    },

    reset: () => set({
        schema: null,
        formData: {},
        errors: {},
        currentPage: 0,
        formUUID: null,
        filteredOptionsCache: new Map(),
        _fieldDependencies: new Map()
    })
}));
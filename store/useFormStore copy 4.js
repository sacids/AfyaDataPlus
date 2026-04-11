// In useFormStore.js - Add these debug logs

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
    _updateCount: 0, // Track total updates
    _lastUpdateTime: Date.now(), // Track update frequency
    
    // Initialize the form state
    initForm: (schema, existingData = null, existingUUID = null, parentUUID = null) => {
        console.log('🔵 INIT_FORM called', { 
            hasSchema: !!schema, 
            hasExistingData: !!existingData,
            existingDataKeys: existingData ? Object.keys(existingData) : []
        });
        
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
                            console.log(`📋 Field ${field.name} depends on:`, deps);
                            fieldDependencies.set(field.name, {
                                filter: field.choice_filter,
                                dependencies: deps,
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
            _updateCount: 0,
            _lastUpdateTime: Date.now()
        });
        
        console.log('✅ INIT_FORM complete', { 
            formDataKeys: Object.keys(existingData || {}),
            dependencyCount: fieldDependencies.size 
        });
    },
    
    invalidateCacheForField: (changedFieldName) => {
        console.log(`🔄 INVALIDATE_CACHE for field: ${changedFieldName}`);
        const state = get();
        const toInvalidate = new Set();
        
        // Find all fields that depend on the changed field
        for (const [fieldName, deps] of state._fieldDependencies.entries()) {
            if (deps.dependencies.includes(changedFieldName)) {
                console.log(`  └─ Will invalidate: ${fieldName} (depends on ${changedFieldName})`);
                toInvalidate.add(fieldName);
            }
        }
        
        // Clear cache for affected fields
        if (toInvalidate.size > 0) {
            const newCache = new Map(state.filteredOptionsCache);
            let invalidatedCount = 0;
            for (const fieldName of toInvalidate) {
                for (const [key] of newCache) {
                    if (key.startsWith(`${fieldName}_`)) {
                        newCache.delete(key);
                        invalidatedCount++;
                    }
                }
            }
            console.log(`  └─ Invalidated ${invalidatedCount} cache entries`);
            set({ filteredOptionsCache: newCache });
        } else {
            console.log(`  └─ No fields depend on ${changedFieldName}`);
        }
    },
    
    getFilteredOptions: (field) => {
        const startTime = performance.now();
        console.log(`🔍 GET_FILTERED_OPTIONS called for: ${field.name}`);
        
        const state = get();
        
        // Quick returns
        if (!field?.options?.length) {
            console.log(`  └─ No options for ${field.name}`);
            return [];
        }
        if (!field.choice_filter) {
            console.log(`  └─ No choice_filter for ${field.name}, returning all ${field.options.length} options`);
            return field.options;
        }
        
        // Get or compute field dependencies
        let fieldInfo = state._fieldDependencies.get(field.name);
        if (!fieldInfo) {
            console.log(`  └─ First time seeing ${field.name}, computing dependencies`);
            const deps = [...field.choice_filter.matchAll(/\${(\w+)}/g)]
                .map(m => m[1]);
            fieldInfo = {
                filter: field.choice_filter,
                dependencies: deps,
                options: field.options
            };
            state._fieldDependencies.set(field.name, fieldInfo);
        }
        
        // Build cache key
        let cacheKey = field.name;
        const depValues = [];
        for (const dep of fieldInfo.dependencies) {
            const value = state.formData[dep];
            depValues.push(`${dep}:${value === undefined ? 'undefined' : value === null ? 'null' : value}`);
            cacheKey += `|${dep}:${value === undefined ? 'u' : value === null ? 'n' : value}`;
        }
        
        console.log(`  └─ Dependencies for ${field.name}:`, depValues);
        console.log(`  └─ Cache key: ${cacheKey.substring(0, 100)}...`);
        
        // Check cache
        if (state.filteredOptionsCache.has(cacheKey)) {
            const cachedResult = state.filteredOptionsCache.get(cacheKey);
            const duration = performance.now() - startTime;
            console.log(`  ✅ CACHE HIT for ${field.name} (${duration.toFixed(2)}ms) - returning ${cachedResult.length} options`);
            return cachedResult;
        }
        
        console.log(`  ❌ CACHE MISS for ${field.name}, computing filter...`);
        
        // Compute filtered options
        const filtered = filterOptions(field.options, field.choice_filter, state.formData);
        console.log(`  └─ Filter result: ${filtered.length} of ${field.options.length} options`);
        
        // Store in cache with size limit
        if (state.filteredOptionsCache.size >= 100) {
            const firstKey = state.filteredOptionsCache.keys().next().value;
            console.log(`  └─ Cache full (${state.filteredOptionsCache.size}), removing oldest: ${firstKey}`);
            state.filteredOptionsCache.delete(firstKey);
        }
        
        state.filteredOptionsCache.set(cacheKey, filtered);
        const duration = performance.now() - startTime;
        console.log(`  ✅ CACHE SET for ${field.name} (${duration.toFixed(2)}ms) - stored ${filtered.length} options`);
        
        return filtered;
    },
    
    updateField: (name, value) => {
        const state = get();
        const currentValue = state.formData[name];
        
        // Track update frequency
        const now = Date.now();
        const timeSinceLastUpdate = now - state._lastUpdateTime;
        const updateNumber = state._updateCount + 1;
        
        console.log(`📝 UPDATE_FIELD #${updateNumber} [${timeSinceLastUpdate}ms since last]: ${name} =`, value);
        
        if (currentValue === value) {
            console.log(`  └─ SKIPPED: Value unchanged for ${name}`);
            return;
        }
        
        // Check for rapid updates (potential crash indicator)
        if (timeSinceLastUpdate < 10 && updateNumber > 10) {
            console.warn(`⚠️ RAPID UPDATES DETECTED! ${updateNumber} updates in ${Date.now() - state._lastUpdateTime}ms`);
            console.trace('Stack trace for rapid update');
        }
        
        console.log(`  └─ OLD VALUE:`, currentValue);
        console.log(`  └─ NEW VALUE:`, value);
        
        set((state) => ({
            formData: { ...state.formData, [name]: value },
            errors: { ...state.errors, [name]: null },
            _updateCount: state._updateCount + 1,
            _lastUpdateTime: Date.now()
        }));
        
        // Log the updated formData (but don't log huge objects)
        const newState = get();
        console.log(`  └─ Form data now has ${Object.keys(newState.formData).length} fields`);
        
        // Invalidate dependent caches
        console.log(`  └─ Invalidating caches for dependencies of ${name}`);
        get().invalidateCacheForField(name);
    },
    
    batchUpdateFields: (updates) => {
        const updateCount = Object.keys(updates).length;
        console.log(`📦 BATCH_UPDATE ${updateCount} fields:`, Object.keys(updates));
        
        if (get()._isUpdating) {
            console.log(`  └─ SKIPPED: Already updating`);
            return;
        }
        
        const changedFields = Object.keys(updates);
        if (changedFields.length === 0) return;
        
        set((state) => {
            const hasChanges = changedFields.some(key => state.formData[key] !== updates[key]);
            if (!hasChanges) {
                console.log(`  └─ SKIPPED: No actual changes`);
                return state;
            }
            
            return {
                formData: { ...state.formData, ...updates }
            };
        });
        
        const uniqueChangedFields = [...new Set(changedFields)];
        console.log(`  └─ Invalidating caches for:`, uniqueChangedFields);
        for (const field of uniqueChangedFields) {
            get().invalidateCacheForField(field);
        }
    },
    
    setFormData: (data) => {
        console.log(`📋 SET_FORM_DATA called with ${Object.keys(data).length} fields`);
        set({ formData: data });
    },
    
    isRelevant: (element) => {
        if (!element.relevant || element.relevant === 'null') return true;
        try {
            const result = evaluateODKExpression(element.relevant, get().formData);
            return result;
        } catch (error) {
            console.error('Error evaluating relevance:', error);
            return false;
        }
    },
    
    validatePage: (pageIndex) => {
        console.log(`✅ VALIDATE_PAGE ${pageIndex}`);
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
                    if (!evaluateODKExpression(field.constraint, formData, val)) {
                        newErrors[field.name] = field[`constraint_message::${get().language}`] || "Invalid";
                        isValid = false;
                    }
                }
            });
        });
        
        set({ errors: newErrors });
        console.log(`  └─ Validation result: ${isValid ? 'PASS' : 'FAIL'}, errors:`, Object.keys(newErrors));
        return isValid;
    },
    
    nextPage: () => {
        const { currentPage, validatePage, schema } = get();
        console.log(`⏩ NEXT_PAGE from ${currentPage}`);
        
        if (validatePage(currentPage)) {
            if (currentPage < schema.form_defn.pages.length) {
                console.log(`  └─ Moving to page ${currentPage + 1}`);
                set({ currentPage: currentPage + 1 });
            } else {
                console.log(`  └─ On last page, ready to submit`);
                return true;
            }
        }
        return false;
    },
    
    prevPage: () => {
        const { currentPage } = get();
        console.log(`⏪ PREV_PAGE from ${currentPage}`);
        if (currentPage > 0) set({ currentPage: currentPage - 1 });
    },
    
    setLanguage: (language) => {
        console.log(`🌐 SET_LANGUAGE to ${language}`);
        set({ language });
    },
    
    reset: () => {
        console.log(`🔄 RESET form store`);
        set({ 
            schema: null, 
            formData: {}, 
            errors: {}, 
            currentPage: 0, 
            formUUID: null,
            filteredOptionsCache: new Map(),
            _fieldDependencies: new Map(),
            _updateCount: 0,
            _lastUpdateTime: Date.now()
        });
    }
}));
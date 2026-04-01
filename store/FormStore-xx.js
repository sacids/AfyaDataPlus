// FormStore.js
import { create } from 'zustand';
import { evaluateField, generateUUID, validatePage } from '../lib/form.bak/validation';
import { Debug } from '../utils/debug';

function extractDependencies(expression) {
  const matches = expression?.match(/\$\{(.*?)\}/g) || [];
  return matches.map(m => m.replace('${', '').replace('}', ''));
}

function buildDependencyGraph(schema) {
  const deps = {};
  if (!schema) return deps;

  schema.pages.forEach(page => {
    page.fields.forEach(group => {
      Object.values(group).forEach(field => {
        if (field?.type === 'calculate' && field.calculation) {
          const fields = extractDependencies(field.calculation);
          fields.forEach(dep => {
            if (!deps[dep]) deps[dep] = [];
            deps[dep].push(field.name);
          });
        }
      });
    });
  });

  return deps;
}

function buildRelevanceGraph(schema) {
  const graph = {};
  if (!schema) return graph;

  schema.pages.forEach(page => {
    page.fields.forEach(group => {
      Object.values(group).forEach(field => {
        if (field?.relevant) {
          const dependencies = extractDependencies(field.relevant);
          dependencies.forEach(dep => {
            if (!graph[dep]) graph[dep] = [];
            graph[dep].push(field.name);
          });
        }
      });
    });
  });
  return graph;
}

function findField(schema, name) {
  for (const page of schema.pages) {
    for (const group of page.fields) {
      for (const field of Object.values(group)) {
        if (field.name === name) return field;
      }
    }
  }
}

export const useFormStore = create((set, get) => ({
  schema: null,
  formUUID: null,
  parentUUID: null,
  currentPage: 0,
  formData: {},
  errors: {},

  dependencyGraph: {},
  relevanceMap: {},
  relevanceGraph: {},

  language: '::Default',
  formDirection: 'next',

  setSchema: (schema, formData = null, formUUID = null, parentUUID = null) => {
    const startTime = Debug.startTimer('FormStore', 'setSchema');
    Debug.log('FormStore', 'setSchema called', {
      schemaId: schema?.id,
      hasFormData: !!formData,
      hasUUID: !!formUUID,
      pages: schema?.pages?.length
    });

    try {
      const dependencyGraph = buildDependencyGraph(schema);
      const relGraph = buildRelevanceGraph(schema);
      
      Debug.log('FormStore', 'Graphs built', {
        depsSize: Object.keys(dependencyGraph).length,
        relSize: Object.keys(relGraph).length
      });

      const initialRelevance = {};
      schema.pages.forEach(page => {
        page.fields.forEach(group => {
          Object.values(group).forEach(field => {
            try {
              initialRelevance[field.name] = field.relevant
                ? evaluateField('relevant', field, formData || {})
                : true;
            } catch (err) {
              Debug.error('FormStore', err, { field: field.name });
              initialRelevance[field.name] = true;
            }
          });
        });
      });

      const result = {
        schema,
        dependencyGraph,
        relevanceGraph: relGraph,
        relevanceMap: initialRelevance,
        formData: formData !== null ? formData : {},
        errors: {},
        currentPage: 0,
        formUUID: formUUID !== null ? formUUID : generateUUID(),
        parentUUID: parentUUID,
      };

      Debug.endTimer('FormStore', 'setSchema', startTime);
      Debug.trackMemory('FormStore');
      
      return set(result);
    } catch (error) {
      Debug.error('FormStore', error, { schema: schema?.id });
      return set({});
    }
  },

  setPage: (page) => {
    Debug.log('FormStore', `setPage: ${page}`);
    set({ currentPage: page });
  },

  setLanguage: (language) => {
    Debug.log('FormStore', `setLanguage: ${language}`);
    set({ language });
  },

  setFormData: (data) => {
    Debug.log('FormStore', 'setFormData', { size: Object.keys(data || {}).length });
    set({ formData: data });
  },

  setFormUUID: (uuid) => {
    Debug.log('FormStore', `setFormUUID: ${uuid}`);
    set({ formUUID: uuid });
  },

  setParentUUID: (uuid) => {
    Debug.log('FormStore', `setParentUUID: ${uuid}`);
    set({ parentUUID: uuid });
  },

  setFormDirection: (direction) => {
    Debug.log('FormStore', `setFormDirection: ${direction}`);
    set({ formDirection: direction });
  },

  updateFormData: (name, value) => {
    const startTime = Debug.startTimer('FormStore', `updateFormData:${name}`);
    Debug.log('FormStore', `updateFormData: ${name} =`, value);

    try {
      const { formData, dependencyGraph, schema } = get();
      const state = get();

      // Step 1: set initial value
      const newData = { ...formData, [name]: value };

      // Step 2: run dependency propagation
      const queue = [name];
      const visited = new Set();
      let propagationCount = 0;

      while (queue.length > 0) {
        const fieldName = queue.shift();

        if (visited.has(fieldName)) continue;
        visited.add(fieldName);

        const dependents = dependencyGraph[fieldName] || [];

        dependents.forEach(depFieldName => {
          const field = findField(schema, depFieldName);
          if (!field) return;

          try {
            const newValue = evaluateField('calculation', field, newData);

            if (newData[depFieldName] !== newValue) {
              newData[depFieldName] = newValue;
              queue.push(depFieldName);
              propagationCount++;
            }
          } catch (e) {
            Debug.error('FormStore', e, { field: depFieldName });
          }
        });
      }

      if (propagationCount > 0) {
        Debug.log('FormStore', `Propagated to ${propagationCount} fields`);
      }

      const affectedFields = state.dependencyGraph[name] || [];
      const newRelevance = { ...state.relevanceMap };
      let relevanceChanges = 0;

      affectedFields.forEach(fieldName => {
        const field = findField(state.schema, fieldName);
        if (field?.relevant) {
          try {
            const newRelevant = evaluateField('relevant', field, newData);
            if (newRelevance[fieldName] !== newRelevant) {
              newRelevance[fieldName] = newRelevant;
              relevanceChanges++;
            }
          } catch (e) {
            Debug.error('FormStore', e, { field: fieldName });
          }
        }
      });

      if (relevanceChanges > 0) {
        Debug.log('FormStore', `Relevance changed for ${relevanceChanges} fields`);
      }

      // Step 3: single atomic update
      set({
        formData: newData,
        relevanceMap: newRelevance,
        errors: { ...get().errors, [name]: '' },
      });

      Debug.endTimer('FormStore', `updateFormData:${name}`, startTime);
      
    } catch (error) {
      Debug.error('FormStore', error, { name, value });
      // Fallback to simple update
      set((state) => ({
        formData: { ...state.formData, [name]: value },
        errors: { ...state.errors, [name]: '' },
      }));
    }
  },

  validateAndNavigate: (direction) => {
    const startTime = Debug.startTimer('FormStore', `validateAndNavigate:${direction}`);
    const { schema, currentPage, formData, language } = get();
    
    if (!schema) {
      Debug.warn('FormStore', 'validateAndNavigate called with no schema');
      return false;
    }

    set({ formDirection: direction });

    if (direction === 'next') {
      const currentPageSchema = schema.pages[currentPage];
      const langList = schema?.language || ['::Default'];
      
      try {
        const { isValid, errors } = validatePage(currentPageSchema, formData, language, langList);
        if (!isValid) {
          Debug.log('FormStore', 'Validation failed', { errors: Object.keys(errors) });
          set({ errors });
          return false;
        }
      } catch (error) {
        Debug.error('FormStore', error, { page: currentPage });
        return false;
      }
    }

    const newPage = direction === 'next'
      ? Math.min(currentPage + 1, schema.pages.length - 1)
      : Math.max(currentPage - 1, 0);
    
    Debug.log('FormStore', `Navigate ${direction}: ${currentPage} → ${newPage}`);
    set({ currentPage: newPage, errors: {} });
    
    Debug.endTimer('FormStore', `validateAndNavigate:${direction}`, startTime);
    return true;
  },

  reset: () => {
    Debug.log('FormStore', '🔄 RESETTING STORE');
    Debug.trackMemory('FormStore');
    
    set({
      schema: null,
      formUUID: null,
      parentUUID: null,
      currentPage: 0,
      formData: {},
      errors: {},
      dependencyGraph: {},
      relevanceMap: {},
      relevanceGraph: {},
      language: '::Default',
      formDirection: 'next',
    });
    
    Debug.trackMemory('FormStore');
  },
}));
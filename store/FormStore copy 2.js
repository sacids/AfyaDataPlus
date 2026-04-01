
//import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { evaluateField, generateUUID, validatePage } from '../lib/form/validation';


const generateUUID2 = () => {
  try {
    return Crypto.randomUUID();
  } catch (error) {
    // Fallback to a simple UUID generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};



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
          // Extract variables like ${species} from the relevance string
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

  //setSchema: (schema) => set({ schema, formData: {}, errors: {}, currentPage: 0, formUUID: generateUUID() }),
  setSchema: (schema, formData = null, formUUID = null, parentUUID = null) => set(() => {

    const dependencyGraph = buildDependencyGraph(schema);
    const relGraph = buildRelevanceGraph(schema);

    const initialRelevance = {};
    schema.pages.forEach(page => {
      page.fields.forEach(group => {
        Object.values(group).forEach(field => {
          initialRelevance[field.name] = field.relevant
            ? evaluateField('relevant', field, formData || {})
            : true;
        });
      });
    });

    //console.log('setSchema called:', { schema, formUUID });
    return {
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
  }),

  setPage: (page) => set({ currentPage: page }),

  setLanguage: (language) => set({ language }),

  setFormData: (data) => set({ formData: data }),

  setFormUUID: (uuid) => set({ formUUID: uuid }),

  setParentUUID: (uuid) => set({ parentUUID: uuid }),

  setFormDirection: (direction) => set({ formDirection: direction }),

  updateFormData1: (name, value) =>
    set((state) => ({
      formData: { ...state.formData, [name]: value },
      errors: { ...state.errors, [name]: '' },
    })),

  updateFormData: (name, value) => {
    const { formData, dependencyGraph, schema } = get();
    const state = get();

    // Step 1: set initial value
    const newData = { ...formData, [name]: value };

    // Step 2: run dependency propagation
    const queue = [name];
    const visited = new Set();

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

            // propagate further
            queue.push(depFieldName);
          }
        } catch (e) {
          console.error('Calculation error:', depFieldName, e);
        }
      });
    }


    const affectedFields = state.dependencyGraph[name] || [];
    const newRelevance = { ...state.relevanceMap };

    affectedFields.forEach(fieldName => {
      const field = findField(state.schema, fieldName);
      if (field?.relevant) {
        newRelevance[fieldName] = evaluateField('relevant', field, newData);
      }
    });

    affectedFields.forEach(fieldName => {
      const field = findField(state.schema, fieldName);
      if (field?.relevant) {
        newRelevance[fieldName] = evaluateField('relevant', field, newData);
      }
    });

    // Step 3: single atomic update
    set({
      formData: newData,
      relevanceMap: newRelevance,
      errors: { ...get().errors, [name]: '' },
    });
  },
  validateAndNavigate: (direction) => {
    const { schema, currentPage, formData, language } = get();
    if (!schema) return false;

    set({ formDirection: direction });

    if (direction === 'next') {
      const currentPageSchema = schema.pages[currentPage];
      const langList = schema?.language || ['::Default'];
      const { isValid, errors } = validatePage(currentPageSchema, formData, language, langList);
      if (!isValid) {
        set({ errors });
        return false;
      }
    }
    // console.log('currentPage', currentPage);
    // const currentPageSchema = schema.pages[currentPage];
    // const { isValid, errors } = validatePage(currentPageSchema, formData);

    // if (!isValid && direction === 'next') {
    //   set({ errors });
    //   return false;
    // }

    const newPage =
      direction === 'next'
        ? Math.min(currentPage + 1, schema.pages.length)
        : Math.max(currentPage - 1, 0);
    set({ currentPage: newPage, errors: {} });
    return true;
  },
  reset: () => set({
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
  }),
  
}));

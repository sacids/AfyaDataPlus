
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { validatePage } from '../lib/form/validation';

export const useFormStore = create((set, get) => ({
  schema: null,
  formUUID: null,
  currentPage: 0,
  formData: {},
  errors: {},
  language: '::Default',
  formDirection: 'next',

  setSchema: (schema) => set({ schema, formData: {}, errors: {}, currentPage: 0, formUUID: randomUUID() }),

  setPage: (page) => set({ currentPage: page }),

  setLanguage: (language) => set({ language }),

  setFormDirection: (direction) => set({ formDirection: direction }),

  updateFormData: (name, value) =>
    set((state) => ({
      formData: { ...state.formData, [name]: value },
      errors: { ...state.errors, [name]: '' },
    })),
  validateAndNavigate: (direction) => {
    const { schema, currentPage, formData } = get();
    if (!schema) return false;

    set({ formDirection: direction });

    if(direction === 'next') {
      const currentPageSchema = schema.pages[currentPage];
      const { isValid, errors } = validatePage(currentPageSchema, formData);
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
}));

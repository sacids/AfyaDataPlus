import { MaterialIcons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useFormStore } from '../../../store/useFormStore';
import { getLabel } from '../../../lib/form/utils';

const SelectMultiple = ({ element }) => {
  // 1. SELECTORS
  const formData = useFormStore(state => state.formData);
  const updateField = useFormStore(state => state.updateField);
  const language = useFormStore(state => state.language);
  const fieldError = useFormStore(state => state.errors[element.name]);
  
  // Use the library's filtering logic to get valid options based on choice_filter
  const getFilteredOptions = useFormStore(state => state.getFilteredOptions);
  const availableOptions = useMemo(() => getFilteredOptions(element), [element, formData]);

  // ODK Multi-select values are stored as space-separated strings: "choice1 choice2"
  const currentValue = formData[element.name] || "";
  const selectedArray = useMemo(() => 
    currentValue ? currentValue.split(" ").filter(v => v !== "") : [], 
    [currentValue]
  );

  const handleToggle = (optionName) => {
    let newSelected;
    if (selectedArray.includes(optionName)) {
      newSelected = selectedArray.filter(item => item !== optionName);
    } else {
      newSelected = [...selectedArray, optionName];
    }
    // Sync back to store as space-separated string
    updateField(element.name, newSelected.join(" "));
  };

  if (availableOptions.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Label & Required Star */}
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {getLabel(element, 'label', language)}
          {element.required === 'yes' && <Text style={{ color: 'red' }}> *</Text>}
        </Text>
      </View>

      {/* Hint */}
      {element[`hint::${language}`] && (
        <Text style={styles.hint}>{element[`hint::${language}`]}</Text>
      )}

      {/* Options List */}
      <View style={[styles.optionsWrapper, fieldError && styles.errorBorder]}>
        {availableOptions.map((option) => {
          const isSelected = selectedArray.includes(option.name);

          return (
            <TouchableOpacity
              key={option.name}
              style={styles.optionRow}
              onPress={() => handleToggle(option.name)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={isSelected ? '#007bff' : '#ccc'}
              />
              <Text style={styles.optionText}>
                {getLabel(option, 'label', language)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Error Message */}
      {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 15, marginBottom: 10 },
  labelContainer: { marginBottom: 5 },
  label: { fontSize: 16, fontWeight: '600', color: '#333' },
  hint: { fontSize: 13, color: '#666', marginBottom: 10, fontStyle: 'italic' },
  optionsWrapper: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    paddingVertical: 5,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: { marginLeft: 10, fontSize: 15, color: '#444' },
  errorBorder: { borderColor: 'red' },
  errorText: { color: 'red', fontSize: 12, marginTop: 5 },
});

export default memo(SelectMultiple);
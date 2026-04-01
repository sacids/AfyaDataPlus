import { MaterialIcons } from '@expo/vector-icons';
import { memo, useEffect, useMemo, useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/useFormStore';

const SelectMultiple = ({ element, globalValue }) => {

  // Store selectors
  //const globalValue = useFormStore(state => state.formData[element.name]);
  const updateField = useFormStore(state => state.updateField);
  const language = useFormStore(state => state.language);
  const fieldError = useFormStore(state => state.errors[element.name]);
  const schemaLanguage = useFormStore(state => state.schema?.form_defn?.languages);


  const theme = useTheme();
  const styles = getStyles(theme);


  const availableOptions = useFormStore(state => 
    state.filteredOptionsCache[element.name] || element.options || []
  );

  // ODK Multi-select values are stored as space-separated strings: "choice1 choice2"
  const currentValue = globalValue || "";

  // 2. Memoize the display array so we don't split strings on every render
  const selectedArray = useMemo(() => {
    if (!globalValue) return [];
    return globalValue.toString().split(' ').filter(v => v !== '');
  }, [globalValue]);

  const handleToggle = (optionName) => {
    console.log('select multiple', optionName)
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

  const label = getLabel(element, 'label', language, schemaLanguage);
  const hint = getLabel(element, 'hint', language, schemaLanguage);

  // Render helpers
  const renderLabel = () => label && (
    <View style={styles.labelContainer}>
      {element.required && <Text style={styles.required}>*</Text>}
      <Text style={styles.label}>{label}</Text>
    </View>
  );

  const renderHint = () => hint && <Text style={styles.hint}>{hint}</Text>;

  return (
    <View style={styles.container}>
      {renderLabel()}
      {renderHint()}

      {/* Options List */}
      <View
        style={[
          styles.inputBase,
          styles.selectMultiple,
          fieldError ? styles.inputError : null,
        ]}
      >
        {availableOptions.map((option) => {
          const isSelected = selectedArray.includes(option.name);

          return (
            <TouchableOpacity
              key={option.name}
              style={styles.checkboxContainer}
              onPress={() => handleToggle(option.name)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={isSelected ? theme.colors.primary : styles.inputBase?.borderColor || '#ccc'}
              />
              <Text style={styles.checkboxLabel}>
                {getLabel(option, 'label', language, schemaLanguage)}
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

// ✅ Add display name for debugging
SelectMultiple.displayName = 'SelectMultiple';

export default memo(SelectMultiple);
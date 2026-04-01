import { MaterialIcons } from '@expo/vector-icons';
import React, { memo, useCallback, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/useFormStore';

const SelectMultiple = ({ element, globalValue }) => {

  console.log('in select multiple')
  // 1. SELECTORS
  //const formData = useFormStore(state => state.formData);

  //const globalValue = useFormStore(state => state.formData[element.name]);
  const updateField = useFormStore(state => state.updateField);
  const language = useFormStore(state => state.language);
  const fieldError = useFormStore(state => state.errors[element.name]);
  const schemaLanguage = useFormStore(state => state.schema.form_defn.languages);

  // Use the library's filtering logic to get valid options based on choice_filter
  const getFilteredOptions = useFormStore(state => state.getFilteredOptions);
  //const availableOptions = useMemo(() => getFilteredOptions(element), [element]);





  // 1. Identify which fields this specific SelectOne cares about
  const dependencyKeys = useMemo(() => {
    if (!element.choice_filter) return [];
    const matches = element.choice_filter.match(/\${(.*?)}/g) || [];
    return matches.map(m => m.replace(/[${}]/g, ''));
  }, [element.choice_filter]);

  // 2. Subscribe to a serialized string of values
  // This will only trigger a re-render if the actual values change!
  const dependencyValuesString = useFormStore(
    useCallback(
      (state) => dependencyKeys.map(key => state.formData[key] || '').join('|'),
      [dependencyKeys]
    )
  );

  // 3. Recalculate options only when that string changes
  const availableOptions = useMemo(() => {
    return getFilteredOptions(element);
  }, [element, dependencyValuesString, getFilteredOptions]);

  




  const theme = useTheme();
  const styles = getStyles(theme);

  //console.log('select multiple element', element)
  // ODK Multi-select values are stored as space-separated strings: "choice1 choice2"
  const currentValue = globalValue || "";
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


  const label = getLabel(element, 'label', language, schemaLanguage);
  const hint = getLabel(element, 'hint', language, schemaLanguage);

  // --- RENDER HELPERS ---
  const renderLabel = () => label && (
    <View style={styles.labelContainer}>
      {element.required && <Text style={styles.required}>*</Text>}
      <Text style={styles.label}>{label}</Text>
    </View>
  );

  const renderHint = () => hint && <Text style={styles.hint}>{hint}</Text>;


  // eslint-disable-next-line react/display-name
  const OptionItem = React.memo(({
    option,
    isSelected,
    onToggle,
    getLabel,
    language,
    schemaLanguage,
    theme
  }) => {
    const handlePress = useCallback(() => {
      onToggle(option.name);
    }, [option.name, onToggle]);

    return (
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name={isSelected ? 'check-box' : 'check-box-outline-blank'}
          size={24}
          color={isSelected ? theme.colors.primary : styles.inputBase.borderColor}
        />
        <Text style={styles.checkboxLabel}>
          {getLabel(option, 'label', language, schemaLanguage)}
        </Text>
      </TouchableOpacity>
    );
  });

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

        {availableOptions.map((option) => (
          <OptionItem
            key={option.name}
            option={option}
            isSelected={selectedArray.includes(option.name)}
            onToggle={handleToggle}
            getLabel={getLabel}
            language={language}
            schemaLanguage={schemaLanguage}
            theme={theme}
            styles={styles}
          />
        ))}
      </View>

      {/* Error Message */}
      {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
    </View>
  );
};

export default memo(SelectMultiple);
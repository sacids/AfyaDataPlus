import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useFormStore } from '../../../store/FormStore';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';

const SelectMultiple = ({ element, value }) => {
  const { updateFormData, errors, language } = useFormStore();
  const theme = useTheme();
  const styles = getStyles(theme);

  // Ensure value is an array; default to empty array if undefined
  const selectedValues = Array.isArray(value) ? value : [];

  const toggleOption = (optionValue) => {
    const newValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((val) => val !== optionValue)
      : [...selectedValues, optionValue];
    updateFormData(element.name, newValues);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{element['label' + language]}</Text>
      <View
        style={[
          styles.inputBase,
          styles.selectMultiple,
          errors[element.name] ? styles.inputError : null,
        ]}
      >
        {element.options.map((option) => (
          <TouchableOpacity
            key={option.name}
            style={styles.checkboxContainer}
            onPress={() => toggleOption(option.name)}
          >
            <MaterialIcons
              name={
                selectedValues.includes(option.name)
                  ? 'check-box'
                  : 'check-box-outline-blank'
              }
              size={24}
              color={
                selectedValues.includes(option.name)
                  ? styles.button.backgroundColor // Match primaryColor
                  : styles.inputBase.borderColor
              }
            />
            <Text style={styles.checkboxLabel}>{option['label' + language]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors[element.name] && (
        <Text style={styles.errorText}>{errors[element.name]}</Text>
      )}
    </View>
  );
};

export default SelectMultiple;
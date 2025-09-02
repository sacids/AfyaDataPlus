import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isAfter, isBefore, isValid, parse } from 'date-fns';
import { useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore';

const DatePickerField = ({ element, value }) => {
  const { updateFormData, errors, language, schema } = useFormStore();
  const theme = useTheme();
  const styles = getStyles(theme);
  const label = getLabel(element, 'label', language, schema.language);
  const hint = getLabel(element, 'hint', language, schema.language);
  const constraintMessage = getLabel(element, 'constraintMsg', language, schema.language);

  const [showPicker, setShowPicker] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [internalDate, setInternalDate] = useState(value ? parseDate(value) : null);
  const [tempDate, setTempDate] = useState(value ? parseDate(value) : new Date());
  const inputRef = useRef(null);

  // Parse date based on appearance format or default to ISO
  function parseDate(dateString) {
    if (!dateString) return null;

    // Try different formats based on appearance
    const appearance = element.appearance || '';
    let formatString = 'yyyy-MM-dd'; // Default ISO format

    if (appearance.includes('month-year')) {
      formatString = 'yyyy-MM';
    } else if (appearance.includes('year')) {
      formatString = 'yyyy';
    }

    try {
      const parsed = parse(dateString, formatString, new Date());
      return isValid(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  // Format date based on appearance
  function formatDate(date) {
    if (!date || !isValid(date)) return '';

    const appearance = element.appearance || '';
    let formatString = 'yyyy-MM-dd'; // Default ISO format

    if (appearance.includes('month-year')) {
      formatString = 'yyyy-MM';
    } else if (appearance.includes('year')) {
      formatString = 'yyyy';
    }

    return format(date, formatString);
  }

  // Validate date against constraints
  function validateDate(date) {
    if (!element.constraint) return true;

    const dateValue = date ? formatDate(date) : '';

    // Simple constraint evaluation (in a real implementation, you'd use a proper expression evaluator)
    try {
      // This is a simplified constraint check - real implementation would need a proper expression parser
      if (element.constraint.includes('.') && dateValue) {
        const constraintParts = element.constraint.split('.');
        const operator = constraintParts[0];
        const constraintValue = constraintParts[1];

        if (operator === 'before' && date) {
          const constraintDate = parseDate(constraintValue);
          return constraintDate && isBefore(date, constraintDate);
        }

        if (operator === 'after' && date) {
          const constraintDate = parseDate(constraintValue);
          return constraintDate && isAfter(date, constraintDate);
        }
      }

      return true;
    } catch (e) {
      console.error('Constraint evaluation error:', e);
      return true;
    }
  }

  const handleDateChange = (event, selectedDate) => {
    if (event.type === 'set') {
      setShowPicker(false);

      // Apply appearance-based formatting
      let finalDate = selectedDate;
      const appearance = element.appearance || '';

      if (appearance.includes('month-year')) {
        // Set to first day of month and ignore day selection
        finalDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      } else if (appearance.includes('year')) {
        // Set to first day of year and ignore month/day selection
        finalDate = new Date(selectedDate.getFullYear(), 0, 1);
      }

      if (validateDate(finalDate)) {
        setInternalDate(finalDate);
        updateFormData(element.name, formatDate(finalDate));
      }
    } else {
      setShowPicker(false);
    }
  };

  const handleTextChange = (text) => {
    // Allow manual input with validation
    const parsed = parseDate(text);
    if (text === '' || (parsed && isValid(parsed) && validateDate(parsed))) {
      setInternalDate(parsed);
      updateFormData(element.name, text);
    }
  };

  const openPicker = () => {
    setTempDate(internalDate || new Date());
    setShowPicker(true);
  };

  const renderCalendarButton = () => {
    return (
      <TouchableOpacity onPress={openPicker} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center', borderRadius: 18, padding: 13, backgroundColor: theme.colors.primary }}>
        <Ionicons name="calendar-clear-outline" size={24} color="#fff" />
        <Text style={{ color: '#fff' }}>Select Date</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        {(element.required || element.constraint) && <Text style={styles.required}>*</Text>}
        <Text style={styles.label}>{label}</Text>
      </View>

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {/* <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[
            styles.inputBase,
            styles.textInput,
            errors[element.name] ? styles.inputError : null,
            element.appearance?.includes('no-calendar') ? { paddingRight: 10 } : {},
          ]}
          value={value || ''}
          onChangeText={handleTextChange}
          placeholder={getPlaceholder(element.appearance)}
          placeholderTextColor="#999"
          editable={!element.readonly}
        />
        
        {!element.appearance?.includes('no-calendar') && renderCalendarButton()}
      </View> */}
      <View style={styles.inputContainer}>
        {renderCalendarButton()}
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            errors[element.name] ? styles.inputError : null,
            { textAlign: 'center' },
          ]}
          value={value || 'No Date Selected'}
          onChangeText={handleTextChange}
          placeholder={getPlaceholder(element.appearance)}
          placeholderTextColor="#999"
          editable={!element.readonly}
        />
      </View>

      {errors[element.name] && (
        <Text style={styles.errorText}>
          {errors[element.name] === 'constraint' ? constraintMessage || 'Value does not meet constraints' : errors[element.name]}
        </Text>
      )}

      {showPicker && (
        <DateTimePicker
          value={tempDate || new Date()}
          mode={getPickerMode(element.appearance)}
          display="default"
          onChange={handleDateChange}
          maximumDate={getMaxDate(element.constraint)}
          minimumDate={getMinDate(element.constraint)}
        />
      )}
    </View>
  );
};

// Helper functions
function getPickerMode(appearance) {
  if (!appearance) return 'date';

  if (appearance.includes('month-year')) return 'date';
  if (appearance.includes('year')) return 'date';

  return 'date';
}

function getPlaceholder(appearance) {
  if (!appearance) return 'YYYY-MM-DD';

  if (appearance.includes('month-year')) return 'YYYY-MM';
  if (appearance.includes('year')) return 'YYYY';

  return 'YYYY-MM-DD';
}

function getMaxDate(constraint) {
  if (!constraint) return undefined;

  // Extract maximum date from constraint if available
  // This is a simplified version - real implementation would parse the constraint properly
  if (constraint.includes('.before(')) {
    try {
      const dateString = constraint.match(/\.before\(([^)]+)\)/)[1];
      return parseDate(dateString.replace(/'/g, ''));
    } catch (e) {
      return undefined;
    }
  }

  return undefined;
}

function getMinDate(constraint) {
  if (!constraint) return undefined;

  // Extract minimum date from constraint if available
  // This is a simplified version - real implementation would parse the constraint properly
  if (constraint.includes('.after(')) {
    try {
      const dateString = constraint.match(/\.after\(([^)]+)\)/)[1];
      return parseDate(dateString.replace(/'/g, ''));
    } catch (e) {
      return undefined;
    }
  }

  return undefined;
}

export default DatePickerField;
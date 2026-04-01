import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isValid, parse } from 'date-fns';
import { memo, useMemo, useState } from 'react';
import { Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore-xx';

const DatePickerField = ({ element }) => {
  // 1. GRANULAR SELECTORS (Fetch own value, ignore others)
  const updateFormData = useFormStore(state => state.updateFormData);
  const globalValue = useFormStore(state => state.formData[element.name]);
  const fieldError = useFormStore(state =>
    (state.errors && state.errors[element.name]) ? state.errors[element.name] : null
  );
  const language = useFormStore(state => state.language);
  const schemaLanguage = useFormStore(state => state.schema?.language);

  const theme = useTheme();
  const styles = getStyles(theme);

  // 2. HELPER: Get format based on appearance
  const getDateFormatString = useMemo(() => {
    const appearance = element.appearance || '';
    if (appearance.includes('month-year')) return 'yyyy-MM';
    if (appearance.includes('year')) return 'yyyy';
    return 'yyyy-MM-dd';
  }, [element.appearance]);

  // 3. LOCAL STATE (Buffer for snappy UI)
  const [showPicker, setShowPicker] = useState(false);

  // Parse the global string value into a Date object for the Picker
  const dateValue = useMemo(() => {
    if (!globalValue) return null;
    try {
      const parsed = parse(globalValue, getDateFormatString, new Date());
      return isValid(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }, [globalValue, getDateFormatString]);

  const handleDateChange = (event, selectedDate) => {
    // Android: 'set' means user clicked OK, 'dismissed' means Cancel
    // iOS: picker stays open, we update on every scroll
    if (Platform.OS === 'android') setShowPicker(false);

    if (event.type === 'set' && selectedDate) {
      const formatted = format(selectedDate, getDateFormatString);

      // Update store after the picker UI transition is safe
      requestAnimationFrame(() => {
        updateFormData(element.name, formatted);
      });
    }
  };

  const label = getLabel(element, 'label', language, schemaLanguage);
  const hint = getLabel(element, 'hint', language, schemaLanguage);

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          {element.required && <Text style={styles.required}>*</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}

      {hint && <Text style={styles.hint}>{hint}</Text>}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 15,
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: theme.colors.primary
          }}
        >
          <Ionicons name="calendar-outline" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Select</Text>
        </TouchableOpacity>

        <TextInput
          style={[
            styles.inputBase,
            styles.textInput,
            { flex: 1, textAlign: 'center' },
            fieldError ? styles.inputError : null,
          ]}
          value={globalValue || ''}
          editable={false} // Force use of picker to prevent invalid manual strings
          placeholder={getDateFormatString.toUpperCase()}
          placeholderTextColor="#999"
        />
      </View>

      {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}

      {showPicker && (
        <DateTimePicker
          value={dateValue || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        // Note: constraints should be handled in validation logic rather than hard-locking the picker
        />
      )}
    </View>
  );
};

export default memo(DatePickerField);
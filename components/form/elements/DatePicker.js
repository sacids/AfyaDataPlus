import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isValid, parse } from 'date-fns';
import { memo, useMemo, useState } from 'react';
import { Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/useFormStore';

const DatePickerField = ({ element, globalValue }) => {
  // 1. STORE SELECTORS (Matching SelectOne logic)
  const updateField = useFormStore(state => state.updateField);
  const fieldError = useFormStore(state => state.errors[element.name]);
  const language = useFormStore(state => state.language);
  const schemaLanguage = useFormStore(state => state.schema?.form_defn?.languages);

  const theme = useTheme();
  const styles = getStyles(theme);

  // 2. HELPER: Get format based on appearance
  const getDateFormatString = useMemo(() => {
    const appearance = element.appearance || '';
    if (appearance.includes('month-year')) return 'yyyy-MM';
    if (appearance.includes('year')) return 'yyyy';
    return 'yyyy-MM-dd';
  }, [element.appearance]);

  // 3. LOCAL STATE
  const [showPicker, setShowPicker] = useState(false);

  // Parse global string into Date object
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
    if (Platform.OS === 'android') setShowPicker(false);

    if (event.type === 'set' && selectedDate) {
      const formatted = format(selectedDate, getDateFormatString);

      // DEFERRED UPDATE: Matching SelectOne's requestAnimationFrame strategy
      requestAnimationFrame(() => {
        updateField(element.name, formatted);
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
            paddingVertical: 14,
            borderRadius: 10,
            backgroundColor: theme.colors.primary,
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
          editable={false}
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
        />
      )}
    </View>
  );
};

export default memo(DatePickerField);
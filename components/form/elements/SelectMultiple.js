import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/useFormStore';

// 1. Memoized Pressable Item for Modal
// eslint-disable-next-line react/display-name
const SelectOptionItem = React.memo(({ option, isSelected, onToggle, theme, styles, language, schemaLanguage }) => {
  return (
    <Pressable
      hitSlop={10}
      style={({ pressed }) => [
        styles.checkboxContainer,
        { opacity: pressed ? 0.7 : 1.0 }
      ]}
      onPress={() => onToggle(option.name)}
    >
      <MaterialCommunityIcons
        name={isSelected ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
        size={24}
        color={isSelected ? theme.colors.primary : styles.inputBase.borderColor}
      />

      <Text style={styles.checkboxLabel}>
        {getLabel(option, 'label', language, schemaLanguage)}
      </Text>
    </Pressable>
  );
});

// Chip component for selected items
const SelectedChip = ({ label, onRemove }) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.selectedChip}>
      <Text style={styles.selectedChipText}>{label}</Text>
      <Pressable onPress={onRemove} hitSlop={8}>
        <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.text} />
      </Pressable>
    </View>
  );
};

const SelectMultiple = ({ element, globalValue }) => {
  const updateField = useFormStore(state => state.updateField);
  const language = useFormStore(state => state.language);
  const fieldError = useFormStore(state => state.errors[element.name]);
  const schemaLanguage = useFormStore(state => state.schema.form_defn.languages);
  const getFilteredOptions = useFormStore(state => state.getFilteredOptions);

  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // Check if minimal appearance is requested
  const isMinimal = element.appearance?.toLowerCase() === 'minimal';

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);

  // Filtering
  const dependencyKeys = useMemo(() => {
    if (!element.choice_filter) return [];
    const matches = element.choice_filter.match(/\${(.*?)}/g) || [];
    return matches.map(m => m.replace(/[${}]/g, ''));
  }, [element.choice_filter]);

  const dependencyValuesString = useFormStore(
    useCallback((state) =>
      dependencyKeys.map(key => state.formData[key] || '').join('|'),
      [dependencyKeys]
    ),
    (oldVal, newVal) => oldVal === newVal
  );

  const availableOptions = useMemo(() => {
    return getFilteredOptions(element);
  }, [element, dependencyValuesString, getFilteredOptions]);

  // Local state
  const [localSelected, setLocalSelected] = useState(new Set(
    Array.isArray(globalValue) ? globalValue : []
  ));

  const lastCommittedValue = useRef(JSON.stringify(Array.from(localSelected)));
  const timerRef = useRef(null);

  // Sync local state if globalValue changes externally
  useEffect(() => {
    const globalStr = JSON.stringify(globalValue || []);
    if (globalStr !== lastCommittedValue.current) {
      setLocalSelected(new Set(Array.isArray(globalValue) ? globalValue : []));
      lastCommittedValue.current = globalStr;
    }
  }, [globalValue]);

  // Sync to store with debounce
  const syncToStore = useCallback((currentSet) => {
    const arrayValue = Array.from(currentSet);
    const newValueStr = JSON.stringify(arrayValue);

    if (newValueStr !== lastCommittedValue.current) {
      lastCommittedValue.current = newValueStr;
      updateField(element.name, arrayValue);
    }
  }, [element.name, updateField]);

  const handleToggle = useCallback((optionName) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(optionName)) next.delete(optionName);
      else next.add(optionName);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        syncToStore(next);
      }, 350);

      return next;
    });
  }, [syncToStore]);

  const handleRemoveChip = useCallback((optionName) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      next.delete(optionName);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        syncToStore(next);
      }, 350);

      return next;
    });
  }, [syncToStore]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Get labels for selected options
  const selectedLabels = useMemo(() => {
    return Array.from(localSelected).map(optionName => {
      const option = availableOptions.find(opt => opt.name === optionName);
      return {
        name: optionName,
        label: option ? getLabel(option, 'label', language, schemaLanguage) : optionName
      };
    });
  }, [localSelected, availableOptions, language, schemaLanguage]);

  const label = getLabel(element, 'label', language, schemaLanguage);
  const hint = getLabel(element, 'hint', language, schemaLanguage);

  // If no options, don't render
  if (availableOptions.length === 0) return null;

  // Minimal appearance render
  if (isMinimal) {
    return (
      <>
        {label && (
          <View style={styles.labelContainer}>
            {element.required && <Text style={styles.required}>*</Text>}
            <Text style={styles.label}>{label}</Text>
          </View>
        )}
        {hint && <Text style={styles.hint}>{hint}</Text>}

        <View style={[styles.inputBase, fieldError ? styles.inputError : null]}>
          {/* Selected chips container */}
          <View style={styles.selectedChipsContainer}>
            {selectedLabels.length > 0 ? (
              selectedLabels.map(({ name, label: itemLabel }) => (
                <SelectedChip
                  key={name}
                  label={itemLabel}
                  onRemove={() => handleRemoveChip(name)}
                />
              ))
            ) : (
              <Text style={styles.placeholderText}>None selected</Text>
            )}
          </View>

          {/* Select button */}
          <Pressable
            style={({ pressed }) => [
              styles.minimalSelectButton,
              { opacity: pressed ? 0.8 : 1 }
            ]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.minimalSelectButtonText}>{t('formElements:selectMultiple')}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.text} />
          </Pressable>
        </View>

        {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}

        {/* Modal for options */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{label || 'Select options'}</Text>
                <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={true}
              >
                {availableOptions.map((option) => (
                  <SelectOptionItem
                    key={option.name}
                    option={option}
                    isSelected={localSelected.has(option.name)}
                    onToggle={(optionName) => {
                      handleToggle(optionName);
                      // Keep modal open to allow multiple selections
                    }}
                    theme={theme}
                    styles={styles}
                    language={language}
                    schemaLanguage={schemaLanguage}
                  />
                ))}
              </ScrollView>

              <View style={styles.modalFooter}>
                <Pressable
                  style={styles.modalDoneButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalDoneButtonText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      </>
    );
  }

  // Default appearance (original)
  return (
    <>
      {label && (
        <View style={styles.labelContainer}>
          {element.required && <Text style={styles.required}>*</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
      {hint && <Text style={styles.hint}>{hint}</Text>}

      <View style={[styles.inputBase, styles.selectMultiple, fieldError ? styles.inputError : null]}>
        {availableOptions.map((option) => (
          <SelectOptionItem
            key={option.name}
            option={option}
            isSelected={localSelected.has(option.name)}
            onToggle={handleToggle}
            theme={theme}
            styles={styles}
            language={language}
            schemaLanguage={schemaLanguage}
          />
        ))}
      </View>

      {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
    </>
  );
};

export default React.memo(SelectMultiple);
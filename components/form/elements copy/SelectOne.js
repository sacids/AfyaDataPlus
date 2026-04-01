// SelectOne.js
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { memo, useEffect, useMemo, useState, useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/useFormStore';

const SelectOne = ({ element }) => {
    // Store selectors
    const updateField = useFormStore(state => state.updateField);
    const globalValue = useFormStore(state => state.formData[element.name]);
    const language = useFormStore(state => state.language);
    const fieldError = useFormStore(state => state.errors[element.name]);
    const schemaLanguage = useFormStore(state => state.schema?.form_defn?.languages);
    
    // ✅ Subscribe to choice filter version
    const choiceFilterVersion = useFormStore(state => state.choiceFilterVersion);
    
    // ✅ Get the store methods
    const getFilteredOptions = useFormStore(state => state.getFilteredOptions);
    const registerChoiceFilter = useFormStore(state => state.registerChoiceFilter);
    
    const theme = useTheme();
    const styles = getStyles(theme);
    
    const [localValue, setLocalValue] = useState(globalValue);
    const hasRegistered = useRef(false);
    
    // ✅ Extract dependencies from choice_filter
    const extractDependencies = (expression) => {
        if (!expression) return [];
        const dependencies = [];
        const varRegex = /\${(\w+)}/g;
        let match;
        while ((match = varRegex.exec(expression)) !== null) {
            dependencies.push(match[1]);
        }
        return dependencies;
    };
    
    // ✅ Register choice filter dependencies once
    useEffect(() => {
        if (!hasRegistered.current && element.choice_filter) {
            const dependencies = extractDependencies(element.choice_filter);
            if (dependencies.length > 0) {
                registerChoiceFilter(element.name, dependencies);
                hasRegistered.current = true;
            }
        }
    }, [element.name, element.choice_filter, registerChoiceFilter]);
    
    useEffect(() => {
        setLocalValue(globalValue);
    }, [globalValue]);
    
    // ✅ Available options - depends on choiceFilterVersion
    const availableOptions = useMemo(() => {
        // Force re-evaluation when choiceFilterVersion changes
        const _ = choiceFilterVersion; // This creates the dependency
        
        return getFilteredOptions(element);
    }, [element, getFilteredOptions, choiceFilterVersion]);
    
    if (availableOptions.length === 0) return null;
    
    const selectedValue = typeof localValue === 'string' ? localValue : null;
    
    const handleSelect = (optionValue) => {
        const newValue = selectedValue === optionValue ? null : optionValue;
        setLocalValue(newValue);
        
        requestAnimationFrame(() => {
            updateField(element.name, newValue);
        });
    };
    
    const label = getLabel(element, 'label', language, schemaLanguage);
    const hint = getLabel(element, 'hint', language, schemaLanguage);
    
    const isSlider = element.appearance?.includes('slider') || element.appearance?.includes('slide');
    const isPicker = element.appearance?.includes('picker') || element.appearance?.includes('dropdown') || element.appearance?.includes('minimal');
    
    // Render helpers
    const renderLabel = () => label && (
        <View style={styles.labelContainer}>
            {element.required && <Text style={styles.required}>*</Text>}
            <Text style={styles.label}>{label}</Text>
        </View>
    );
    
    const renderHint = () => hint && <Text style={styles.hint}>{hint}</Text>;
    const renderError = () => fieldError && <Text style={styles.errorText}>{fieldError}</Text>;
    
    // Slider Appearance
    if (isSlider) {
        const currentIndex = selectedValue ? availableOptions.findIndex(opt => opt.name === selectedValue) : 0;
        
        return (
            <View style={styles.container}>
                {renderLabel()}
                {renderHint()}
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={availableOptions.length - 1}
                    step={1}
                    value={currentIndex}
                    onValueChange={(idx) => {
                        const selectedOption = availableOptions[Math.round(idx)];
                        if (selectedOption) handleSelect(selectedOption.name);
                    }}
                    minimumTrackTintColor={theme.colors.primary}
                    thumbTintColor={theme.colors.primary}
                />
                <Text style={styles.label}>
                    {selectedValue ? getLabel(availableOptions.find(opt => opt.name === selectedValue), 'label', language, schemaLanguage) : ''}
                </Text>
                {renderError()}
            </View>
        );
    }
    
    // Picker Appearance
    if (isPicker) {
        return (
            <View style={styles.container}>
                {renderLabel()}
                {renderHint()}
                <View style={[styles.inputBase, styles.pickerContainer, fieldError ? styles.inputError : null]}>
                    <Picker
                        selectedValue={selectedValue}
                        onValueChange={handleSelect}
                        style={styles.picker}
                        mode="dropdown"
                    >
                        <Picker.Item label="Select an option..." value={null} />
                        {availableOptions.map((option) => (
                            <Picker.Item
                                key={option.name}
                                label={getLabel(option, 'label', language, schemaLanguage)}
                                value={option.name}
                            />
                        ))}
                    </Picker>
                </View>
                {renderError()}
            </View>
        );
    }
    
    // Default Radio Buttons
    return (
        <View style={styles.container}>
            {renderLabel()}
            {renderHint()}
            <View style={[styles.inputBase, fieldError ? styles.inputError : null]}>
                {availableOptions.map((option) => (
                    <TouchableOpacity
                        key={option.name}
                        style={styles.checkboxContainer}
                        onPress={() => handleSelect(option.name)}
                    >
                        <MaterialIcons
                            name={selectedValue === option.name ? 'radio-button-checked' : 'radio-button-unchecked'}
                            size={24}
                            color={selectedValue === option.name ? theme.colors.primary : styles.inputBase?.borderColor || '#ccc'}
                        />
                        <Text style={styles.checkboxLabel}>
                            {getLabel(option, 'label', language, schemaLanguage)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {renderError()}
        </View>
    );
};

export default memo(SelectOne);
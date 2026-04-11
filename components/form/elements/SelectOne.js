import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { memo, useCallback, useMemo } from 'react'; // Added memo
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/useFormStore';

const SelectOne = ({ element, globalValue }) => {

    //console.log('in select one')
    // 1. STORE SELECTORS
    const updateField = useFormStore(state => state.updateField);
    //const globalValue = useFormStore(state => state.formData[element.name]);
    const language = useFormStore(state => state.language);
    const fieldError = useFormStore(state => state.errors[element.name]);
    const schemaLanguage = useFormStore(state => state.schema.form_defn.languages);

    //console.log('select one', element)

    const theme = useTheme();
    const styles = getStyles(theme);

    // 2. LOCAL STATE: Sync with globalValue to keep UI snappy
    //const [localValue, setLocalValue] = useState(globalValue);


    const getFilteredOptions = useFormStore(state => state.getFilteredOptions);

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


    



    if (availableOptions.length === 0) return null;

    const selectedValue = typeof globalValue === 'string' ? globalValue : null;

    const handleSelect = (optionValue) => {
        // If the same option is selected, allow deselecting (set to null)
        console.log('local value changed')
        const newValue = selectedValue === optionValue ? null : optionValue;

        // 3. DEFERRED UPDATE: Let animations/pickers finish before heavy logic runs
        requestAnimationFrame(() => {
            updateField(element.name, newValue);
        });
    };

    const label = getLabel(element, 'label', language, schemaLanguage);
    const hint = getLabel(element, 'hint', language, schemaLanguage);


    const isSlider = element.appearance?.includes('slider') || element.appearance?.includes('slide');
    const isPicker = element.appearance?.includes('picker') || element.appearance?.includes('dropdown') || element.appearance?.includes('minimal');

    // --- RENDER HELPERS ---
    const renderLabel = () => label && (
        <View style={styles.labelContainer}>
            {element.required && <Text style={styles.required}>*</Text>}
            <Text style={styles.label}>{label}</Text>
        </View>
    );

    const renderHint = () => hint && <Text style={styles.hint}>{hint}</Text>;

    const renderError = () => fieldError && <Text style={styles.errorText}>{fieldError}</Text>;

    // 1. Slider Appearance
    if (isSlider) {
        const options = availableOptions;
        const currentIndex = selectedValue ? options.findIndex(opt => opt.name === selectedValue) : 0;

        return (
            <View style={styles.container}>
                {renderLabel()}
                {renderHint()}
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={options.length - 1}
                    step={1}
                    value={currentIndex}
                    onValueChange={(idx) => {
                        const selectedOption = options[Math.round(idx)];
                        if (selectedOption) handleSelect(selectedOption.name);
                    }}
                    minimumTrackTintColor={theme.colors.primary}
                    thumbTintColor={theme.colors.primary}
                />
                <Text style={styles.label}>
                    {selectedValue ? getLabel(options.find(opt => opt.name === selectedValue), 'label', language, schemaLanguage) : ''}
                </Text>
                {renderError()}
            </View>
        );
    }

    // 2. Picker Appearance
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

    // 3. Default Radio Buttons
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
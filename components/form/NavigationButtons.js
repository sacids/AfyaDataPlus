import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { useFormStore } from '../../store/FormStore';

const NavigationButtons = () => {
    const { currentPage, schema, validateAndNavigate } = useFormStore();
    const isLastPage = schema ? currentPage === schema.pages.length : false;

    const colors = useTheme();
    const styles = getStyles(colors);

    return (
        <View style={[styles.container, { justifyContent: 'space-between', flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 15 }]}>

            <TouchableOpacity
                style={[styles.button, currentPage === 0 && { backgroundColor: '#444' }]}
                onPress={() => validateAndNavigate('prev')}
                disabled={currentPage === 0}
            >
                <Text style={styles.buttonText}>Prev</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, isLastPage && { backgroundColor: '#444' }]}
                onPress={() =>
                    isLastPage ? alert('Submit Form') : validateAndNavigate('next')
                }
                disabled={isLastPage}
            >
                <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
        </View>
    );
};


export default NavigationButtons;
import { CameraView, useCameraPermissions } from 'expo-camera';
import { memo, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/useFormStore';

const BarcodeField = ({ element, globalValue }) => {
    const updateField = useFormStore(state => state.updateField);
    const fieldError = useFormStore(state =>
        (state.errors && state.errors[element.name]) ? state.errors[element.name] : null
    );
    const language = useFormStore(state => state.language);
    const schemaLanguage = useFormStore(state => state.schema?.language);

    const theme = useTheme();
    const styles = getStyles(theme);

    const [permission, requestPermission] = useCameraPermissions();
    const [isScanning, setIsScanning] = useState(false);

    const label = getLabel(element, 'label', language, schemaLanguage);
    const hint = getLabel(element, 'hint', language, schemaLanguage);

    const handleBarcodeScanned = ({ data }) => {
        setIsScanning(false);
        requestAnimationFrame(() => {
            updateField(element.name, data);
        });
    };

    const handleOpenScanner = async () => {
        if (!permission || !permission.granted) {
            const result = await requestPermission();
            if (!result.granted) return;
        }
        setIsScanning(true);
    };

    if (!permission) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.hint, { textAlign: 'center' }]}>Initializing camera...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {label && (
                <View style={styles.labelContainer}>
                    {element.required && <Text style={styles.required}>*</Text>}
                    <Text style={styles.label}>{label}</Text>
                </View>
            )}

            {hint && <Text style={styles.hint}>{hint}</Text>}

            {!isScanning ? (
                <View style={[
                    styles.inputBase,
                    {
                        backgroundColor: theme.colors.inputBackground || '#f9f9f9',
                        borderColor: fieldError ? theme.colors.error : (theme.colors.inputBorder || '#ccc'),
                        padding: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8,
                        borderWidth: 1
                    }
                ]}>
                    <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Scanned Result:</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
                        {globalValue || 'No Data'}
                    </Text>

                    <TouchableOpacity
                        style={[styles.button, { marginTop: 15, width: '100%', backgroundColor: theme.colors.primary }]}
                        onPress={handleOpenScanner}
                    >
                        <Text style={[styles.buttonText, { color: '#fff', textAlign: 'center' }]}>
                            {globalValue ? 'Rescan' : 'Open Scanner'}
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                /* CRITICAL: The outer View container MUST have a fixed height/width 
                  and positioning context for absolute fill to attach to.
                */
                <View style={{
                    height: 300,
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 12,
                    backgroundColor: '#111', // Slightly off-black so you can tell if the box is there
                    borderWidth: 2,
                    borderColor: theme.colors.primary
                }}>

                    {!permission.granted ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                            <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 10 }}>Camera permission required.</Text>
                            <TouchableOpacity onPress={requestPermission} style={{ backgroundColor: theme.colors.primary, padding: 10, borderRadius: 5 }}>
                                <Text style={{ color: '#fff' }}>Grant Permission</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <CameraView
                            style={{
                                width: '100%',
                                height: '100%',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                zIndex: 999 // Force it to draw above the background color layer
                            }}
                            facing="back"
                            onBarcodeScanned={handleBarcodeScanned}
                            barcodeScannerSettings={{
                                // FIXED: lowercase 'barcodeTypes'
                                barcodeTypes: ['qr', 'ean13', 'upc_a', 'code128', 'ean8', 'upc_e', 'aztec', 'pdf417'],
                            }}
                        />
                    )}

                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            bottom: 20,
                            alignSelf: 'center',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            borderRadius: 20
                        }}
                        onPress={() => setIsScanning(false)}
                    >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}

            {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
        </View>
    );
};

export default memo(BarcodeField);
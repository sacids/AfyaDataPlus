import { Camera, CameraView } from 'expo-camera';
import { memo, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore';

const BarcodeField = ({ element }) => {
    // 1. GRANULAR SELECTORS: Only listen to THIS field's data
    const updateFormData = useFormStore(state => state.updateFormData);
    const globalValue = useFormStore(state => state.formData[element.name]);
    const fieldError = useFormStore(state =>
        (state.errors && state.errors[element.name]) ? state.errors[element.name] : null
    );
    const language = useFormStore(state => state.language);
    const schemaLanguage = useFormStore(state => state.schema?.language);

    const theme = useTheme();
    const styles = getStyles(theme);

    const [hasPermission, setHasPermission] = useState(null);
    const [isScanning, setIsScanning] = useState(false);

    const label = getLabel(element, 'label', language, schemaLanguage);
    const hint = getLabel(element, 'hint', language, schemaLanguage);

    // 2. SAFE PERMISSION REQUEST: Use isMounted guard
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const { status } = await Camera.requestCameraPermissionsAsync();
                if (isMounted) setHasPermission(status === 'granted');
            } catch (e) {
                console.error("Camera permission error", e);
            }
        })();
        return () => { isMounted = false; };
    }, []);

    const handleBarcodeScanned = ({ data }) => {
        setIsScanning(false); // Close camera immediately

        // Defer store update to ensure the camera UI unmounts smoothly first
        requestAnimationFrame(() => {
            updateFormData(element.name, data);
        });
    };

    if (hasPermission === null) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.hint, { textAlign: 'center' }]}>Initializing camera...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Camera access denied. Please check settings.</Text>
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

            {/* 3. SHOW VALUE OR CAMERA */}
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
                        onPress={() => setIsScanning(true)}
                    >
                        <Text style={[styles.buttonText, { color: '#fff', textAlign: 'center' }]}>
                            {globalValue ? 'Rescan' : 'Open Scanner'}
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={{ height: 300, overflow: 'hidden', borderRadius: 12, backgroundColor: '#000' }}>
                    <CameraView
                        style={{ flex: 1 }}
                        facing="back"
                        onBarcodeScanned={handleBarcodeScanned}
                        barcodeScannerSettings={{
                            barCodeTypes: ['qr', 'ean13', 'upc_a', 'code128', 'ean8', 'upc_e', 'aztec', 'pdf417'],
                        }}
                    />
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            bottom: 20,
                            alignSelf: 'center',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            padding: 10,
                            borderRadius: 20
                        }}
                        onPress={() => setIsScanning(false)}
                    >
                        <Text style={{ color: '#fff' }}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}

            {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
        </View>
    );
};

export default memo(BarcodeField);
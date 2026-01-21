import { Camera, CameraView } from 'expo-camera';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore';

const BarcodeField = ({ element, value }) => {
    const { updateFormData, errors, language, schema } = useFormStore();
    const theme = useTheme();
    const styles = getStyles(theme);
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(true);

    const label = getLabel(element, 'label', language, schema.language);
    const hint = getLabel(element, 'hint', language, schema.language);

    // Request camera permission
    useEffect(() => {
        const getCameraPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };

        getCameraPermissions();
    }, []);

    const handleBarcodeScanned = ({ type, data }) => {
        setScanned(true);
        updateFormData(element.name, data);
        //console.log(`Barcode with type ${type} and data ${data} has been scanned!`);
    };

    const handleScanAgain = () => {
        setScanned(false);
        updateFormData(element.name, '');
    };

    if (hasPermission === null) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Requesting camera permission...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>No access to camera</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Label Section */}
            {label ? (
                <View style={styles.labelContainer}>
                    {element.required && <Text style={styles.required}>*</Text>}
                    <Text style={styles.label}>{label}</Text>
                </View>
            ) : null}

            {/* Hint Section */}
            {hint && <Text style={styles.hint}>{hint}</Text>}

            {/* Scanned Result Display */}
            {scanned && (
                <View style={[
                    styles.inputBase,
                    {
                        backgroundColor: theme.colors.inputBackground,
                        borderColor: theme.colors.inputBorder,
                        marginBottom: 8,
                        paddingVertical: 37
                    }
                ]}>
                    <Text style={[styles.secTextInput, { marginBottom: 4, textAlign: 'center' }]}>Scanned Code:</Text>
                    <Text style={[styles.textInput, { fontWeight: 'bold', textAlign: 'center' }]}>{value ? value : 'No Code Scanned'}</Text>
                </View>
            )}

            {/* Camera or Scan Again Button */}
            <View style={styles.inputContainer}>
                {scanned ? (
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleScanAgain}
                    >
                        <Text style={styles.buttonText}>Scan</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        <CameraView
                            style={[styles.camera]}
                            facing="back"
                            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                            barcodeScannerSettings={{
                                barCodeTypes: ['qr', 'ean13', 'upc_a', 'code128', 'ean8', 'upc_e', 'aztec', 'pdf417'],
                            }}
                        />

                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => setScanned(true)}
                        >
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* Error Display */}
            {
                errors[element.name] && (
                    <Text style={styles.errorText}>{errors[element.name]}</Text>
                )
            }
        </View >
    );
};

export default BarcodeField;
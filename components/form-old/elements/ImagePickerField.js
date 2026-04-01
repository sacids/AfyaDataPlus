import { Directory, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator'; // Add this
import * as ImagePicker from 'expo-image-picker';
import { memo, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { getParam } from '../../../lib/form/validation';
import { useFormStore } from '../../../store/FormStore-xx';

const ImagePickerField = ({ element }) => {
  const updateFormData = useFormStore(state => state.updateFormData);
  const globalValue = useFormStore(state => state.formData[element.name]);
  const formUUID = useFormStore(state => state.formUUID);
  const { language, schema, errors } = useFormStore();

  const theme = useTheme();
  const styles = getStyles(theme);
  const [isProcessing, setIsProcessing] = useState(false);


  const imageUri = useMemo(() => {
    if (!globalValue || !formUUID) return null;
    try {
      const imageFile = new File(Paths.document, formUUID, globalValue);
      return imageFile.uri;
    } catch (error) {
      return null;
    }
  }, [globalValue, formUUID]);

  const pickImage = async (fromCamera = false) => {


    const quality = parseFloat(getParam('image-quality', '1'));

    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Permission is required.');
      return;
    }

    const result = await (fromCamera
      ? ImagePicker.launchCameraAsync({ quality: quality })
      : ImagePicker.launchImageLibraryAsync({ quality: quality }));

    if (!result.canceled) {
      setIsProcessing(true);
      try {
        let sourceUri = result.assets[0].uri;
        const maxPixels = parseInt(getParam(element, 'max-pixels'));

        // 2. AUTO-RESIZE LOGIC
        if (maxPixels && (result.assets[0].width > maxPixels || result.assets[0].height > maxPixels)) {
          const actions = [];

          // Determine scale maintaining aspect ratio
          if (result.assets[0].width > result.assets[0].height) {
            actions.push({ resize: { width: maxPixels } });
          } else {
            actions.push({ resize: { height: maxPixels } });
          }

          const manipulatedImage = await ImageManipulator.manipulateAsync(
            sourceUri,
            actions,
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          sourceUri = manipulatedImage.uri;
        }

        // 3. SAVE TO PERMANENT STORAGE
        const formDirectory = new Directory(Paths.document, formUUID);
        if (!formDirectory.exists) formDirectory.create();

        const filename = sourceUri.split('/').pop();
        const newFileName = `${element.name}__${Date.now()}__${filename}`;

        const destFile = new File(formDirectory, newFileName);
        const sourceFile = new File(sourceUri);

        sourceFile.copy(destFile);

        requestAnimationFrame(() => {
          updateFormData(element.name, newFileName);
          setIsProcessing(false);
        });

      } catch (err) {
        console.error('Image processing failed', err);
        Alert.alert('Error', 'Failed to process image.');
        setIsProcessing(false);
      }
    }
  };

  const label = getLabel(element, 'label', language, schema?.language);

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          {element.required && <Text style={styles.required}>*</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}


      <View style={[styles.mapContainer, { height: 200, backgroundColor: '#f0f0f0', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: errors?.[element.name] ? 'red' : '#ccc' }]}>
        {isProcessing ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        ) : (
          <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
            <Text style={{ color: '#999' }}>No image selected</Text>
          </View>

        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <TouchableOpacity onPress={() => pickImage(false)} style={[styles.button, { flex: 1, backgroundColor: theme.colors.primary }]}>
          <Text style={{ color: '#fff', textAlign: 'center' }}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => pickImage(true)} style={[styles.button, { flex: 1, backgroundColor: theme.colors.primary }]}>
          <Text style={{ color: '#fff', textAlign: 'center' }}>Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default memo(ImagePickerField);
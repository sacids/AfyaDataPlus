import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore';


const ImagePickerField = ({ element, value }) => {
  const { updateFormData, errors, formUUID, language, formData, schema } = useFormStore();
  const theme = useTheme();
  const styles = getStyles(theme);


  const label = getLabel(element, 'label', language, schema.language)
  const hint = getLabel(element, 'hint', language, schema.language)

  // Helper function to get image URI using File class
  const getImageUri = (imageFileName) => {
    if (!imageFileName || !formUUID) return null;

    try {
      const imageFile = new File(Paths.document, formUUID, imageFileName);
      return imageFile.uri;
    } catch (error) {
      console.log('Error creating file path:', error);
      return null;
    }
  };

  const pickImage = async (fromCamera = false) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Permission is required to select an image.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.5, base64: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.5, base64: false });

    if (!result.canceled) {
      const originalUri = result.assets[0].uri;
      const filename = originalUri.split('/').pop();

      try {
        // Create form directory using Directory class
        const formDirectory = new Directory(Paths.document, formUUID);

        // Check if directory exists using the property (not function)
        if (!formDirectory.exists) {
          formDirectory.create();
        }

        const newFileName = `${element.name}__${filename}`;

        // Create destination file using Directory's createFile method
        const destFile = new File(formDirectory, newFileName);

        // Create source file from the picked image URI
        const sourceFile = new File(originalUri);

        // Copy the image to the destination using the copy() method
        sourceFile.copy(destFile);

        updateFormData(element.name, newFileName);

      } catch (err) {
        console.error('Image saving failed', err);
        Alert.alert('Error', 'Failed to save the image.');
      }
    }
  };

  const imageUri = getImageUri(value);

  return (
    <View style={styles.container}>
      {
        label ? (<View style={styles.labelContainer}>
          {(element.required) && <Text style={styles.required}>*</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>) : null
      }
      {
        hint && (<Text style={styles.hint}>{hint}</Text>)
      }

      <View
        style={[
          styles.mapContainer,
          errors[element.name] ? styles.inputError : null,
          {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.inputBackground,
          },
        ]}
      >
        {value && imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={[{ width: 165, height: 165, borderRadius: 4 }, styles.noLocation]}
          />
        ) : (

          <View style={[styles.map, styles.noLocation]}>
            <Text style={styles.placeholderText}>No image selected</Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', flex: 1, gap: 10 }}>
        <TouchableOpacity onPress={() => pickImage(false)} style={[{ flex: 1 }, styles.button]}>
          <Text style={styles.buttonText}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => pickImage(true)} style={[{ flex: 1 }, styles.button]}>
          <Text style={styles.buttonText}>Camera</Text>
        </TouchableOpacity>
      </View>

      {errors[element.name] && (
        <Text style={styles.errorText}>{errors[element.name]}</Text>
      )}
    </View>
  );
};

export default ImagePickerField;
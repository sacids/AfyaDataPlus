import * as Location from 'expo-location';
import { memo, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore';

const GeoPoint = ({ element }) => {
  // 1. SELECTORS: Fetch data internally to avoid parent re-renders
  const updateFormData = useFormStore(state => state.updateFormData);

  // Use the safety pattern for errors to avoid the "Cannot convert undefined to object" crash
  const error = useFormStore(state =>
    (state.errors && state.errors[element.name]) ? state.errors[element.name] : null
  );

  // Fetch the value internally
  const globalValue = useFormStore(state => state.formData[element.name]);

  const language = useFormStore(state => state.language);
  const schemaLanguage = useFormStore(state => state.schema?.language);

  const [locationPermission, setLocationPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme();
  const styles = getStyles(theme);

  // 2. STRICTOR NULL SAFETY
  // We check if globalValue is an object and has the keys we need
  const geoValue = globalValue &&
    typeof globalValue === 'object' &&
    globalValue.latitude != null &&
    globalValue.longitude != null
    ? globalValue
    : null;

  const label = getLabel(element, 'label', language, schemaLanguage);
  const hint = getLabel(element, 'hint', language, schemaLanguage);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (isMounted) setLocationPermission(status === 'granted');
      } catch (e) {
        console.error("Permission request failed", e);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const setCurrentLocation = async () => {
    if (!locationPermission) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location permissions in settings.');
        return;
      }
      setLocationPermission(true);
    }

    setIsLoading(true);
    try {
      // Accuracy.Low or Balanced is faster and less likely to crash/hang than High
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000 // Increased timeout for slower devices
      });

      const newGeoPoint = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };

      // Defer store update to keep UI responsive
      requestAnimationFrame(() => {
        updateFormData(element.name, newGeoPoint);
      });
    } catch (err) {
      Alert.alert('Location Error', 'Could not fetch coordinates. Check your GPS signal.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearGeoPoint = () => {
    Alert.alert('Remove Geopoint', 'Clear this location?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => updateFormData(element.name, null) },
    ]);
  };

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          {element.required && <Text style={styles.required}>*</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
      {hint && <Text style={styles.hint}>{hint}</Text>}

      <View style={[styles.mapContainer, error ? styles.inputError : null, { height: 200, overflow: 'hidden', borderRadius: 8 }]}>
        {geoValue ? (
          <>
            <MapView
              style={styles.map}
              liteMode={true}
              key={`${geoValue.latitude}-${geoValue.longitude}`} // Force re-render only when coordinates change
              initialRegion={{
                latitude: geoValue.latitude,
                longitude: geoValue.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker coordinate={{ latitude: geoValue.latitude, longitude: geoValue.longitude }} />
            </MapView>
            <View style={{ position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(255,255,255,0.7)', padding: 2, borderRadius: 4 }}>
              <Text style={{ fontSize: 10 }}>
                {geoValue.latitude.toFixed(5)}, {geoValue.longitude.toFixed(5)}
              </Text>
            </View>
          </>
        ) : (
          <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
            <Text style={{ color: '#999' }}>No location selected</Text>
          </View>
        )}

        {isLoading && (
          <View style={[styles.loadingContainer, { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.6)', width: '100%', height: '100%', justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, { marginTop: 10, backgroundColor: theme.colors.primary, padding: 12, borderRadius: 8 }]}
        onPress={setCurrentLocation}
        onLongPress={geoValue ? clearGeoPoint : null}
        disabled={isLoading}
      >
        <Text style={[styles.buttonText, { textAlign: 'center', color: '#fff', fontWeight: 'bold' }]}>
          {geoValue ? 'Refresh Location' : 'Capture Location'}
        </Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

export default memo(GeoPoint);
import * as Location from 'expo-location';
import { memo, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/useFormStore';

const GeoPointField = ({ element, globalValue }) => {
  const updateField = useFormStore(state => state.updateField);
  const language = useFormStore(state => state.language);
  const fieldError = useFormStore(state => state.errors[element.name]);
  const schemaLanguage = useFormStore(state => state.schema?.form_defn?.languages);

  const theme = useTheme();
  const styles = getStyles(theme);

  // --- Helpers ---
  const parseGeoString = (val) => {
    if (!val || typeof val !== 'string') return null;
    const parts = val.split(' ');
    if (parts.length < 2) return null;
    return {
      latitude: parseFloat(parts[0]),
      longitude: parseFloat(parts[1]),
      altitude: parts[2] ? parseFloat(parts[2]) : 0,
      accuracy: parts[3] ? parseFloat(parts[3]) : 0,
    };
  };

  // --- State ---
  const [currentGeo, setCurrentGeo] = useState(() => parseGeoString(globalValue));
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef(null);

  // --- Effects ---
  // Sync internal state and map view when the global store value changes
  useEffect(() => {
    const parsed = parseGeoString(globalValue);
    setCurrentGeo(parsed);

    if (parsed && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }

    return () => {
      // Optional cleanup when the screen loses focus
    };
  }, [globalValue]);

  const setCurrentLocation = async () => {
    try {
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude, altitude, accuracy } = location.coords;
      const geoString = `${latitude} ${longitude} ${altitude || 0} ${accuracy || 0}`;

      // Update store (which triggers the useEffect above via globalValue prop)
      updateField(element.name, geoString);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch location. Please ensure GPS is on.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearGeoPoint = () => {
    Alert.alert(
      "Clear Location",
      "Do you want to remove the saved coordinates?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: () => updateField(element.name, null) }
      ]
    );
  };

  // --- Render Helpers ---
  const label = getLabel(element, 'label', language, schemaLanguage);
  const hint = getLabel(element, 'hint', language, schemaLanguage);

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        {element.required === 'yes' && <Text style={styles.required}>*</Text>}
        <Text style={styles.label}>{label}</Text>
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}

      <View style={{ height: 250, width: '100%', borderRadius: 8, overflow: 'hidden', backgroundColor: '#f0f0f0', marginTop: 8 }}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          style={{ flex: 1 }}
          initialRegion={currentGeo ? {
            latitude: currentGeo.latitude,
            longitude: currentGeo.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          } : {
            latitude: -6.7924, // Default to Tanzania coordinates if null
            longitude: 39.2083,
            latitudeDelta: 10,
            longitudeDelta: 10,
          }}
          scrollEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          {currentGeo && (
            <Marker
              coordinate={{
                latitude: currentGeo.latitude,
                longitude: currentGeo.longitude,
              }}
              title="Recorded Location"
            />
          )}
        </MapView>

        {currentGeo && (
          <View style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: 5,
            borderRadius: 4
          }}>
            <Text style={{ color: '#fff', fontSize: 10 }}>
              Lat: {currentGeo.latitude.toFixed(5)} Lon: {currentGeo.longitude.toFixed(5)}
            </Text>
            {currentGeo.accuracy > 0 && (
              <Text style={{ color: '#ddd', fontSize: 10 }}>
                Acc: ±{Math.round(currentGeo.accuracy)}m
              </Text>
            )}
          </View>
        )}

        {isLoading && (
          <View style={{
            ...styles.absoluteFillObject,
            position: 'absolute',
            backgroundColor: 'rgba(255,255,255,0.7)',
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 8, color: '#333', fontWeight: '600' }}>Capturing GPS...</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          {
            marginTop: 10,
            backgroundColor: theme.colors.primary,
            padding: 14,
            borderRadius: 8,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: isLoading ? 0.7 : 1
          }
        ]}
        onPress={setCurrentLocation}
        onLongPress={currentGeo ? clearGeoPoint : null}
        disabled={isLoading}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
          {currentGeo ? 'Update Location' : 'Record Location'}
        </Text>
      </TouchableOpacity>

      {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
    </View>
  );
};

// Custom comparison for memoization
const areEqual = (prevProps, nextProps) => {
  return (
    prevProps.globalValue === nextProps.globalValue &&
    prevProps.element.name === nextProps.element.name &&
    prevProps.element.label === nextProps.element.label
  );
};

export default memo(GeoPointField, areEqual);
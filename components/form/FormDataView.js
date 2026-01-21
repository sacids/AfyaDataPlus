import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { calculatePolygonArea, evaluateField } from '../../lib/form/validation';
import { useFormStore } from '../../store/FormStore';

const FormDataView = ({ schema, formData }) => {

    const theme = useTheme();
    const styles = getStyles(theme);
    const { language } = useFormStore();

    const parsedFormData = JSON.parse(formData.form_data || '{}');

    // Helper function to get image URI using the File API
    const getImageUri = (imageFileName) => {
        if (!imageFileName || !formData.original_uuid) return null;

        try {
            // Use document directory from Paths
            const documentDir = Paths.document;
            if (!documentDir) return null;

            // Create file path using the File constructor
            const filePath = `${formData.original_uuid}/${imageFileName}`;
            const file = new File(documentDir, filePath);

            // Return the URI for the file
            return file.uri;
        } catch (error) {
            console.log('Error creating file path:', error);
            return null;
        }
    };

    let page_holder = []
    let group_holder = []
    let field_holder = []

    for (const [pageIndex, page] of Object.entries(schema.pages)) {

        if (!evaluateField('relevant', page, parsedFormData)) continue

        group_holder = []

        for (const [groupIndex, fieldGroup] of Object.entries(page.fields)) {

            if (!evaluateField('relevant', fieldGroup, parsedFormData)) continue

            field_holder = []
            for (const [colName, field] of Object.entries(fieldGroup)) {

                if (field.type === 'calculate') continue;

                const isRelevant = field.relevant
                    ? evaluateField('relevant', field, parsedFormData)
                    : true;

                if (!isRelevant) continue;

                if (field.type === 'geopoint') {
                    let value = parsedFormData[field.name]
                    let geoValue = value && typeof value === 'object' && value.latitude && value.longitude ? value : null;

                    if (!geoValue) continue;

                    let tmp = (
                        <View style={styles.mapContainer}>
                            <MapView
                                style={styles.map}
                                liteMode={true}
                                region={{
                                    latitude: geoValue.latitude,
                                    longitude: geoValue.longitude,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                }}
                                scrollEnabled={true}
                                zoomEnabled={true}
                            >
                                <Marker coordinate={geoValue} />
                            </MapView>
                            <Text style={styles.locationText}>
                                {geoValue.latitude}, {geoValue.longitude}, {geoValue.accuracy}
                            </Text>
                        </View>
                    )

                    field_holder.push(
                        <View key={`${pageIndex}-${groupIndex}-${colName}`} style={[{ marginBottom: 15 }]}>
                            <Text style={[styles.label, { fontSize: 14 }]}>{field.label}</Text>
                            {tmp}
                        </View>
                    )
                } else if (field.type === 'geoshape') {
                    let polygonCoords = [];
                    let bounds = {
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                        latitude: 0,
                        longitude: 0
                    };

                    try {
                        polygonCoords = JSON.parse(parsedFormData[field.name] || '[]');
                    } catch (e) {
                        console.log('Error parsing geoshape data:', e);
                        continue;
                    }

                    if (polygonCoords.length > 0) {
                        const latitudes = polygonCoords.map(coord => coord.latitude);
                        const longitudes = polygonCoords.map(coord => coord.longitude);

                        bounds.latitude = (Math.max(...latitudes) + Math.min(...latitudes)) / 2;
                        bounds.longitude = (Math.max(...longitudes) + Math.min(...longitudes)) / 2;
                        bounds.latitudeDelta = (Math.max(...latitudes) - Math.min(...latitudes)) * 1.5;
                        bounds.longitudeDelta = (Math.max(...longitudes) - Math.min(...longitudes)) * 1.5;
                    }

                    const area = calculatePolygonArea(polygonCoords)
                    let tmp = (
                        <View style={[styles.mapContainer]}>
                            <MapView
                                provider={PROVIDER_GOOGLE}
                                style={{ flex: 1 }}
                                initialRegion={bounds}
                                region={bounds}
                                showsMyLocationButton={true}
                                zoomEnabled={true}
                                scrollEnabled={false}
                                showsCompass={true}
                                showsScale={true}
                                zoomControlEnabled={true}
                                showsUserLocation={true}
                            >
                                <Polygon
                                    coordinates={polygonCoords}
                                    strokeWidth={2}
                                    strokeColor="#FF0000"
                                    fillColor="rgba(255,0,0,0.2)"
                                />
                            </MapView>
                            <Text style={styles.item_text}>
                                Area: {area.toLocaleString()} m² ({Math.round(area / 10000 * 100) / 100} hectares)
                            </Text>
                        </View>
                    )

                    field_holder.push(
                        <View key={`${pageIndex}-${groupIndex}-${colName}`} style={[{ marginBottom: 15 }]}>
                            <Text style={[styles.label, { fontSize: 14 }]}>{field.label}</Text>
                            {tmp}
                        </View>
                    )

                } else if (field.type === 'select_multiple') {

                    let value = parsedFormData[field.name]
                    let currentField = field

                    const selectedItems = value === '' || value === 'NA' ? [] : Array.isArray(value) ? value : JSON.parse(value || '[]');
                    let tmp = []
                    if (currentField['options']) {
                        for (const option in currentField['options']) {
                            if (selectedItems.includes(currentField['options'][option].name)) {
                                tmp.push(
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} key={option}>
                                        <Ionicons name="chevron-forward-outline" size={14} color={theme.colors.text} />
                                        <Text style={[styles.textInput, { fontSize: 14 }]}>
                                            {currentField['options'][option]['label' + language] || ''}
                                        </Text>
                                    </View>
                                )
                            }
                        }
                    }
                    field_holder.push(
                        <View key={`${pageIndex}-${groupIndex}-${colName}`} style={{ marginBottom: 15 }}>
                            <Text style={[styles.label, { fontSize: 14 }]}>{field.label}</Text>
                            <View style={{}}>{tmp}</View>
                        </View>
                    )
                } else if (field.type === 'select_one') {
                    let value = parsedFormData[field.name]
                    let currentField = field
                    let displayValue = value;

                    if (currentField['options']) {
                        for (const option in currentField['options']) {
                            if (currentField['options'][option].name === value) {
                                displayValue = currentField['options'][option]['label::Default'] || value;
                                break;
                            }
                        }
                    }

                    field_holder.push(
                        <View key={`${pageIndex}-${groupIndex}-${colName}`} style={{ marginBottom: 15 }}>
                            <Text style={[styles.label, { fontSize: 14 }]}>{field.label}</Text>
                            <Text style={[styles.textInput, { fontSize: 14 }]}>{displayValue}</Text>
                        </View>
                    )
                } else if (field.type === 'image') {
                    const imageFileName = parsedFormData[field.name];
                    const imageUri = getImageUri(imageFileName);

                    if (imageUri) {
                        let tmp = (
                            <View style={[
                                styles.mapContainer,
                                {
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: theme.colors.inputBackground,
                                },]}>
                                <Image
                                    source={{ uri: imageUri }}
                                    style={[{ width: 165, height: 165, borderRadius: 4 }, styles.noLocation]}
                                    contentFit='contain'
                                    onError={(e) => {
                                        console.log('Image failed to load from URI:', imageUri);
                                    }}
                                    onLoad={() => {
                                        // console.log('Image loaded successfully:', imageUri);
                                    }}
                                />
                            </View>
                        )

                        field_holder.push(
                            <View key={`${pageIndex}-${groupIndex}-${colName}`} style={{ marginBottom: 15 }}>
                                <Text style={[styles.label, { fontSize: 14 }]}>{field.label}</Text>
                                {tmp}
                            </View>
                        )
                    } else {
                        // Show placeholder
                        field_holder.push(
                            <View key={`${pageIndex}-${groupIndex}-${colName}`} style={{ marginBottom: 15 }}>
                                <Text style={[styles.label, { fontSize: 14 }]}>{field.label}</Text>
                                <View style={[
                                    styles.mapContainer,
                                    {
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: theme.colors.inputBackground,
                                        padding: 20,
                                    }]}>
                                    <Ionicons name="image-outline" size={40} color={theme.colors.text} />
                                    <Text style={[styles.textInput, { fontStyle: 'italic', textAlign: 'center', marginTop: 10 }]}>
                                        {!imageFileName ? 'No image captured' : 'Image not available'}
                                    </Text>
                                    {imageFileName && (
                                        <Text style={[styles.textInput, { fontSize: 12, textAlign: 'center', marginTop: 5 }]}>
                                            File: {imageFileName}
                                        </Text>
                                    )}
                                    {!Paths.document && (
                                        <Text style={[styles.textInput, { fontSize: 10, textAlign: 'center', marginTop: 5, color: 'orange' }]}>
                                            Document directory not available
                                        </Text>
                                    )}
                                </View>
                            </View>
                        )
                    }

                } else {
                    field_holder.push(
                        <View key={`${pageIndex}-${groupIndex}-${colName}`} style={{ marginBottom: 15 }}>
                            <Text style={[styles.label, { fontSize: 14 }]}>{field.label}</Text>
                            <Text style={[styles.textInput, { fontSize: 14 }]}>
                                {parsedFormData[field.name] || 'Not provided'}
                            </Text>
                        </View>
                    )
                }
            }

            field_holder.length > 0 &&
                group_holder.push(
                    <View key={`${pageIndex}-${groupIndex}`}>
                        {field_holder}
                    </View>
                )
        }
        group_holder.length > 0 &&
            page_holder.push(
                <View key={pageIndex} style={[styles.inputBase, { marginBottom: 20 }]}>
                    <Text style={[styles.textInput, { fontSize: 16, marginBottom: 10 }]}>{page.label}</Text>
                    {group_holder}
                </View>
            )
    }

    return (
        <View style={{ paddingHorizontal: 15, paddingTop: 0 }}>
            {page_holder}
        </View >
    )
}

export default FormDataView
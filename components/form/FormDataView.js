
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import { ScrollView, Text, View } from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { calculatePolygonArea, evaluateRelevant } from '../../lib/form/validation';
import { useFormStore } from '../../store/FormStore';

const FormDataView = ({ schema, formData }) => {

    const theme = useTheme();
    const styles = getStyles(theme);
    const { language } = useFormStore();

    const parsedFormData = JSON.parse(formData.form_data || '{}');
    const folderPath = `${FileSystem.documentDirectory}${formData.original_uuid}/`;

    console.log('language', language);

    let page_holder = []
    let group_holder = []
    let field_holder = []

    for (const [pageIndex, page] of Object.entries(schema.pages)) {

        if (!evaluateRelevant(page, parsedFormData)) continue

        //holder.push(<View key={pageIndex}><Text>Page {page.label}</Text></View>)

        group_holder = []
        //console.log('page', page, pageIndex);

        for (const [groupIndex, fieldGroup] of Object.entries(page.fields)) {

            if (!evaluateRelevant(fieldGroup, parsedFormData)) continue

            //holder.push(<View key={`${pageIndex}-${groupIndex}`}><Text>Group {fieldGroup.label}</Text></View>)
            field_holder = []
            for (const [colName, field] of Object.entries(fieldGroup)) {

                if (field.type === 'calculate') continue;

                const isRelevant = field.relevant
                    ? evaluateRelevant(field, parsedFormData)
                    : true;

                if (!isRelevant) continue;

                if (field.type === 'geopoint') {
                    let value = parsedFormData[field.name]
                    let geoValue = value && typeof value === 'object' && value.latitude && value.longitude ? value : null;
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
                                <Marker
                                    coordinate={geoValue}
                                />
                            </MapView>
                            <Text style={styles.locationText}>{geoValue.latitude}, {geoValue.longitude}, {geoValue.accuracy}</Text>
                        </View>
                    )

                    field_holder.push(
                        <View key={`${pageIndex}-${groupIndex}-${colName}`} style={[{ marginBottom: 15 }]}>
                            <Text style={[styles.label, { fontSize: 12 }]}>{field.label}</Text>
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
                    polygonCoords = JSON.parse(parsedFormData[field.name])

                    if (polygonCoords.length > 0) {
                        const latitudes = polygonCoords.map(coord => coord.latitude);
                        const longitudes = polygonCoords.map(coord => coord.longitude);

                        bounds.latitude = (Math.max(...latitudes) + Math.min(...latitudes)) / 2;
                        bounds.longitude = (Math.max(...longitudes) + Math.min(...longitudes)) / 2;
                        bounds.latitudeDelta = (Math.max(...latitudes) - Math.min(...latitudes)) * 1.5;
                        bounds.longitudeDelta = (Math.max(...longitudes) - Math.min(...longitudes)) * 1.5;
                    }
                    //console.log('geoshape bounds', bounds)

                    const area = calculatePolygonArea(polygonCoords)
                    let tmp = (
                        <View style={[styles.mapContainer,]}>
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
                            <Text style={[styles.label, { fontSize: 12 }]}>{field.label}</Text>
                            {tmp}
                        </View>
                    )

                } else if (field.type === 'select_multiple') {

                    let value = parsedFormData[field.name]
                    let currentField = field

                    const selectedItems = value === '' || value === 'NA' ? [] : Array.isArray(value) ? value : JSON.parse(value);
                    let tmp = []
                    if (currentField['options']) {
                        for (const option in currentField['options']) {
                            if (selectedItems.includes(currentField['options'][option].name)) {
                                tmp.push(
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} key={option}>
                                        <Ionicons name="chevron-forward-outline" size={14} color={theme.colors.text} />
                                        <Text style={[styles.textInput, { fontWeight: "bold", fontSize: 12 }]}>
                                            {currentField['options'][option]['label' + language] || ''}
                                        </Text>
                                    </View>
                                )
                            }
                        }
                    }
                    field_holder.push(
                        <View key={`${pageIndex}-${groupIndex}-${colName}`} style={{ marginBottom: 15 }}>
                            <Text style={[styles.label, { fontSize: 12 }]}>{field.label}</Text>
                            <View style={{}}>{tmp}</View>
                        </View>
                    )
                } else if (field.type === 'select_one') {
                    let value = parsedFormData[field.name]
                    let currentField = field
                    for (const option in currentField['options']) {
                        if (currentField['options'][option].name == value) {
                            value = currentField['options'][option]['label::Default'] || ''
                        }
                    }

                    field_holder.push(
                        <View key={`${pageIndex}-${groupIndex}-${colName}`} style={{ marginBottom: 15 }}>
                            <Text style={[styles.label, { fontSize: 12 }]}>{field.label}</Text>
                            <Text style={[styles.textInput, { fontWeight: "bold", fontSize: 12 }]}>{value}</Text>
                        </View>
                    )
                } else if (field.type === 'image') {
                    let tmp = (
                        <Image
                            source={{ uri: folderPath + parsedFormData[field.name] }}
                            style={{ width: 100, height: 100 }}
                            contentFit='contain'
                            onError={(e) => console.log('Image failed to load', e.nativeEvent.error)}
                            key={`${pageIndex}-${groupIndex}-${colName}`}
                        />
                    )

                    field_holder.push(
                        <View key={`${pageIndex}-${groupIndex}-${colName}`} style={{ marginBottom: 15 }}>
                            <Text style={[styles.label, { fontSize: 12 }]}>{field.label}</Text>
                            {tmp}
                        </View>
                    )

                } else {
                    field_holder.push(
                        <View key={`${pageIndex}-${groupIndex}-${colName}`} style={{ marginBottom: 15 }}>
                            <Text style={[styles.label, { fontSize: 12 }]}>{field.label}</Text>
                            <Text style={[styles.textInput, { fontWeight: "bold", fontSize: 12 }]}>{parsedFormData[field.name]}</Text>
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
                    <Text style={[styles.textInput, { color: theme.colors.primary, marginBottom: 10 }]}>{page.label}</Text>
                    {group_holder}
                </View>
            )
    }

    return (
        <ScrollView style={{ paddingHorizontal: 15, paddingTop: 15 }}>
            {page_holder}
        </ScrollView >

    )
}

export default FormDataView
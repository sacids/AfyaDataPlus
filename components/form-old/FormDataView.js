import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { LayoutAnimation, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { getLabel } from '../../lib/form/utils';
import { calculatePolygonArea, evaluateField, replaceVariables } from '../../lib/form.bak/validation';
import { useFormStore } from '../../store/FormStore-xx';
import { select } from '../../utils/database';

// Enable LayoutAnimation for Android
const FormDataView = ({ formData }) => {

    const theme = useTheme();
    const styles = getStyles(theme);
    const [schema, setSchema] = useState({})
    const { language, setLanguage, reset } = useFormStore();

    const default_language = schema.meta.default_language

    // State to track expanded groups (uses key: pageIndex-groupIndex)
    const [expandedGroups, setExpandedGroups] = useState({});


    const getSchema = async (form_id) => {
        const res2 = await select('form_defn', 'form_id = ?', [form_id]);
        const parsedDefn = JSON.parse(res2[0].form_defn);
        return parsedDefn
    }
    useEffect(() => {
        if (language === '::Default') {
            setLanguage(default_language);
        }
        const new_schema = getSchema(formData.form)
        setTimeout(() => {
            setSchema(new_schema)
        }, 0);
    }, [default_language, formData.form]);


    useEffect(() => {
        // Cleanup function that runs when component unmounts
        return () => {
            console.log('Cleaning up FormStore on New.js unmount');
            reset(); // Reset all form state when leaving the form screen
        };
    }, [reset]);

    const parsedFormData = JSON.parse(formData.form_data || '{}');

    const toggleGroup = (groupId) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const getImageUri = (imageFileName) => {
        if (!imageFileName || !formData.original_uuid) return null;
        try {
            const documentDir = Paths.document;
            const filePath = `${formData.original_uuid}/${imageFileName}`;
            const file = new File(documentDir, filePath);
            return file.uri;
        } catch (error) { return null; }
    };

    let page_holder = [];

    // --- LOOP 1: PAGES ---
    for (const [pageIndex, page] of Object.entries(schema.pages)) {
        if (!evaluateField('relevant', page, parsedFormData)) continue;

        let group_holder = [];
        //console.log('page group', JSON.stringify(page, null, 6))

        // --- LOOP 2: GROUPS ---
        for (const [groupIndex, fieldGroup] of Object.entries(page.fields)) {
            if (!evaluateField('relevant', fieldGroup, parsedFormData)) continue;

            let field_holder = [];
            const groupId = `${pageIndex}-${groupIndex}`;
            const isExpanded = !!expandedGroups[groupId];


            let label = ''
            let hint = ''
            // --- LOOP 3: FIELDS ---
            for (const [colName, field] of Object.entries(fieldGroup)) {
                if (field.type === 'calculate') continue;
                if (field.relevant && !evaluateField('relevant', field, parsedFormData)) continue;

                const value = parsedFormData[field.name];

                label = getLabel(field, 'label', language, schema.languages)
                hint = getLabel(field, 'hint', language, schema.languages)

                label = replaceVariables(label, formData);
                hint = replaceVariables(hint, formData)

                // FIELD RENDERING LOGIC
                let inputContent = null;

                if (field.type === 'geopoint' && value?.latitude) {

                    let value = parsedFormData[field.name]
                    let geoValue = value && typeof value === 'object' && value.latitude && value.longitude ? value : null;

                    if (!geoValue) continue;

                    inputContent = (
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
                    inputContent = (
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

                } else if (field.type === 'image') {

                    const imageFileName = parsedFormData[field.name];
                    const imageUri = getImageUri(imageFileName);

                    if (imageUri) {
                        inputContent = (
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

                    } else {
                        // Show placeholder
                        inputContent = (
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
                                            {getLabel(currentField['options'][option], 'label', language, schema.languages)}
                                        </Text>
                                    </View>
                                )
                            }
                        }
                    }

                    inputContent = tmp
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
                    inputContent = <Text style={[styles.textInput, { fontSize: 14 }]}>{displayValue}</Text>;
                } else {
                    inputContent = <Text style={[styles.bodyText, { marginTop: 4 }]}>{value || '—'}</Text>;
                }

                //console.log('text label color', JSON.stringify(field, null, 4))

                field_holder.push(
                    <View key={`${groupId}-${colName}`} style={{ marginBottom: 20 }}>
                        <Text style={[styles.tiny, { textTransform: 'uppercase', fontWeight: 'bold' }]}>
                            {label}
                        </Text>
                        {inputContent}
                    </View>
                );
            }

            if (field_holder.length > 0) {
                group_holder.push(
                    <View key={groupId} style={{ marginBottom: 5 }}>
                        {/* Group Header / Toggle Button */}
                        <TouchableOpacity
                            onPress={() => toggleGroup(groupId)}
                            activeOpacity={0.7}
                            style={[
                                styles.card,
                                {
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    // backgroundColor: isExpanded ? theme.colors.primary + '08' : theme.colors.inputBackground,
                                    // borderColor: isExpanded ? theme.colors.primary : theme.colors.inputBorder,
                                    backgroundColor: theme.colors.inputBackground,
                                    borderColor: theme.colors.inputBorder,
                                    borderWidth: 1,
                                    marginBottom: 0,
                                    borderBottomLeftRadius: isExpanded ? 0 : 8,
                                    borderBottomRightRadius: isExpanded ? 0 : 8,
                                }
                            ]}
                        >
                            <MaterialIcons
                                name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                size={24}
                                color={theme.colors.hint}
                            />
                            <Text style={[styles.label, { flex: 1, marginLeft: 10, fontSize: 15 }]}>
                                {getLabel(page, 'label', language, schema.languages) || `Page ${parseInt(pageIndex) + 1}`}
                            </Text>
                        </TouchableOpacity>

                        {/* Collapsible Field Holder */}
                        {isExpanded && (
                            <View style={{
                                padding: 16,
                                backgroundColor: theme.colors.background,
                                borderLeftWidth: 1,
                                borderRightWidth: 1,
                                borderBottomWidth: 1,
                                borderColor: theme.colors.inputBorder,
                                borderBottomLeftRadius: 8,
                                borderBottomRightRadius: 8,
                            }}>
                                {field_holder}
                            </View>
                        )}
                    </View>
                );
            }
        }

        if (group_holder.length > 0) {
            page_holder.push(
                <View key={pageIndex} style={{ marginBottom: 14 }}>
                    {group_holder}
                </View>
            );
        }
    }

    return (
        <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
            {page_holder}
        </View>
    );
};

export default FormDataView;
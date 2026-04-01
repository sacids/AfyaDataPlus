import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, LayoutAnimation, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { calculatePolygonArea, evaluateField } from '../../lib/form.bak/validation';
import { getLabel } from '../../lib/form/utils';
import useProjectStore from '../../store/projectStore';
import { useFormStore } from '../../store/useFormStore';
import { select } from '../../utils/database';
import { AppHeader } from '../layout/AppHeader';

// Enable LayoutAnimation for Android
const FormDataView = ({ formData }) => {

    const initForm = useFormStore(state => state.initForm);
    const schema = useFormStore(state => state.schema);



    const currentProject = useProjectStore(state => state.currentProject);
    const currentData = useProjectStore(state => state.currentData);
    const setCurrentData = useProjectStore(state => state.setCurrentData);


    const isRelevant = useFormStore(state => state.isRelevant);
    const { t, i18n } = useTranslation();

    const schemaLanguage = useFormStore(state => state.schema?.form_defn?.languages);

    const language = useFormStore(state => state.language);
    const setLanguage = useFormStore(state => state.setLanguage);
    const [ready, setReady] = useState(false);
    const [breadCrumb, setBreadCrumb] = useState([]);

    const [expandedGroups, setExpandedGroups] = useState({});
    const [menuVisible, setMenuVisible] = useState(false);

    const theme = useTheme();
    const styles = getStyles(theme);


    const interpolateText = (text) => {
        if (!text) return null;
        return text.replace(/\${(\w+)}/g, (_, varName) => {
            return formData[varName] !== undefined ? formData[varName] : `[${varName}]`;
        });
    };


    const handleOutsidePress = () => {
        if (menuVisible) {
            setMenuVisible(false);
        }
    };

    const showMenu = useMemo(() => [
        {
            icon: 'more-vert',
            onPress: () => setMenuVisible(true),
        }
    ], []);

    async function getFormDataBreadcrumbs(formDataItem) {
        if (!formDataItem || typeof formDataItem !== 'object') {
            return [];
        }


        const breadcrumbs = [];
        let currentItem = formDataItem;
        let visited = new Set(); // To prevent infinite loops if there's a circular reference

        // Traverse up the parent chain
        while (currentItem && currentItem.parent_uuid) {
            // Prevent infinite loops
            if (visited.has(currentItem.parent_uuid)) {
                console.log('Circular reference detected, breaking loop');
                break;
            }
            visited.add(currentItem.parent_uuid);

            try {
                // Fetch the parent item from form_data table
                const parentData = await select('form_data', 'uuid = ? OR original_uuid = ?',
                    [currentItem.parent_uuid, currentItem.parent_uuid]);

                if (!parentData || parentData.length === 0) {
                    console.log('No parent found, breaking loop');
                    break;
                }

                const parent = parentData[0];

                // Fetch the form definition for this parent to get the defn_title
                const formDefn = await select('form_defn', 'form_id = ?', [parent.form], 'title, short_title, form, uuid, original_uuid');

                // Add parent to breadcrumbs array
                breadcrumbs.push({
                    data_title: parent?.title || '',
                    defn_title: formDefn[0]?.title || formDefn[0]?.short_title || parent?.form || '',
                    data_id: parent?.uuid || parent?.original_uuid,
                    form_id: parent?.form,
                    data: parent,
                });

                // Update currentItem to be the parent for next iteration
                currentItem = parent;

            } catch (error) {
                console.error('Error fetching parent breadcrumb:', error);
                break;
            }
        }

        // Reverse to get root → parent order
        const orderedBreadcrumbs = breadcrumbs.reverse();
        setBreadCrumb(orderedBreadcrumbs);
        return orderedBreadcrumbs;
    }


    useEffect(() => {
        async function load() {

            try {
                // 1. Fetch the Schema for this specific form
                const schemaData = await select('form_defn', 'form_id = ?', [formData.form]);

                if (schemaData && schemaData.length > 0) {
                    // Ensure we parse the stringified JSON from the DB

                    const parsedSchema = {
                        ...schemaData[0],
                        form_defn: JSON.parse(schemaData[0].form_defn)
                    };
                    const existingData = JSON.parse(formData.form_data);

                    // 2. Initialize the store so helper functions (isRelevant, etc) work
                    initForm(parsedSchema, existingData, formData.uuid, formData.parent_uuid);
                    await getFormDataBreadcrumbs(existingData)

                } else {
                    console.error("No schema found for ID:", formData.form);
                }
            } catch (error) {
                console.error("Error loading FormDataView:", error);
            } finally {
                // 3. CRITICAL: This was missing. Without this, 'ready' stays false.
                setReady(true);
            }
        }

        if (formData) {
            load();
        }
    }, [formData]); // Re-run if a different record is selected

    if (!ready) return <ActivityIndicator style={{ flex: 1 }} />;



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
    for (const [pageIndex, page] of Object.entries(schema.form_defn.pages)) {

        if (!isRelevant(page)) continue


        let group_holder = [];
        //console.log('page group', JSON.stringify(page, null, 6))

        // --- LOOP 2: GROUPS ---
        for (const [groupIndex, fieldGroup] of Object.entries(page.fields)) {
            if (!isRelevant(fieldGroup)) continue;

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

                label = getLabel(field, 'label', language, schemaLanguage)
                hint = getLabel(field, 'hint', language, schemaLanguage)

                label = interpolateText(label);
                hint = interpolateText(hint);

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
                                            {getLabel(currentField['options'][option], 'label', language, schemaLanguage)}
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
                                {getLabel(page, 'label', language, schemaLanguage) || `Page ${parseInt(pageIndex) + 1}`}
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
        <>
            <AppHeader
                title={currentProject.title}
                subTitle={currentData?.title}
                rightActions={showMenu}
            />


            {menuVisible && (
                <TouchableWithoutFeedback onPress={handleOutsidePress}>
                    <View style={lstyles.overlay}>
                        <View style={[lstyles.menu, { backgroundColor: theme.colors.background }]}>
                            <View
                                style={{
                                    ...StyleSheet.absoluteFillObject,
                                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                    borderRadius: 6,
                                }}
                            />
                            <Text style={[styles.label, { paddingVertical: 8, fontSize: 14 }]}>
                                {t('forms:changeLanguage')}
                            </Text>
                            {schema.form_defn.languages.map((lang, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    onPress={() => {
                                        setLanguage('::' + lang);
                                        setMenuVisible(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.label,
                                        { paddingVertical: 4, paddingLeft: 5, fontSize: 12 },
                                        { color: language === '::' + lang ? theme.colors.primary : theme.colors.text }
                                    ]}>
                                        - {lang}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            )}


            <ScrollView>
                {breadCrumb && breadCrumb.length > 0 && (
                    <View style={styles.scrollContent}>

                        {breadCrumb.map((crumb, index) => (
                            <React.Fragment key={crumb.data_id}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setCurrentData(crumb.data);
                                        router.push(`/Main/`);
                                    }}
                                    style={[styles.card, { backgroundColor: theme.colors.card }]}
                                >
                                    <Text style={styles.badgeText}>{crumb.defn_title}</Text>
                                    <Text style={styles.tiny}>{crumb.data_title}</Text>
                                </TouchableOpacity>
                                {index < breadCrumb.length - 1 && (
                                    <MaterialCommunityIcons name="chevron-down" size={24} />
                                )}
                            </React.Fragment>
                        ))}
                    </View>
                )}
                <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
                    {page_holder}
                </View>



            </ScrollView>

            <TouchableOpacity
                style={[styles.fab]}
                onPress={() => {
                    setCurrentData(null)
                    router.push(`/Main/`)
                }}
            >
                <MaterialIcons name="home-filled" size={24} color="lightgray" />
            </TouchableOpacity>
        </>
    );
};

export default FormDataView;


const lstyles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
        zIndex: 100,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
    },
    menu: {
        marginTop: 80,
        marginRight: 15,
        borderRadius: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        width: 190,
        elevation: 5,
        zIndex: 101,
    },
});
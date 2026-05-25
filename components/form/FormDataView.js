import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { FormIcons } from '../../components/layout/FormIcons';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import useProjectStore from '../../store/projectStore';
import { useFormStore } from '../../store/useFormStore';
import { select } from '../../utils/database';
import { hasSeen, updateSeenBy } from '../../utils/services';
import { AppHeader } from '../layout/AppHeader';



import { useAuthStore } from '../../store/authStore';
import CurrentDataView from './CurrentDataView';

// Enable LayoutAnimation for Android
const FormDataView = ({ formData }) => {

    const initForm = useFormStore(state => state.initForm);
    const schema = useFormStore(state => state.schema);
    const { user } = useAuthStore.getState();


    const currentProject = useProjectStore(state => state.currentProject);
    const currentData = useProjectStore(state => state.currentData);
    const setCurrentData = useProjectStore(state => state.setCurrentData);
    const userData = useProjectStore(state => state.userData);
    const currentFormChildren = useProjectStore(state => state.currentFormChildren);


    const isRelevant = useFormStore(state => state.isRelevant);
    const { t, i18n } = useTranslation();

    const schemaLanguage = useFormStore(state => state.schema?.form_defn?.languages);

    const language = useFormStore(state => state.language);
    const setLanguage = useFormStore(state => state.setLanguage);
    const [ready, setReady] = useState(false);
    const [breadCrumb, setBreadCrumb] = useState([]);

    const [expandedGroups, setExpandedGroups] = useState({});
    const [menuVisible, setMenuVisible] = useState(false);

    const [workflowModalVisible, setWorkflowModalVisible] = useState(false);
    const [workflowRuntime, setWorkflowRuntime] = useState(null);
    const [availableWorkflowActions, setAvailableWorkflowActions] = useState([]);
    const [workflowLogs, setWorkflowLogs] = useState([]);
    const [formChildrenData, setFormChildrenData] = useState([]);

    const theme = useTheme();
    const styles = getStyles(theme);


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


                    const workflowEnabled = parsedSchema?.form_defn?.workflow?.enabled;
                    //console.log('work flow enabled', workflowEnabled, JSON.stringify(parsedSchema?.form_defn?.workflow, null, 4))

                    if (workflowEnabled) {

                        const workflowData = await select(
                            'tb_form_data_workflow',
                            'form_data_uuid = ?',
                            [formData.uuid]
                        );

                        if (workflowData?.length > 0) {

                            setWorkflowRuntime(workflowData[0]);

                            const currentState = workflowData[0].workflow_state;
                            const transitions = parsedSchema.form_defn.workflow.transitions || [];
                            const userGroups = userData?.groups || [];
                            const allowedActions = transitions.filter(
                                transition => {
                                    console.log('checking transition', transition.action, 'from', transition.icon, 'user groups', userData, 'transition groups', transition.groups)
                                    // State match
                                    if (!transition.from.includes(currentState)) {
                                        return false;
                                    }

                                    //Group match
                                    if (transition.groups && transition.groups.length > 0) {
                                        const hasGroup = transition.groups.some(g => userGroups.includes(g));
                                        if (!hasGroup) { return false; }
                                    }

                                    return true;
                                }
                            );

                            //console.log('allowed actions', allowedActions)

                            setAvailableWorkflowActions(
                                allowedActions
                            );
                        }

                    }

                    console.log('currentFormChildren', currentFormChildren)
                    if (currentFormChildren && currentFormChildren.trim().length > 0) {
                        const childCodes = currentFormChildren.split(',').filter(code => code.trim() !== '');

                        const formChildren = await select(
                            'form_defn',
                            'code IN (' + childCodes.map(() => '?').join(',') + ')',
                            childCodes,
                            'id, title, short_title, code'
                        );

                        setFormChildrenData(formChildren || []);
                    } else {
                        setFormChildrenData([]);
                    }



                } else {
                    console.error("No schema found for ID:", formData.form);
                }


            } catch (error) {
                console.error("Error loading FormDataView:", error);
            } finally {
                // 3. CRITICAL: This was missing. Without this, 'ready' stays false.
                markAsSeen();
                setReady(true);
            }
        }

        const markAsSeen = async () => {
            if (formData.id && user?.globalUsername) {
                const wasSeen = await hasSeen(formData.id, user.globalUsername);

                if (!wasSeen) {
                    await updateSeenBy(formData.id, user.globalUsername);
                    console.log('Record marked as seen');
                }
            }
        };


        if (formData) {
            load();
        }

        return () => {
            // Optional cleanup when the screen loses focus
        };
    }, [formData]); // Re-run if a different record is selected

    if (!ready) return <ActivityIndicator style={{ flex: 1 }} />;


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
                <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
                    <CurrentDataView formData={formData} />
                </View>

            </ScrollView>


            <TouchableOpacity
                style={[
                    styles.inputBase,
                    {
                        flexDirection: 'row',
                        alignItems: 'center',
                        alignSelf: 'flex-end',
                        gap: 10,
                        borderRadius: 10,
                        paddingVertical: 10,   // Specific padding
                        paddingHorizontal: 20,
                        margin: 16,            // Consistent margin
                    }
                ]}
                onPress={() => setWorkflowModalVisible(true)}
            >
                <Ionicons name="flash-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.label, { color: theme.colors.primary, fontSize: 14 }]}>
                    OPTIONS
                </Text>
            </TouchableOpacity>



            <Modal
                visible={workflowModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() =>
                    setWorkflowModalVisible(false)
                }
            >
                <Pressable
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        justifyContent: 'flex-end',
                    }}
                    onPress={() =>
                        setWorkflowModalVisible(false)
                    }
                >

                    <Pressable
                        style={{
                            backgroundColor: theme.colors.background,
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            padding: 20,
                            paddingBottom: 50,
                            maxHeight: '70%',
                        }}
                    >

                        {/* HEADER */}

                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 20,
                            }}
                        >
                            <Text style={[styles.label, { fontSize: 18 }]} > Options </Text>

                            <TouchableOpacity onPress={() => setWorkflowModalVisible(false)} >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* CURRENT STATE */}

                        {workflowRuntime && (

                            <View
                                style={{
                                    marginBottom: 20,
                                    padding: 14,
                                    borderRadius: 10,
                                    backgroundColor: theme.colors.inputBackground,
                                }}
                            >

                                <Text style={[styles.tiny, { marginBottom: 4 }]} > CURRENT STATE </Text>
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                                >
                                    <MaterialCommunityIcons name="source-branch" size={18} color={theme.colors.primary} />
                                    <Text style={styles.label} > {workflowRuntime.workflow_state} </Text>
                                </View>
                            </View>
                        )}

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ flexGrow: 1, paddingBottom: 20, paddingLeft: 15 }}
                        >
                            {/* AVAILABLE ACTIONS */}

                            {formChildrenData.length > 0 && (
                                <Text style={[styles.tiny]} > ADD NEW </Text>
                            )}

                            {formChildrenData.map((form, index) => (
                                <TouchableOpacity
                                    key={`child-${form.id || index}`}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 12,
                                        gap: 12,
                                    }}
                                    onPress={() => {
                                        setWorkflowModalVisible(false);
                                        router.push({
                                            pathname: `/Form/New`,
                                            params: {
                                                fdefn_id: `${form.id}`,
                                                parent_uuid: formData.uuid,
                                            }
                                        });
                                    }}
                                >
                                    <MaterialIcons name="add-circle-outline" size={24} color={theme.colors.primary} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>{form.title || form.short_title}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={theme.colors.hint} />
                                </TouchableOpacity>
                            ))}


                            {/* AVAILABLE ACTIONS */}

                            {availableWorkflowActions.length > 0 && (
                                <Text style={[styles.tiny, { marginTop: 20 }]} > ACTIONS </Text>
                            )}

                            {availableWorkflowActions.map(
                                (action, index) => (

                                    <TouchableOpacity
                                        key={index}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 10,
                                            gap: 12,
                                        }}
                                        onPress={async () => {

                                            setWorkflowModalVisible(false);

                                            // Transition form
                                            if (action.transition_form_id) {
                                                const fdefn_id = await select('form_defn', 'form_id = ?', [action.transition_form_id], 'id');
                                                console.log('action transition form', fdefn_id[0].id, JSON.stringify(action, null, 4))
                                                router.push({
                                                    pathname: `/Form/New`,
                                                    params: {
                                                        fdefn_id: `${fdefn_id[0].id}`,
                                                        parent_uuid: formData.uuid,
                                                        workflow_action: action.action,
                                                    }
                                                });

                                            }
                                        }}
                                    >

                                        <FormIcons iconName={action.icon_name || 'materialicons:play-circle-outline'} size={24} color={action.icon_color || theme.colors.primary} />
                                        <View style={{ flex: 1 }} >
                                            <Text style={styles.label} > {action.label} </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color={theme.colors.hint} />
                                    </TouchableOpacity>
                                )
                            )}

                            {/* WORKFLOW LOGS */}

                            {workflowLogs.length > 0 && (

                                <TouchableOpacity
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 16,
                                        gap: 12,
                                    }}
                                    onPress={() => {

                                        setWorkflowModalVisible(false);

                                        router.push({
                                            pathname:
                                                '/Workflow/Logs',
                                            params: {
                                                form_data_uuid:
                                                    formData.uuid
                                            }
                                        });
                                    }}
                                >

                                    <MaterialCommunityIcons name="history" size={22} color={theme.colors.text} />
                                    <Text style={styles.label} > View Workflow Logs </Text>
                                </TouchableOpacity>
                            )}





                        </ScrollView>
                        <TouchableOpacity
                            style={[
                                styles.inputBase,
                                lstyles.actionItem,
                            ]}
                            onPress={() => {
                                setWorkflowModalVisible(false);
                                setCurrentData(null);
                                router.push(`/Main/`);
                            }}
                        >

                            <Ionicons
                                name="home-outline"
                                size={22}
                                color={theme.colors.text}
                            />

                            <Text
                                style={styles.label}
                            >
                                Back To Project Home
                            </Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

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

    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderTopWidth: 1,
        paddingVertical: 16,
        gap: 12,
    },
});
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FormDataView from '../../../components/form/FormDataView';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { select, update } from '../../../utils/database';

import { useFormStore } from '../../../store/FormStore';
// Import components and styles from List.js
import { MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native-gesture-handler';
import api from '../../../api/axiosInstance';
import { AppHeader } from '../../../components/layout/AppHeader';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import useProjectStore from '../../../store/projectStore';
import { getProjfectForms, submitProjectData } from '../../../utils/services';

export default function FormDataOrProjectListScreen() {
    const [formData, setFormData] = useState(null);
    const [breadCrumb, setBreadCrumb] = useState([]);
    const [formDefn, setFormDefn] = useState(null);
    const [projects, setProjects] = useState([]);
    const [curProjectStats, setCurrentProjetStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);

    const [formSyncStatus, setFormSyncStatus] = useState('');
    const [dataSyncStatus, setDataSyncStatus] = useState('');

    const [mode, setMode] = useState(null); // 'formDetail' or 'projectList'
    const [formDefns, setFormDefns] = useState([]);
    const [previousId, setPreviousId] = useState(null);
    const opacitySteps = [0.2, 0.15, 0.1, 0.07, 0.05];
    const router = useRouter();
    const { currentProject, setCurrentProject, currentData, setCurrentData } = useProjectStore();

    const { language, setLanguage, schema, } = useFormStore();

    // Initialize translation
    const { t, i18n } = useTranslation();

    const theme = useTheme();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();

    const handleOutsidePress = () => {
        if (menuVisible) {
            setMenuVisible(false);
        }
    };

    // Use useFocusEffect to reload when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            // Reset state when screen comes into focus
            setFormData(null);
            setFormDefn(null);
            setLoading(true);
            setMode(null);

            if (currentData) {
                getFormDataBreadcrumbs(currentData);
                setMode('formDetail');
                fetchFormData();
            } else if (currentProject) {
                //console.log('current project')
                setMode('projectDetail');
                getProjectFormDefinitions(currentProject.project);
                getProjectStats(currentProject.project);
                loadProjectsWithStats();
            } else {
                setMode('projectList');
                loadProjectsWithStats();
            }

            setLoading(false);

            return () => {
                // Optional cleanup
            };
        }, [currentData]) // Re-run when id changes
    );

    // Also use useEffect for initial load
    useEffect(() => {


        if (currentData) {
            setFormData(null);
            setFormDefn(null);
            setLoading(true);
            setMode(null);

            if (currentData) {
                setMode('formDetail');
                getFormDataBreadcrumbs(currentData);
                fetchFormData();
            } else {
                setMode('projectList');
                loadProjectsWithStats();
            }

            setPreviousId(currentData);
            setLoading(false);
        } else if (currentProject) {
            setMode('projectDetail');
            getProjectFormDefinitions(currentProject.project);
            getProjectStats(currentProject.project);
            loadProjectsWithStats();
        } else {
            setMode('projectList');
            loadProjectsWithStats();
        }
    }, [currentData, previousId]);

    const fetchFormData = async () => {
        try {
            if (!currentData) {
                setMode('projectList');
                await loadProjectsWithStats();
                return;
            }

            const results = await select('form_data', 'id = ?', [currentData.id]);
            if (results && results.length > 0) {
                const res2 = await select('form_defn', 'form_id = ?', [results[0].form]);
                setFormData(results[0]);
                setFormDefn(JSON.parse(res2[0].form_defn));
            } else {
                // If no form data found with this id, show project list
                setMode('projectList');
                await loadProjectsWithStats();
                return;
            }
        } catch (error) {
            console.error('Failed to load form data:', error);
            setMode('projectList');
            await loadProjectsWithStats();
        }
    };

    const getProjectFormDefinitions = async (project_uuid) => {
        try {
            const result = await select('form_defn', 'project = ?', [project_uuid], "*", " is_root DESC ")
            setFormDefns(result);
        } catch (error) {
            console.error('Error fetching project form definitions:', error);
            setFormDefns([]);
        }
    };

    const getProjectStats = async (project_uuid) => {
        try {
            const select_str = `
                COUNT(*) as total,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as drafts,
                SUM(CASE WHEN status = 'finalized' THEN 1 ELSE 0 END) as finalized,
                SUM(CASE WHEN status = 'submitted' OR status = 'sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived`;

            const result = await select('form_data', 'project = ?', [project_uuid], select_str)

            const stats = {
                total: result[0].total || 0,
                drafts: result[0].drafts || 0,
                finalized: result[0].finalized || 0,
                sent: result[0].sent || 0,
                archived: result[0].archived || 0
            };

            setCurrentProjetStats(stats)
        } catch (error) {
            console.error('Error fetching project stats:', error);
            const stats = { total: 0, drafts: 0, finalized: 0, sent: 0, archived: 0 };
            setCurrentProjetStats(stats)
        }
    };

    const loadProjectsWithStats = async () => {
        try {
            // Load all active projects
            const projects = await select('projects', 'active = 1 ORDER BY sort_order');

            // Enhance each project with statistics
            const projectsWithStats = await Promise.all(
                projects.map(async (project) => {
                    const [formDefnCount] = await select(
                        'form_defn',
                        'project = ? AND active = 1',
                        [project.project],
                        'COUNT(*) as count'
                    );

                    const formDataStats = await select(
                        'form_data',
                        'project = ? AND deleted = 0',
                        [project.project],
                        `COUNT(*) as total,
                         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as drafts,
                         SUM(CASE WHEN status = 'finalized' THEN 1 ELSE 0 END) as finalized,
                         SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                         SUM(archived) as archived`
                    );

                    return {
                        ...project,
                        formDefnCount: formDefnCount?.count || 0,
                        formDataTotal: formDataStats[0]?.total || 0,
                        formDataDrafts: formDataStats[0]?.drafts || 0,
                        formDataFinalized: formDataStats[0]?.finalized || 0,
                        formDataSent: formDataStats[0]?.sent || 0,
                        formDataArchived: formDataStats[0]?.archived || 0
                    };
                })
            );

            setProjects(projectsWithStats);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load projects:', error);
            setLoading(false);
        }
    };

    const handleProjectPress = (project) => {
        setCurrentData(null)
        setCurrentProject(project);
        setMode('projectDetail');
        getProjectFormDefinitions(project.project);
        getProjectStats(project.project);
        loadProjectsWithStats();
        router.dismissTo('/Main/');
    };

    const handleUnsubscribe = async (project) => {
        console.log(project)
        const response = await api.post('/api/v1/project/unsubscribe', {
            "code": project.code
        });
        console.log(JSON.stringify(response.data, null, 2))
        const status = response.data;
        if (status.error) {
            // failed to unsubscribe
            update('projects', { active: 0 }, 'id = ?', [project.id])
            setCurrentData(null)
            setCurrentProject(null)
            setProjects([])
            setMode('projectList');
            loadProjectsWithStats();

        } else {
            // unsubscribed succesfully
            update('projects', { active: 0 }, 'id = ?', [project.id])
            setCurrentData(null)
            setCurrentProject(null)
            setProjects([])
            setMode('projectList');
            loadProjectsWithStats();
        }
        alert(status.message)
    };

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
                const formDefn = await select('form_defn', 'form_id = ?', [parent.form]);

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

    const goToSettings = useMemo(() => [
        {
            icon: 'settings',
            onPress: () => router.push('Project/Settings'),
        }
    ], []);

    const showMenu = useMemo(() => [
        {
            icon: 'dots-vertical',
            onPress: () => setMenuVisible(true),
        }
    ], []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>
                    {mode === 'formDetail' ? t('common.loadingFormData') : t('common.loading')}
                </Text>
            </View>
        );
    }

    // Render Form Detail mode
    if (mode === 'formDetail' && formData && formDefn) {
        return (
            <ScreenWrapper>
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
                                {schema.language.map((lang, idx) => (
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
                            {breadCrumb.map((crumb, index) => {
                                // Calculate background color with appropriate opacity
                                const backgroundColor = theme.isDark
                                    ? `rgb(${50 - (index * 5)}, ${50 - (index * 5)}, ${50 - (index * 5)})`
                                    : `rgb(${210 + (index * 5)}, ${210 + (index * 5)}, ${210 + (index * 5)})`;

                                return (
                                    <View key={index}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setCurrentData(crumb.data)
                                                router.push(`/Main/`)
                                            }}
                                            style={[
                                                styles.card,
                                                {
                                                    flexDirection: 'column',
                                                    marginBottom: 0,
                                                    backgroundColor: backgroundColor,
                                                }
                                            ]}
                                        >
                                            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                                                <Text numberOfLines={1} style={[styles.badgeText, { marginBottom: 4 }]}>
                                                    {crumb.defn_title}
                                                </Text>
                                            </View>

                                            <Text numberOfLines={1} style={[styles.tiny, { fontWeight: '700' }]}>
                                                {crumb.data_title || t('data.untitledRecord')}
                                            </Text>

                                        </TouchableOpacity>
                                        <MaterialCommunityIcons
                                            name="chevron-down"
                                            size={24}
                                            color={theme.colors.inputBorder}
                                            style={{ marginLeft: 30 }}
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Form Data View */}
                    <View style={{ flex: 1 }}>
                        <FormDataView schema={formDefn} formData={formData} />
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
            </ScreenWrapper>
        );
    }

    if (mode === 'projectDetail') {
        return (
            <ScreenWrapper>
                <AppHeader
                    title={currentProject?.title || t('projects:projectDetails')}
                    searchEnabled={false}
                    rightActions={goToSettings}
                />

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* 1. PROJECT HEADER CARD */}
                    <View style={[styles.card, { flexDirection: 'column', paddingVertical: 20 }]}>
                        <Text style={styles.pageTitle}>{currentProject?.title}</Text>
                        <Text style={[styles.hint, { color: theme.colors.primary, fontWeight: 'bold', marginTop: 4 }]}>
                            {currentProject.code}
                        </Text>

                        {currentProject.description && (
                            <Text style={[styles.bodyText, { marginTop: 12, opacity: 0.7 }]}>
                                {currentProject?.description}
                            </Text>
                        )}

                        {currentProject.tags && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 15 }}>
                                {currentProject.tags.split(',').map((tag, i) => (
                                    <View key={i} style={{ backgroundColor: theme.colors.inputBorder, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                                        <Text style={[styles.tiny, { fontSize: 10 }]}>{tag.trim().toUpperCase()}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* 2. STATS GRID (EVENLY SPACED) */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 2, marginTop: 10, opacity: 0.6 }]}>
                            {t('projects:projectData')}
                        </Text>
                        <TouchableOpacity
                            onPress={() => submitProjectData(currentProject.project, setDataSyncStatus)}>
                            <MaterialIcons name="send" size={26} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.hint, { marginBottom: 10 }]}>
                        {dataSyncStatus || t('sync:currentProjectStats')}
                    </Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        {[
                            {
                                label: t('common:sent'),
                                val: curProjectStats.sent || 0,
                                color: '#2ecc71',
                                icon: 'cloud-done'
                            },
                            {
                                label: t('common:final'),
                                val: curProjectStats.finalized || 0,
                                color: theme.colors.primary,
                                icon: 'check-circle'
                            },
                            {
                                label: t('common:draft'),
                                val: curProjectStats.draft || 0,
                                color: '#f1c40f',
                                icon: 'edit'
                            },
                            {
                                label: t('common:archive'),
                                val: curProjectStats.archived || 0,
                                color: '#95a5a6',
                                icon: 'archive'
                            }
                        ].map((stat, idx) => (
                            <View key={idx} style={[styles.card, { width: '48%', flexDirection: 'column', alignItems: 'center', paddingVertical: 15 }]}>
                                <MaterialIcons name={stat.icon} size={20} color={stat.color} />
                                <Text style={[styles.pageTitle, { fontSize: 20, marginVertical: 4 }]}>{stat.val}</Text>
                                <Text style={styles.tiny}>{stat.label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* 3. AVAILABLE FORMS LIST */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 2, marginTop: 10, opacity: 0.6 }]}>
                            {t('projects:projectForms')}
                        </Text>
                        <TouchableOpacity
                            onPress={() => getProjfectForms(currentProject.project, setFormSyncStatus)}>
                            <MaterialIcons name="refresh" size={30} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.hint, { marginBottom: 10 }]}>
                        {formSyncStatus || t('sync:currentAvailableForms')}
                    </Text>

                    {/* SAFE MAPPING with Optional Chaining and Empty State Check */}
                    {formDefns && formDefns.length > 0 ? (
                        formDefns.map((form) => (
                            <TouchableOpacity
                                key={form.id}
                                style={[styles.card, { paddingVertical: 15 }]}
                                onPress={() => {
                                    if (form.is_root) {
                                        router.push(`/Form/New?fdefn_id=${form.id}`)
                                    }
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <MaterialCommunityIcons
                                        name="file-document-outline"
                                        size={24}
                                        color={theme.colors.primary}
                                    />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={styles.bodyText}>{form.title}</Text>
                                        <Text style={styles.tiny}>
                                            {t('forms:version')}: {form.version}
                                        </Text>
                                    </View>
                                    {form.is_root ? (
                                        <MaterialIcons
                                            name="add"
                                            size={24}
                                            color={theme.colors.hint}
                                        />
                                    ) : null}
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={[styles.card, { padding: 30, alignItems: 'center', borderStyle: 'dashed' }]}>
                            <Text style={styles.hint}>{t('projects:noFormsAvailable')}</Text>
                        </View>
                    )}

                    {/* 4. UNSUBSCRIBE ACTION */}
                    <TouchableOpacity
                        style={{
                            marginTop: 20,
                            marginBottom: 50,
                            padding: 16,
                            backgroundColor: theme.colors.error + '15',
                            borderRadius: 12,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: theme.colors.error + '30'
                        }}
                        onPress={() => handleUnsubscribe(currentProject)}
                    >
                        <MaterialIcons name="notifications-off" size={20} color={theme.colors.error} />
                        <Text style={[styles.label, { color: theme.colors.error, marginLeft: 8, marginBottom: 0 }]}>
                            {t('projects:unsubscribe')}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                <TouchableOpacity
                    style={[styles.fab]}
                    onPress={() => {
                        setMode('listProjects')
                    }}
                >
                    <Octicons name="arrow-switch" size={24} color="lightgray" />
                </TouchableOpacity>
            </ScreenWrapper>
        );
    }

    // Render Project List mode (default)
    return (
        <ScreenWrapper>
            <AppHeader
                title={t('projects:myProjects')}
                searchEnabled={false}
                rightActions={goToSettings}
            />

            <TouchableOpacity
                onPress={() => router.push('/Project/Join')}
                style={[styles.button, { justifyContent: 'space-between', margin: 16, paddingHorizontal: 16 }]}>
                <Text style={[styles.buttonText, { fontWeight: 'bold' }]}>
                    {t('projects:joinProject')}
                </Text>
                <MaterialCommunityIcons name="shape-square-rounded-plus" size={26} color='white' />
            </TouchableOpacity>

            <FlatList
                data={projects}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => handleProjectPress(item)}
                        style={styles.card}
                    >
                        {/* Header Section */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={styles.pageTitle}>{item.title}</Text>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color={theme.colors.text} />
                        </View>

                        {/* Meta Info Section */}
                        <View style={{ marginBottom: 12 }}>
                            <Text style={styles.hint}>
                                {t('projects:code')}: {item.code}
                            </Text>
                            <Text style={styles.hint}>
                                {t('projects:category')}: {item.category}
                            </Text>
                        </View>

                        {/* Stats Section */}
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: 10,
                            borderTopWidth: 0.5,
                            borderTopColor: theme.colors.inputBorder
                        }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={[styles.bodyText, { fontWeight: 'bold' }]}>{item.formDefnCount}</Text>
                                <Text style={styles.tiny}>{t('common:forms')}</Text>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={styles.tiny}>
                                        {t('common:total')}: {item.formDataTotal}
                                    </Text>
                                </View>
                                <Text style={styles.tiny}>|</Text>
                                <Text style={[styles.tiny, { color: '#f1c40f' }]}>
                                    {t('common:draft')}: {item.formDataDrafts}
                                </Text>
                                <Text style={[styles.tiny, { color: '#2ecc71' }]}>
                                    {t('common:final')}: {item.formDataFinalized}
                                </Text>
                                <Text style={[styles.tiny, { color: theme.colors.primary }]}>
                                    {t('common:sent')}: {item.formDataSent}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.scrollContent}
                ListEmptyComponent={
                    <Text style={[styles.hint, { textAlign: 'center', marginTop: 20 }]}>
                        {t('projects:noActiveProjects')}
                    </Text>
                }
            />

            {/* Standardized FAB */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                    setCurrentData(null)
                    router.push(`/Main/`)
                }}
            >
                <MaterialIcons name="home-filled" size={24} color="white" />
            </TouchableOpacity>
        </ScreenWrapper>
    );
}

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
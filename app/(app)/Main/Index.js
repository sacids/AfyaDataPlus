import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FormDataView from '../../../components/form/FormDataView';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { select } from '../../../utils/database';

// Import components and styles from List.js
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';
import useProjectStore from '../../../store/projectStore';

export default function FormDataOrProjectListScreen() {
    const [formData, setFormData] = useState(null);
    const [breadCrumb, setBreadCrumb] = useState([]);
    const [formDefn, setFormDefn] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState(null); // 'formDetail' or 'projectList'
    const [previousId, setPreviousId] = useState(null);
    const opacitySteps = [0.2, 0.15, 0.1, 0.07, 0.05];
    const router = useRouter();
    const { currentProject, setCurrentProject, currentData, setCurrentData } = useProjectStore();

    const theme = useTheme();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();

    // Use useFocusEffect to reload when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            // Reset state when screen comes into focus
            setFormData(null);
            setFormDefn(null);
            setLoading(true);
            setMode(null);

            if (currentData) {
                //console.log('form detail')
                getFormDataBreadcrumbs(currentData);
                setMode('formDetail');
                fetchFormData();
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
        if (currentData !== previousId) {
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
        router.dismissTo('/Main/');
    };


    // Create styles for project list mode
    const projectListStyles = StyleSheet.create({

        selectedProject: {

            backgroundColor: theme.colors.primary,
            padding: 15,
            borderRadius: 10,
        },

        selectedProjectText: {
            color: 'white',
        },

        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
            paddingHorizontal: 15,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 40,
            paddingBottom: 15,
        },
        headerLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.colors.text,
        },
        currentProject: {
            color: theme.colors.text,
            marginBottom: 15,
            fontSize: 16,
        },
        projectCard: {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            padding: 8,
            marginBottom: 10,
            borderColor: theme.colors.inputBorder,
            borderWidth: 1,
        },
        projectHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
        },
        projectTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.colors.text,
            flex: 1,
        },
        projectMeta: {
            flexDirection: 'row',
            gap: 15,
            marginBottom: 10,
        },
        metaText: {
            color: '#ccc',
            fontSize: 12,
        },
        statsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        statItem: {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
            alignItems: 'center',
            flexDirection: 'row',
            gap: 2,
        },
        statLabel: {
            color: theme.colors.secText,
            fontSize: 9,
        },
        statValue: {
            color: theme.colors.text,
            fontSize: 9,
            marginHorizontal: 2,
            fontWeight: 'bold',
        },
        listContent: {
            paddingBottom: 20,
        },
        emptyText: {
            color: theme.colors.text,
            textAlign: 'center',
            marginTop: 40,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.colors.background,
        },
        loadingText: {
            color: theme.colors.text,
        },
        // New style for form detail header
        formHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 40,
            paddingBottom: 15,
            paddingHorizontal: 15,
            backgroundColor: theme.colors.background,
        },
        formHeaderLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        formHeaderTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.colors.text,
        },
    });


    async function getFormDataBreadcrumbs(formDataItem) {
        //console.log('get form data bc', JSON.stringify(formDataItem, null, 2))
        if (!formDataItem || typeof formDataItem !== 'object') {
            //console.log('shida')
            return [];
        }

        const breadcrumbs = [];
        let currentItem = formDataItem;
        let visited = new Set(); // To prevent infinite loops if there's a circular reference

        // console.log('Starting with current item:', JSON.stringify(currentItem, null, 2))
        // console.log('Initial parent_uuid:', currentItem.parent_uuid)

        // Traverse up the parent chain
        while (currentItem && currentItem.parent_uuid) {
            // Prevent infinite loops
            if (visited.has(currentItem.parent_uuid)) {
                //console.log('Circular reference detected, breaking loop');
                break;
            }
            visited.add(currentItem.parent_uuid);

            try {
                //console.log(`Looking for parent with UUID: ${currentItem.parent_uuid}`)

                // Fetch the parent item from form_data table
                // Note: You might need to check both uuid and original_uuid fields
                const parentData = await select('form_data', 'uuid = ? OR original_uuid = ?',
                    [currentItem.parent_uuid, currentItem.parent_uuid]);

                //console.log('Query result - parentData:', JSON.stringify(parentData, null, 2))

                if (!parentData || parentData.length === 0) {
                    console.log('No parent found, breaking loop');
                    break;
                }

                const parent = parentData[0];
                //console.log('Found parent:', JSON.stringify(parent, null, 2))

                // Fetch the form definition for this parent to get the defn_title
                const formDefn = await select('form_defn', 'form_id = ?', [parent.form]);
                //console.log('Form definition for parent:', JSON.stringify(formDefn, null, 2))

                // Add parent to breadcrumbs array
                // Use push to add in order of traversal (closest parent first)
                breadcrumbs.push({
                    data_title: parent?.title || '',
                    defn_title: formDefn[0]?.title || formDefn[0]?.short_title || parent?.form || '',
                    data_id: parent?.uuid || parent?.original_uuid,
                    form_id: parent?.form,
                    data: parent,
                });

                //console.log(`Added breadcrumb: ${formDefn[0]?.title || 'Unknown'} - ${parent?.title || 'Untitled'}`)

                // Update currentItem to be the parent for next iteration
                currentItem = parent;
                // console.log('New current item (parent):', JSON.stringify(currentItem, null, 2))
                // console.log('Next parent_uuid to look for:', currentItem.parent_uuid)

            } catch (error) {
                console.error('Error fetching parent breadcrumb:', error);
                break;
            }
        }

        // console.log('Final breadcrumbs array length:', breadcrumbs.length)
        // console.log('print bc - ', JSON.stringify(breadcrumbs, null, 2))

        // If you want the array in root → parent order, reverse it
        // (Currently it's closest parent → root)
        const orderedBreadcrumbs = breadcrumbs.reverse();

        setBreadCrumb(orderedBreadcrumbs);
        return orderedBreadcrumbs;
    }




    if (loading) {
        return (
            <View style={projectListStyles.loadingContainer}>
                <Text style={projectListStyles.loadingText}>
                    {mode === 'formDetail' ? 'Loading form data...' : 'Loading...'}
                </Text>
            </View>
        );
    }

    // Render Form Detail mode
    if (mode === 'formDetail' && formData && formDefn) {

        return (
            <View style={[styles.pageContainer, { paddingBottom: insets.bottom, paddingTop: insets.top }]}>


                <View style={styles.header}>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}
                        onPress={() => router.back()}
                    >
                        <MaterialCommunityIcons name={'arrow-left'} size={24} color={theme.colors.text} />
                        <Text style={styles.pageTitle}>Form Details</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView>
                    {breadCrumb && breadCrumb.length > 0 && (
                        <>
                            {breadCrumb.map((crumb, index) => {
                                // Pre-defined opacity steps for up to 5 levels of breadcrumbs
                                const opacitySteps = [0.2, 0.15, 0.1, 0.07, 0.05];

                                // Get opacity for this index, or use the last value if we have more than 5 items
                                const opacity = opacitySteps[Math.min(index, opacitySteps.length - 1)];

                                // Calculate background color with appropriate opacity
                                const backgroundColor = theme.isDark
                                    ? `rgb(${50 - (index * 5)}, ${50 - (index * 5)}, ${50 - (index * 5)})`  // Starts at 60, decreases to 30
                                    : `rgb(${210 + (index * 5)}, ${210 + (index * 5)}, ${210 + (index * 5)})`; // Starts at 210, increases to 241

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
                                                    backgroundColor: backgroundColor,
                                                }
                                            ]}
                                        >
                                            <Text style={styles.label}>{crumb.data_title}</Text>
                                            <Text style={styles.title}>{crumb.defn_title}</Text>
                                        </TouchableOpacity>
                                        <MaterialCommunityIcons name="chevron-down" size={24} color={theme.colors.inputBorder} style={{ marginLeft: 30 }} />
                                    </View>
                                );
                            })}
                        </>
                    )}

                    {/* Form Data View */}
                    <View style={{ flex: 1 }}>
                        <FormDataView schema={formDefn} formData={formData} />
                    </View>
                </ScrollView>


                <TouchableOpacity
                    style={[styles.fab, styles.fabContent, { backgroundColor: theme.colors.primary }]}
                    onPress={() => {
                        setCurrentData(null)
                        router.push(`/Main/`)
                    }}
                >
                    <MaterialIcons name="home-filled" size={24} color="lightgray" />
                </TouchableOpacity>
            </View>
        );
    }

    // Render Project List mode (default)
    return (
        <View style={[styles.pageContainer, { paddingBottom: insets.bottom, paddingTop: insets.top, paddingHorizontal: 10 }]}>
            <View style={styles.header}>
                <TouchableOpacity style={[styles.headerLeft, { flexDirection: 'row' }]} onPress={() => router.back()}>
                    <MaterialIcons name="keyboard-arrow-left" size={24} color="white" />
                    <Text style={styles.pageTitle}>My Projects</Text>
                </TouchableOpacity>
            </View>



            {currentProject && (
                <View style={[projectListStyles.selectedProject, { marginVertical: 10 }]}>
                    <Text style={projectListStyles.selectedProjectText}>
                        Current: {currentProject.title} ({currentProject.code})
                    </Text>
                </View>
            )}



            <FlatList
                data={projects}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => handleProjectPress(item)}
                        style={projectListStyles.projectCard}
                    >
                        <View style={projectListStyles.projectHeader}>
                            <Text style={projectListStyles.projectTitle}>{item.title}</Text>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="white" />
                        </View>

                        <View style={projectListStyles.projectMeta}>
                            <Text style={projectListStyles.metaText}>Code: {item.code}</Text>
                            <Text style={projectListStyles.metaText}>Category: {item.category}</Text>
                        </View>

                        <View style={projectListStyles.statsContainer}>
                            <View style={projectListStyles.statItem}>
                                <Text style={projectListStyles.statValue}>{item.formDefnCount}</Text>
                                <Text style={projectListStyles.statLabel}>Forms</Text>
                            </View>

                            <View style={projectListStyles.statItem}>
                                <Text style={projectListStyles.statValue}>{item.formDataTotal}</Text>
                                <Text style={projectListStyles.statLabel}>Total - </Text>
                                <Text style={projectListStyles.statValue}>{item.formDataDrafts}</Text>
                                <Text style={projectListStyles.statLabel}>Draft</Text>
                                <Text style={projectListStyles.statValue}>{item.formDataFinalized}</Text>
                                <Text style={projectListStyles.statLabel}>Fin</Text>
                                <Text style={projectListStyles.statValue}>{item.formDataSent}</Text>
                                <Text style={projectListStyles.statLabel}>Sent</Text>
                                <Text style={projectListStyles.statValue}>{item.formDataArchived}</Text>
                                <Text style={projectListStyles.statLabel}>Arch</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={projectListStyles.listContent}
                ListEmptyComponent={
                    <Text style={projectListStyles.emptyText}>No active projects found</Text>
                }
            />

        </View>
    );
}
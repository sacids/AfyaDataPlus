import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useProjectStore from '../../../store/projectStore';
import { select } from '../../../utils/database';


import { useTheme } from '../../../context/ThemeContext';

const ProjectListScreen = () => {
    const router = useRouter();
    const { currentProject, setCurrentProject } = useProjectStore();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const theme = useTheme();


    const styles = StyleSheet.create({
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
            color: 'white',
        },
        currentProject: {
            color: 'white',
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
            color: 'white',
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
            color: '#ccc',
            fontSize: 9,
        },
        statValue: {
            color: 'white',
            fontSize: 9,
            fontWeight: 'bold',
        },
        listContent: {
            paddingBottom: 20,
        },
        emptyText: {
            color: 'white',
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
            color: 'white',
        },
    });
    useEffect(() => {
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
                            [project.id],
                            'COUNT(*) as count'
                        );

                        const formDataStats = await select(
                            'form_data',
                            'project = ? AND deleted = 0',
                            [project.id],
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

        loadProjectsWithStats();
    }, []);

    const handleProjectPress = (project) => {
        //console.log('project', JSON.stringify(project, null, 2));
        setCurrentProject(project);
        router.back();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading projects...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialIcons name="keyboard-arrow-left" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Projects</Text>
                </View>
                <TouchableOpacity onPress={() => alert('Search functionality coming soon')}>
                    <MaterialIcons name="search" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {currentProject && (
                <Text style={styles.currentProject}>
                    Current: {currentProject.title} ({currentProject.code})
                </Text>
            )}

            <FlatList
                data={projects}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => handleProjectPress(item)}
                        style={styles.projectCard}
                    >
                        <View style={styles.projectHeader}>
                            <Text style={styles.projectTitle}>{item.title}</Text>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="white" />
                        </View>

                        <View style={styles.projectMeta}>
                            <Text style={styles.metaText}>Code: {item.code}</Text>
                            <Text style={styles.metaText}>Category: {item.category}</Text>
                        </View>

                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{item.formDefnCount}</Text>
                                <Text style={styles.statLabel}>Forms</Text>
                            </View>

                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{item.formDataTotal}</Text>
                                <Text style={styles.statLabel}>Total</Text>
                            </View>

                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{item.formDataDrafts}</Text>
                                <Text style={styles.statLabel}>Draft</Text>
                                <Text style={styles.statValue}>{item.formDataFinalized}</Text>
                                <Text style={styles.statLabel}>Fin</Text>
                                <Text style={styles.statValue}>{item.formDataSent}</Text>
                                <Text style={styles.statLabel}>Sent</Text>
                                <Text style={styles.statValue}>{item.formDataArchived}</Text>
                                <Text style={styles.statLabel}>Arch</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No active projects found</Text>
                }
            />
        </View>
    );
};


export default ProjectListScreen;
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../components/layout/AppHeader';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import useProjectStore from '../../../store/projectStore';
import { select } from '../../../utils/database';

const ProjectDetailScreen = () => {
    const router = useRouter();
    const { currentProject } = useProjectStore();
    const [project, setProject] = useState(null);

    const theme = useTheme();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();

    const afyadatalogo = require('../../../assets/images/AfyaDataLogo.png');

    // Markdown explicit dynamic styling wrapper linked cleanly with your context themes
    const markdownStyles = StyleSheet.create({
        heading1: {
            fontSize: 22,
            fontWeight: 'bold',
            color: theme.colors.primary,
            marginTop: 14,
            marginBottom: 8,
        },
        heading3: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.text,
            marginTop: 20,
            marginBottom: 6,
            textTransform: 'capitalize',
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.inputBackground || '#eee',
            paddingBottom: 4,
        },
        body: {
            fontSize: 14,
            color: theme.colors.text,
            lineHeight: 20,
        },
        bullet_list: {
            marginTop: 4,
        },
        list_item: {
            marginVertical: 2,
        },
        bullet_list_icon: {
            color: theme.colors.primary,
            fontSize: 18,
            marginRight: 8,
        },
    });

    useEffect(() => {
        if (!currentProject) {
            router.back();
            return;
        }
        const loadProjectDetails = async () => {
            const projectDetails = await select('projects', 'id = ?', [currentProject.id]);
            // If select returns an array, unpack the first object
            setProject(Array.isArray(projectDetails) ? projectDetails[0] : projectDetails);
        }

        loadProjectDetails();
    }, [currentProject]);

    // Helper to safely parse comma-separated tags into an array
    const renderTags = () => {
        if (!project?.tags) return null;
        const tagsArray = project.tags.split(',').map(tag => tag.trim()).filter(Boolean);

        return tagsArray.map((tag, index) => (
            <View key={index} style={styles.tagPill}>
                <Text style={[styles.tiny, { color: theme.colors.text, fontWeight: '500' }]}>
                    #{tag}
                </Text>
            </View>
        ));
    };

    return (
        <ScreenWrapper>
            {/* Header */}
            <AppHeader title='Project Home' backLink={() => router.back()} />

            <ScrollView style={localStyles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Project Image Banner */}
                {project?.project_image_local ? (
                    <Image
                        source={{ uri: project?.project_image_local }}
                        style={localStyles.detailImage}
                        resizeMode="contain"
                    />
                ) : (
                    <Image
                        source={afyadatalogo}
                        style={localStyles.detailImage}
                        resizeMode="contain"
                    />
                )}

                {/* Metadata & Actions Panel */}
                <View style={localStyles.metaContainer}>
                    {/* Instance Title & Subtitle */}
                    <View style={{ marginBottom: 12 }}>
                        <Text style={[styles.pageTitle, { marginBottom: 2 }]}>{project?.title || project?.code || 'Deployment Instance'}</Text>
                        {project?.country && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.hint} />
                                <Text style={styles.hint}>{project.country}</Text>
                            </View>
                        )}
                        {project?.instance_url && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <MaterialCommunityIcons name="earth" size={14} color={theme.colors.hint} />
                                <Text style={styles.hint}>{project.instance_url}</Text>
                            </View>
                        )}
                    </View>

                    {/* Tag Pills Container */}
                    {project?.tags && (
                        <View style={{ marginBottom: 8 }}>
                            <View style={localStyles.tagsWrapper}>
                                {renderTags()}
                            </View>
                        </View>
                    )}

                    <View style={localStyles.divider(theme)} />
                </View>

                {/* Render Unified Markdown Body */}
                <View style={localStyles.markdownContentWrapper}>
                    <Text style={[styles.label, { marginBottom: 8 }]}>Description</Text>
                    {project?.description ? (
                        <Markdown style={markdownStyles}>
                            {project.description}
                        </Markdown>
                    ) : (
                        <Text style={[styles.hint, { fontStyle: 'italic' }]}>No description provided for this project.</Text>
                    )}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const localStyles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    detailImage: {
        width: '100%',
        height: 220,
        resizeMode: 'cover',
    },
    metaContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    tagsWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginTop: 2,
    },
    markdownContentWrapper: {
        paddingHorizontal: 16,
        paddingBottom: 60,
    },
    divider: (theme) => ({
        height: 1,
        backgroundColor: theme.colors.inputBorder || '#eee',
        marginVertical: 12,
    }),
});

export default ProjectDetailScreen;
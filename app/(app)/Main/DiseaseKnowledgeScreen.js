import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { select } from '../../../utils/database';

// Helper to strip markdown formatting cleanly for text truncation previews
const getCleanPreviewText = (markdownText) => {
    if (!markdownText) return '';
    return markdownText
        .replace(/#+\s+/g, '') // Remove Headers
        .replace(/[*_`\-~]/g, '') // Remove list bullets & styling tokens
        .replace(/\n+/g, ' ') // Convert linebreaks into single spaces
        .trim();
};

const DiseaseKnowledgeScreen = () => {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [diseasesData, setDiseasesData] = useState([]); // Dynamic DB data container
    const [filteredData, setFilteredData] = useState([]);
    const [showSearchBar, setShowSearchBar] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const theme = useTheme();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();

    // Placeholder project ID (In your real application, grab this from your Auth/Project Context)
    const currentProjectId = "6c0de747-805e-4948-a8ae-6d12e8b090f7";

    // Fetch data dynamically from SQLite table upon mounting
    useEffect(() => {
        const fetchLocalKnowledgeBase = async () => {
            try {
                setIsLoading(true);
                // Use the pattern matching your database engine to select records for the current project
                const localRecords = await select(
                    'tb_disease_knowledge',
                    { project_id: currentProjectId }
                );

                if (localRecords && Array.isArray(localRecords)) {
                    setDiseasesData(localRecords);
                    setFilteredData(localRecords);
                }
            } catch (error) {
                console.error("Failed to load local knowledge base database records: ", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLocalKnowledgeBase();
    }, [currentProjectId]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (query) {
            const filtered = diseasesData.filter(disease =>
                (disease.name && disease.name.toLowerCase().includes(query.toLowerCase())) ||
                (disease.description && disease.description.toLowerCase().includes(query.toLowerCase()))
            );
            setFilteredData(filtered);
        } else {
            setFilteredData(diseasesData);
        }
    };

    const navigateToDetail = (disease) => {
        router.push({
            pathname: '/Disease/Detail',
            params: { disease: JSON.stringify(disease) }
        });
    };

    const renderDiseaseItem = ({ item }) => {
        const previewText = getCleanPreviewText(item.description);

        return (
            <TouchableOpacity
                style={[styles.card, { flexDirection: 'column', padding: 10, paddingLeft: 10 }]}
                onPress={() => navigateToDetail(item)}
            >
                <Image
                    source={{ uri: item.image || item.photo_url || item.photo }}
                    style={localStyles.diseaseImage}
                    defaultSource={require('../../../assets/images/placeholder-medical.jpeg')}
                />
                <View style={localStyles.itemContent}>
                    <View style={localStyles.itemHeader}>
                        <Text style={[styles.subtitle, { color: theme.colors.primary, flex: 1 }]}>
                            {item.name}
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.secText} />
                    </View>
                    <Text style={[styles.bodyText, { color: theme.colors.secText, fontSize: 11 }]} numberOfLines={3}>
                        {previewText}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.pageContainer, localStyles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10 }}>
                <Text style={[styles.pageTitle, { flexShrink: 1 }]}>Disease Knowledge</Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setShowSearchBar(!showSearchBar)}>
                        <MaterialIcons name='search' size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {showSearchBar && (
                <View style={[localStyles.actionBar, styles.pageContainer]}>
                    <TextInput
                        value={searchQuery}
                        onChangeText={handleSearch}
                        placeholder="Search diseases..."
                        placeholderTextColor={theme.colors.secText}
                        style={styles.textInput}
                    />
                    <Ionicons name="close-circle-outline" size={30} color={theme.colors.text} onPress={() => { handleSearch(''); setShowSearchBar(false) }} />
                </View>
            )}

            {/* Display loader during explicit database readings */}
            {isLoading ? (
                <View style={localStyles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                /* Diseases List */
                <FlatList
                    data={filteredData}
                    renderItem={renderDiseaseItem}
                    keyExtractor={(item) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={localStyles.listContent}
                    style={localStyles.list}
                    ListEmptyComponent={
                        <View style={localStyles.emptyState}>
                            <Ionicons name="medical-outline" size={64} color={theme.colors.secText} />
                            <Text style={[styles.subtitle, { color: theme.colors.secText, textAlign: 'center' }]}>
                                No diseases found
                            </Text>
                            <Text style={[styles.bodyText, { color: theme.colors.secText, textAlign: 'center' }]}>
                                Try adjusting your search terms or running a sync
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const localStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 40,
        paddingBottom: 10,
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 100,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 20,
    },
    diseaseImage: {
        width: '100%',
        height: 120,
        borderRadius: 8,
        marginBottom: 8,
    },
    itemContent: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
});

export default DiseaseKnowledgeScreen;
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';

const DiseaseDetailScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const disease = JSON.parse(params.disease);

    const theme = useTheme();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();

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

    return (
        <View style={[styles.pageContainer, { flex: 1 }]}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: insets.top + 10, paddingBottom: 10 }}>
                <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <MaterialCommunityIcons name={'arrow-left'} size={24} color={theme.colors.primary} />
                    <Text style={styles.pageTitle}>{disease.name}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={localStyles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Disease Image */}
                <Image
                    source={{ uri: disease.image }}
                    style={localStyles.detailImage}
                    defaultSource={require('../../../assets/images/placeholder-medical.jpeg')}
                />

                {/* Render Unified Markdown Body */}
                <View style={localStyles.markdownContentWrapper}>
                    <Markdown style={markdownStyles}>
                        {disease.description}
                    </Markdown>
                </View>
            </ScrollView>
        </View>
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
    markdownContentWrapper: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
});

export default DiseaseDetailScreen;
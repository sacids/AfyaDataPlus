// DiseaseDetailScreen.js
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

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

    return (
        <View style={[styles.pageContainer]}>
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

                {/* Description */}
                <View style={localStyles.section}>
                    <Text style={localStyles.sectionTitle}>Description</Text>
                    <Text style={styles.bodyText}>{disease.description}</Text>
                </View>

                {/* Causes */}
                <View style={localStyles.section}>
                    <Text style={localStyles.sectionTitle}>Causes</Text>
                    <Text style={styles.bodyText}>{disease.causes}</Text>
                </View>

                {/* Symptoms */}
                <View style={localStyles.section}>
                    <Text style={localStyles.sectionTitle}>Symptoms</Text>
                    <View style={localStyles.symptomsGrid}>
                        {disease.symptoms.map((symptom, index) => (
                            <View key={index} style={[localStyles.symptomItem, { backgroundColor: theme.colors.inputBackground }]}>
                                <Ionicons name="medical" size={16} color={theme.colors.primary} />
                                <Text style={[styles.bodyText, { marginLeft: 8, flex: 1 }]}>{symptom}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Diagnosis */}
                <View style={localStyles.section}>
                    <Text style={localStyles.sectionTitle}>Diagnosis</Text>
                    <Text style={styles.bodyText}>{disease.diagnosis}</Text>
                </View>

                {/* Treatment */}
                <View style={localStyles.section}>
                    <Text style={localStyles.sectionTitle}>Treatment</Text>
                    <Text style={styles.bodyText}>{disease.treatment}</Text>
                </View>

                {/* Prevention */}
                <View style={localStyles.section}>
                    <Text style={localStyles.sectionTitle}>Prevention</Text>
                    <Text style={styles.bodyText}>{disease.prevention}</Text>
                </View>
            </ScrollView>
        </View>
    );
};

const localStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    backButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    detailImage: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    symptomsGrid: {
        gap: 8,
    },
    symptomItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 6,
    },
});

export default DiseaseDetailScreen;
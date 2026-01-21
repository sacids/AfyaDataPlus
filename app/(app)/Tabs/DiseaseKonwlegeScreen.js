import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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

// Sample data for 15 priority diseases in East Africa with images
const DISEASES_DATA = [
    {
        id: '1',
        name: 'Malaria',
        description: 'A life-threatening disease caused by parasites transmitted through mosquito bites.',
        symptoms: ['Fever', 'Chills', 'Headache', 'Sweating', 'Fatigue', 'Nausea'],
        causes: 'Plasmodium parasites transmitted through Anopheles mosquito bites',
        diagnosis: 'Blood tests (microscopy, rapid diagnostic tests)',
        treatment: 'Antimalarial medications (Artemisinin-based combination therapy)',
        prevention: 'Mosquito nets, insect repellents, antimalarial prophylaxis',
        image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop'
    },
    {
        id: '2',
        name: 'HIV/AIDS',
        description: 'A chronic condition caused by human immunodeficiency virus that attacks the immune system.',
        symptoms: ['Fever', 'Fatigue', 'Swollen lymph nodes', 'Weight loss', 'Recurrent infections'],
        causes: 'Human Immunodeficiency Virus transmission through bodily fluids',
        diagnosis: 'Blood tests (ELISA, Western blot)',
        treatment: 'Antiretroviral therapy (ART)',
        prevention: 'Safe sex practices, needle exchange programs, PrEP',
        image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop'
    },
    {
        id: '3',
        name: 'Tuberculosis',
        description: 'An infectious disease that mainly affects the lungs, caused by Mycobacterium tuberculosis.',
        symptoms: ['Chronic cough', 'Chest pain', 'Coughing blood', 'Fever', 'Night sweats', 'Weight loss'],
        causes: 'Mycobacterium tuberculosis bacteria transmitted through air',
        diagnosis: 'Sputum tests, chest X-ray, tuberculin skin test',
        treatment: 'Antibiotic course (6-9 months)',
        prevention: 'BCG vaccine, proper ventilation, early treatment',
        image: 'https://images.unsplash.com/photo-1584467735871-8db9ac8d55b9?w=400&h=300&fit=crop'
    },
    {
        id: '4',
        name: 'Cholera',
        description: 'An acute diarrheal illness caused by infection of the intestine with Vibrio cholerae bacteria.',
        symptoms: ['Watery diarrhea', 'Vomiting', 'Leg cramps', 'Dehydration', 'Rapid heart rate'],
        causes: 'Vibrio cholerae bacteria from contaminated water/food',
        diagnosis: 'Stool culture, rapid dipstick tests',
        treatment: 'Oral rehydration solution, antibiotics, zinc supplements',
        prevention: 'Safe water, proper sanitation, hand washing',
        image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=300&fit=crop'
    },
    {
        id: '5',
        name: 'Typhoid Fever',
        description: 'A bacterial infection caused by Salmonella typhi that can spread throughout the body.',
        symptoms: ['High fever', 'Headache', 'Stomach pain', 'Constipation or diarrhea', 'Rose spots'],
        causes: 'Salmonella typhi bacteria from contaminated food/water',
        diagnosis: 'Blood culture, stool test, Widal test',
        treatment: 'Antibiotics (Ciprofloxacin, Ceftriaxone)',
        prevention: 'Vaccination, safe food handling, boiled water',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop'
    },
    {
        id: '6',
        name: 'Hepatitis B',
        description: 'A serious liver infection caused by hepatitis B virus that can become chronic.',
        symptoms: ['Abdominal pain', 'Dark urine', 'Fever', 'Joint pain', 'Jaundice', 'Loss of appetite'],
        causes: 'Hepatitis B virus through blood and bodily fluids',
        diagnosis: 'Blood tests (HBsAg, liver function tests)',
        treatment: 'Antiviral medications, interferon injections',
        prevention: 'Vaccination, safe injection practices, safe sex',
        image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop'
    },
    {
        id: '7',
        name: 'Measles',
        description: 'A highly contagious viral disease that can be serious for small children.',
        symptoms: ['High fever', 'Cough', 'Runny nose', 'Red eyes', 'Rash', 'Koplik spots'],
        causes: 'Measles virus transmitted through air and direct contact',
        diagnosis: 'Clinical examination, blood tests for antibodies',
        treatment: 'Supportive care, vitamin A supplements',
        prevention: 'MMR vaccination, isolation of infected individuals',
        image: 'https://images.unsplash.com/photo-1583324113626-70df0f4deaab?w=400&h=300&fit=crop'
    },
    {
        id: '8',
        name: 'Meningitis',
        description: 'Inflammation of the protective membranes covering the brain and spinal cord.',
        symptoms: ['Sudden high fever', 'Stiff neck', 'Severe headache', 'Nausea', 'Sensitivity to light'],
        causes: 'Bacterial, viral, or fungal infections',
        diagnosis: 'Lumbar puncture, blood tests, CT scan',
        treatment: 'Antibiotics, antiviral medications, corticosteroids',
        prevention: 'Vaccination, prophylactic antibiotics for contacts',
        image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=300&fit=crop'
    },
    {
        id: '9',
        name: 'Pneumonia',
        description: 'An infection that inflames air sacs in one or both lungs, which may fill with fluid.',
        symptoms: ['Chest pain', 'Cough with phlegm', 'Fever', 'Shortness of breath', 'Fatigue'],
        causes: 'Bacteria, viruses, fungi, or aspiration',
        diagnosis: 'Chest X-ray, blood tests, sputum culture',
        treatment: 'Antibiotics, antiviral medications, oxygen therapy',
        prevention: 'Vaccination, hand hygiene, smoking cessation',
        image: 'https://images.unsplash.com/photo-1584467735871-8db9ac8d55b9?w=400&h=300&fit=crop'
    },
    {
        id: '10',
        name: 'Dengue Fever',
        description: 'A mosquito-borne viral infection causing a severe flu-like illness.',
        symptoms: ['High fever', 'Severe headache', 'Pain behind eyes', 'Joint pain', 'Rash', 'Bleeding'],
        causes: 'Dengue virus transmitted by Aedes mosquitoes',
        diagnosis: 'Blood tests (NS1 antigen, IgM/IgG antibodies)',
        treatment: 'Supportive care, hydration, pain relievers',
        prevention: 'Mosquito control, protective clothing, insect repellent',
        image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop'
    },
    {
        id: '11',
        name: 'Schistosomiasis',
        description: 'A parasitic disease caused by blood flukes (trematode worms) of the genus Schistosoma.',
        symptoms: ['Abdominal pain', 'Diarrhea', 'Blood in stool', 'Liver enlargement', 'Anemia'],
        causes: 'Parasitic worms from contaminated freshwater',
        diagnosis: 'Stool/urine examination, blood tests for antibodies',
        treatment: 'Praziquantel medication',
        prevention: 'Avoid swimming in freshwater, improved sanitation',
        image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=300&fit=crop'
    },
    {
        id: '12',
        name: 'Leishmaniasis',
        description: 'A parasitic disease spread by sandfly bites, affecting skin or internal organs.',
        symptoms: ['Skin sores', 'Fever', 'Weight loss', 'Enlarged spleen/liver', 'Anemia'],
        causes: 'Leishmania parasites from sandfly bites',
        diagnosis: 'Tissue biopsy, blood tests, bone marrow aspiration',
        treatment: 'Antimonial compounds, amphotericin B, miltefosine',
        prevention: 'Sandfly control, protective clothing, insect repellent',
        image: 'https://images.unsplash.com/photo-1583324113626-70df0f4deaab?w=400&h=300&fit=crop'
    },
    {
        id: '13',
        name: 'Trypanosomiasis',
        description: 'Sleeping sickness caused by parasitic protozoa transmitted by tsetse flies.',
        symptoms: ['Fever', 'Headache', 'Joint pain', 'Itching', 'Sleep disturbances', 'Confusion'],
        causes: 'Trypanosoma parasites from tsetse fly bites',
        diagnosis: 'Blood smear, lymph node aspiration, CSF examination',
        treatment: 'Various antiparasitic medications depending on stage',
        prevention: 'Tsetse fly control, protective clothing, insect repellent',
        image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop'
    },
    {
        id: '14',
        name: 'Lymphatic Filariasis',
        description: 'A parasitic infection caused by microscopic worms transmitted through mosquito bites.',
        symptoms: ['Lymphedema', 'Elephantiasis', 'Hydrocele', 'Fever', 'Chills'],
        causes: 'Filarial worms transmitted by mosquito bites',
        diagnosis: 'Blood tests (antigen detection, microfilariae)',
        treatment: 'Antiparasitic medications, hygiene measures',
        prevention: 'Mass drug administration, mosquito control',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop'
    },
    {
        id: '15',
        name: 'Trachoma',
        description: 'A bacterial infection that affects the eyes and is the leading infectious cause of blindness.',
        symptoms: ['Eye irritation', 'Eye discharge', 'Eyelid swelling', 'Light sensitivity', 'Eye pain'],
        causes: 'Chlamydia trachomatis bacteria through direct contact',
        diagnosis: 'Clinical examination, laboratory tests',
        treatment: 'Antibiotics (azithromycin), eyelid surgery',
        prevention: 'Face washing, environmental improvement, antibiotics',
        image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop'
    }
];

const DiseaseKnowledgeScreen = () => {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredData, setFilteredData] = useState(DISEASES_DATA);
    const [showSearchBar, setShowSearchBar] = useState(false);

    const theme = useTheme();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (query) {
            const filtered = DISEASES_DATA.filter(disease =>
                disease.name.toLowerCase().includes(query.toLowerCase()) ||
                disease.description.toLowerCase().includes(query.toLowerCase()) ||
                disease.symptoms.some(symptom => symptom.toLowerCase().includes(query.toLowerCase()))
            );
            setFilteredData(filtered);
        } else {
            setFilteredData(DISEASES_DATA);
        }
    };

    const navigateToDetail = (disease) => {
        router.push({
            pathname: '/Disease/Detail',
            params: { disease: JSON.stringify(disease) }
        });
    };

    const renderDiseaseItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, { flexDirection: 'column', padding: 10, paddingLeft: 10 }]}
            onPress={() => navigateToDetail(item)}
        >
            <Image
                source={{ uri: item.image }}
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
                <Text style={[styles.bodyText, { color: theme.colors.secText, fontSize: 10 }]} numberOfLines={2}>
                    {item.description}
                </Text>
                <View style={localStyles.symptomsContainer}>
                    {item.symptoms.slice(0, 3).map((symptom, index) => (
                        <View key={index} style={[localStyles.symptomTag, { backgroundColor: theme.colors.primary }]}>
                            <Text style={[styles.caption, { color: 'white' }]}>{symptom}</Text>
                        </View>
                    ))}
                    {item.symptoms.length > 3 && (
                        <View style={[localStyles.symptomTag, { backgroundColor: theme.colors.primary }]}>
                            <Text style={[styles.caption, { color: 'white' }]}>
                                +{item.symptoms.length - 3} more
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.pageContainer, localStyles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10 }}>
                <Text
                    style={[styles.pageTitle, { flexShrink: 1 }]}
                >Disease Knowlege</Text>
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


            {/* Diseases List */}
            <FlatList
                data={filteredData}
                renderItem={renderDiseaseItem}
                keyExtractor={(item) => item.id}
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
                            Try adjusting your search terms
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const localStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },

    actionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 40,
        paddingBottom: 10,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        padding: 0,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 20,
    },
    itemContainer: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    diseaseImage: {
        width: '100%',
        height: 80,
        borderRadius: 8,
        marginBottom: 4,
    },
    itemContent: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 10,

    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    symptomsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    symptomTag: {
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
});

export default DiseaseKnowledgeScreen;
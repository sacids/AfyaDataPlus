import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../../../components/layout/AppHeader';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import useProjectStore from '../../../store/projectStore';
import { getFormDefns, select } from '../../../utils/database';

const ListEmptyForms = () => {

    const router = useRouter();
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const { currentProject, currentData } = useProjectStore();
    const theme = useTheme();
    const styles = getStyles(theme);


    const fetchData = async () => {
        try {

            let childCodes = []
            if (currentData) {
                const currentDataForm = await select('form_defn', 'form_id = ?', [currentData.form]);
                //console.log('current data form children', currentData.form, currentDataForm[0]);

                // Get the children string or default to '201'
                const childrenString = currentDataForm[0]?.children || '201';

                // Split the comma-separated string into an array of codes
                childCodes = childrenString.split(',').map(code => Number(code.trim()));
            }

            // Call getFormData with the array of codes
            const results = await getFormDefns(currentProject?.project, childCodes);

            setData(results);
            setFilteredData(results);
        } catch (error) {
            console.error('Error fetching data:', error);
            Alert.alert('Error', 'Failed to fetch data.');
        }
    };



    const renderItem = ({ item }) => {
        return (
            <TouchableOpacity onPress={() => router.push(`/Form/New?fdefn_id=${item.id}`)}>
                <View style={[styles.card, { flexDirection: 'row', alignContent: 'center', alignItems: 'center' }]}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.title}>{item.title}</Text>

                        {item.description && (
                            <Text
                                numberOfLines={2}
                                ellipsizeMode="tail"
                                style={[styles.tiny, { fontSize: 12 }]}>
                                {item.description}
                            </Text>
                        )}

                        <Text style={styles.tiny}>VERSION: {item.version}</Text>
                    </View>

                    <MaterialIcons
                        name="keyboard-arrow-right"
                        size={24}
                        color={theme.colors.text}
                    />
                </View>
            </TouchableOpacity>
        );
    };



    useEffect(() => {
        //addFormDefn();
        fetchData();
    }, []);


    return (

        <ScreenWrapper>
            <AppHeader
                title={"Project Forms"}
                searchEnabled={false}
            />


            <FlatList
                data={filteredData}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEventThrottle={16}
                contentContainerStyle={styles.scrollContent}
                style={styles.flatList}
                ListEmptyComponent={<Text style={{ padding: 20 }}>No data available</Text>}
            />
        </ScreenWrapper>
    )
}

export default ListEmptyForms

import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import useProjectStore from '../../store/projectStore';
import { insert, select } from '../../utils/database';

const ListEmptyForms = () => {

    const router = useRouter();
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const { currentProject } = useProjectStore();
    const theme = useTheme();
    const styles = getStyles(theme);


    const fetchData = async () => {
        try {
            const results = await select('form_defn', 'project = ?', [currentProject?.project]);
            //const results = await select('form_defn');
            setData(results);
            setFilteredData(results);
        } catch (error) {
            console.error('Error fetching data:', error);
            Alert.alert('Error', 'Failed to fetch data.');
        }
    };


    const addFormDefn = () => {

        const data = {

            'title': 'Barns',
            'form_id': 2,
            'version': '1.0',
            'short_title': 'Barns',
            'code': '201',
            'form_type': 'form',
            'form_actions': 'edit, delete, add_new',
            'form_category': 'OU',
            'description': 'Barns',
            'compulsory': 'yes',
            'sort_order': 0,
            'active': 1,
            'form_defn': JSON.stringify(

            )
        }

        insert('form_defn', data);
    }


    const renderItem = ({ item }) => {
        return (
            <TouchableOpacity onPress={() => router.push(`/Form/New?id=${item.id}`)}>
                <View style={{
                    padding: 15,
                    paddingLeft: 20,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: theme.colors.inputBackground,
                    borderRadius: 8,
                    borderColor: theme.colors.inputBorder,
                    borderWidth: 1,
                    marginVertical: 5,
                    marginHorizontal: 15,
                }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.title}>{item.title}</Text>

                        <Text
                            numberOfLines={2}
                            ellipsizeMode="tail"
                            style={[styles.metaText, { fontSize: 12 }]}>
                            {item.description}
                        </Text>

                        <Text style={styles.metaText}>VERSION: {item.version}</Text>
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
        <View style={styles.pageContainer}>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 40, paddingBottom: 10 }}>

                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialCommunityIcons name={'arrow-left'} size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.pageTitle}>Project Forms</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => alert('Filter not implemented')}>
                        <MaterialIcons name={'search'} size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => alert('Filter not implemented')}>
                        <MaterialCommunityIcons name="dots-vertical" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={filteredData}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEventThrottle={16}
                contentContainerStyle={styles.flatListContent}
                style={styles.flatList}
                ListEmptyComponent={<Text style={{ padding: 20 }}>No data available</Text>}
            />
        </View>
    )
}

export default ListEmptyForms

import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../../../components/layout/AppHeader';
import { FormIcons } from '../../../components/layout/FormIcons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import useProjectStore from '../../../store/projectStore';
import { select } from '../../../utils/database';

const ListEmptyForms = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const { currentProject } = useProjectStore();
    const theme = useTheme();
    const styles = getStyles(theme);

    const fetchData = async () => {
        try {
            const results = await select('form_defn', 'project = ?', [currentProject.project],
                'id, form_id, title, version, icon, is_root, short_title',
                " is_root DESC ");

            //console.log('fetch data results', results)
            setData(results);
            setFilteredData(results);
        } catch (error) {
            console.error('Error fetching data:', error);
            Alert.alert(
                t('errors:errorTitle'),
                t('errors:failedLoad')
            );
        }
    };

    const renderItem = ({ item }) => {
        // return (
        //     <TouchableOpacity onPress={() => router.push(`/Form/New?fdefn_id=${item.id}`)}>
        //         <View style={[styles.card, { flexDirection: 'row', alignContent: 'center', alignItems: 'center' }]}>

        //             <FormIcons
        //                 iconName={item.icon}
        //                 size={40}
        //                 color={theme.colors.primary}
        //             />

        //             <View style={{ flex: 1, marginHorizontal: 10 }}>
        //                 <Text style={styles.title}>{item.title}</Text>

        //                 {item.description && (
        //                     <Text
        //                         numberOfLines={2}
        //                         ellipsizeMode="tail"
        //                         style={[styles.tiny, { fontSize: 12 }]}>
        //                         {item.description}
        //                     </Text>
        //                 )}

        //                 <Text style={styles.tiny}>
        //                     {t('forms:version')}: {item.version}
        //                 </Text>
        //             </View>

        //             <MaterialIcons
        //                 name="keyboard-arrow-right"
        //                 size={24}
        //                 color={theme.colors.text}
        //             />
        //         </View>
        //     </TouchableOpacity>
        // );
        const form = item;

        return (
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


                    <View style={[
                        styles.avatar,
                        { backgroundColor: theme.colors.primary },
                        { width: 44, height: 44, borderRadius: 22 }
                    ]}>
                        <FormIcons
                            iconName={form?.icon}
                            color="#fff"
                        />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.bodyText}>{form.title}</Text>
                        {form.description && (
                            <Text
                                numberOfLines={2}
                                ellipsizeMode="tail"
                                style={[styles.tiny, { fontSize: 12 }]}>
                                {form.description}
                            </Text>
                        )}
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
        )
    };

    useEffect(() => {
        fetchData();

        return () => {
            // Optional cleanup when the screen loses focus
        };
    }, []);

    return (
        <ScreenWrapper>
            <AppHeader
                title={t('forms:projectForms')}
                searchEnabled={false}
            />

            <FlatList
                data={filteredData}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEventThrottle={16}
                contentContainerStyle={styles.scrollContent}
                style={styles.flatList}
                ListEmptyComponent={
                    <Text style={{ padding: 20, color: theme.colors.text }}>
                        {t('data:noData')}
                    </Text>
                }
            />
        </ScreenWrapper>
    );
}

export default ListEmptyForms;
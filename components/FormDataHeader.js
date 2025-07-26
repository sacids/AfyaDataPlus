import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useFilterStore } from '../store/filterStore';

const AVAILABLE_TAGS = ['All', 'Sent', 'Finalized', 'Draft', 'Archived'];

const FormDataHeader = ({ data }) => {  // Changed to properly destructure props
    const selectedTag = useFilterStore((state) => state.filter);
    const setFilter = useFilterStore((state) => state.setFilter);
    const theme = useTheme();

    const styles = StyleSheet.create({
        headerContainer: {
            paddingVertical: 10,
            paddingHorizontal: 10,
        },
        tagsScrollView: {
            paddingHorizontal: 5,
        },
        tag: {
            backgroundColor: theme.colors.tagBackground,
            paddingVertical: 4,
            paddingHorizontal: 12,
            borderRadius: 10,
            marginRight: 10,
        },
        selectedTag: {
            backgroundColor: theme.colors.primary,
        },
        tagText: {
            fontSize: 13,
            color: theme.colors.tagText,
            fontWeight: 'bold',
        },
        selectedTagText: {
            color: "#eee",
            fontWeight: 'bold',
        },
    });

    function getStat(tag) {
        if (!data) return 0;  // Add null check

        if (tag === 'All') {
            return data.filter((item) => !item.archived).length;
        }
        if (tag === 'Archived') {
            return data.filter((item) => item.archived).length;
        }
        return data.filter((item) => item.status.toLowerCase() === tag.toLowerCase()).length;
    }

    return (
        <View style={styles.headerContainer}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagsScrollView}
            >
                {AVAILABLE_TAGS.map((tag, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.tag,
                            selectedTag === tag && styles.selectedTag,
                        ]}
                        onPress={() => { setFilter(tag); }}
                    >
                        <Text
                            style={[
                                styles.tagText,
                                selectedTag === tag && styles.selectedTagText,
                            ]}
                        >
                            {tag} {getStat(tag)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

export default FormDataHeader; 
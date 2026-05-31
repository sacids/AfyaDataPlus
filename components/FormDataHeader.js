import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
    Dimensions,
    Modal,
    Pressable,
    ScrollView // Added ScrollView for scrollable list container
    ,

    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useFilterStore } from '../store/filterStore';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const FILTER_CONFIG = [
    { key: 'status', type: 'distinct', defaultLabel: 'All' },
    { key: 'workflow_state', type: 'distinct' },
    { key: 'has_seen', type: 'custom', targetValue: 0, label: 'New' },
    { key: 'archived', type: 'boolean', trueLabel: 'Archived' }
];

const FormDataHeader = ({ data = [] }) => {
    const activeFilter = useFilterStore((state) => state.activeFilter);
    const setFilter = useFilterStore((state) => state.setFilter);
    const theme = useTheme();

    const [modalVisible, setModalVisible] = useState(false);
    const [customOrderKeys, setCustomOrderKeys] = useState([]);

    const styles = StyleSheet.create({
        headerContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 12,
            justifyContent: 'space-between',
            width: '100%',
        },
        visibleTagsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            overflow: 'hidden',
        },
        tag: {
            backgroundColor: theme.colors.tagBackground || '#414141',
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 10,
            marginRight: 6,
        },
        selectedTag: {
            backgroundColor: theme.colors.primary || '#007AFF',
        },
        tagText: {
            fontSize: 12,
            color: theme.colors.tagText || '#bbb',
            fontWeight: 'bold',
        },
        selectedTagText: {
            color: '#eee',
            fontWeight: 'bold',
        },
        iconButton: {
            padding: 6,
            borderRadius: 8,
            backgroundColor: theme.colors.tagBackground || '#414141',
            justifyContent: 'center',
            alignItems: 'center',
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
        },
        modalContent: {
            backgroundColor: theme.colors.cardBackground || '#2a2a2a',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 20,
            maxHeight: SCREEN_HEIGHT * 0.60, // Enforce maximum height of 60% of screen height
        },
        modalTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.colors.text || '#fff',
            marginBottom: 15,
        },
        modalScrollList: {
            flexGrow: 0, // Keeps the ScrollView from expanding aggressively beyond bounds
        },
        modalListContainer: {
            flexDirection: 'column', // Layout tags vertically in a column
            gap: 10, // Space rows evenly
        },
        modalTag: {
            flexDirection: 'row', // Horizontal alignment inside row elements
            justifyContent: 'space-between', // Push label to left and count chip to right
            alignItems: 'center',
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderStyle: 'dotted',
            borderBottomColor: theme.colors.border || '#444',
            width: '100%',
        },
        modalTagText: {
            fontSize: 14,
            color: theme.colors.tagText || '#bbb',
            fontWeight: '600',
        },
        countChip: {
            backgroundColor: theme.colors.primary || '#007AFF',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            minWidth: 32,
            alignItems: 'center',
            justifyContent: 'center',
        },
        countChipText: {
            color: '#fff',
            fontSize: 10,
            fontWeight: 'bold',
        },
        closeButton: {
            marginTop: 15,
            alignSelf: 'center',
            padding: 10,
        },
        closeButtonText: {
            color: theme.colors.primary || '#007AFF',
            fontWeight: 'bold',
        }
    });



    const getStat = (tag) => {
        if (!data) return 0;
        if (tag.key === 'archived' && tag.value === true) {
            return data.filter((item) => item.archived).length;
        }

        // Check if item hasn't been archived, and its database field 'has_seen' equals 0
        if (tag.key === 'has_seen' && tag.value === 0) {
            return data.filter((item) => !item.archived && item.has_seen === 0).length;
        }

        if (tag.value === 'All') {
            return data.filter((item) => !item.archived).length;
        }
        return data.filter(
            (item) => !item.archived && String(item[tag.key]).toLowerCase() === String(tag.value).toLowerCase()
        ).length;
    };

    const allTags = useMemo(() => {
        let tags = [];

        FILTER_CONFIG.forEach((cfg) => {
            const activeRange = data.filter(item => !item.archived);

            if (cfg.type === 'distinct') {
                if (cfg.defaultLabel) {
                    tags.push({ key: cfg.key, value: 'All', label: cfg.defaultLabel });
                }
                const uniqueValues = [
                    ...new Set(
                        activeRange
                            .map((item) => item[cfg.key])
                            .filter((val) => val !== undefined && val !== null && val !== '')
                    ),
                ];
                uniqueValues.forEach((val) => {
                    const readable = String(val).charAt(0).toUpperCase() + String(val).slice(1);
                    tags.push({ key: cfg.key, value: val, label: readable });
                });
            } else if (cfg.type === 'boolean') {
                tags.push({ key: cfg.key, value: true, label: cfg.trueLabel });
            } else if (cfg.type === 'custom') {
                // Correctly append your 'New' payload mapping targetValue to the store payload value
                tags.push({ key: cfg.key, value: cfg.targetValue, label: cfg.label });
            }
        });

        const allTagElement = tags.find(t => t.value === 'All');
        const filteringTags = tags.filter(t => t.value !== 'All');

        let sortedTags = [...filteringTags];
        customOrderKeys.slice().reverse().forEach(({ key, value }) => {
            const targetIndex = sortedTags.findIndex(t => t.key === key && t.value === value);
            if (targetIndex > -1) {
                const [element] = sortedTags.splice(targetIndex, 1);
                sortedTags.unshift(element);
            }
        });

        if (allTagElement) {
            sortedTags.unshift(allTagElement);
        }

        return sortedTags;
    }, [data, customOrderKeys]);

    const { visibleTags, overflowTags } = useMemo(() => {
        // Character tracking estimation layout variables
        const spaceThreshold = Dimensions.get('window').width - 85;
        let rollingWidthSum = 0;
        let visibleList = [];
        let overflowList = [];

        allTags.forEach((tag) => {
            const labelStr = `${tag.label} ${getStat(tag)}`;
            const computedTagWidth = 20 + labelStr.length * 7.2;

            if (rollingWidthSum + computedTagWidth < spaceThreshold) {
                rollingWidthSum += computedTagWidth;
                visibleList.push(tag);
            } else {
                if (tag.value === 'All') {
                    rollingWidthSum += computedTagWidth;
                    visibleList.push(tag);
                } else {
                    overflowList.push(tag);
                }
            }
        });

        const activeInOverflowIdx = overflowList.findIndex(
            (t) => t.key === activeFilter.key && t.value === activeFilter.value
        );

        if (activeInOverflowIdx > -1) {
            const [movedTag] = overflowList.splice(activeInOverflowIdx, 1);
            if (visibleList.length > 1) {
                const evacuated = visibleList.pop();
                overflowList.unshift(evacuated);
                visibleList.push(movedTag);
            } else {
                visibleList.push(movedTag);
            }
        }

        return { visibleTags: visibleList, overflowTags: overflowList };
    }, [allTags, activeFilter, data]);

    const handleSelectTag = (tag, isFromOverflow = false) => {
        if (isFromOverflow) {
            setCustomOrderKeys(prev => {
                const clean = prev.filter(p => !(p.key === tag.key && p.value === tag.value));
                return [...clean, { key: tag.key, value: tag.value }];
            });
            setModalVisible(false);
        }
        setFilter(tag);
    };

    return (
        <View style={styles.headerContainer}>
            <View style={styles.visibleTagsRow}>
                {visibleTags.map((tag, index) => {
                    const isSelected = activeFilter.key === tag.key && activeFilter.value === tag.value;
                    return (
                        <TouchableOpacity
                            key={`${tag.key}-${tag.value}-${index}`}
                            style={[styles.tag, isSelected && styles.selectedTag]}
                            onPress={() => handleSelectTag(tag, false)}
                        >
                            <Text style={[styles.tagText, isSelected && styles.selectedTagText]}>
                                {tag.label} {getStat(tag)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {overflowTags.length > 0 && (
                <TouchableOpacity style={styles.iconButton} onPress={() => setModalVisible(true)}>
                    <MaterialIcons name="filter-list" size={20} color={theme.colors.text || '#fff'} />
                </TouchableOpacity>
            )}

            {/* Overflow Sheet Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <Pressable style={styles.modalContent}>
                        <Text style={styles.modalTitle}>More Filters</Text>

                        {/* ScrollView makes the contents scrollable up to max limits */}
                        <ScrollView
                            style={styles.modalScrollList}
                            contentContainerStyle={styles.modalListContainer}
                            showsVerticalScrollIndicator={false}
                        >
                            {overflowTags.map((tag, index) => (
                                <TouchableOpacity
                                    key={`overflow-${tag.key}-${tag.value}-${index}`}
                                    style={styles.modalTag}
                                    onPress={() => handleSelectTag(tag, true)}
                                >
                                    <Text style={styles.modalTagText}>{tag.label}</Text>

                                    {/* Separate Count Chip badge */}
                                    <View style={styles.countChip}>
                                        <Text style={styles.countChipText}>{getStat(tag)}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

export default FormDataHeader;
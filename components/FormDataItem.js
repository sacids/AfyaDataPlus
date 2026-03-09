import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { getStyles } from '../constants/styles';
import { useTheme } from '../context/ThemeContext';
import { FormIcons } from './layout/FormIcons';

const { width } = Dimensions.get('window');

export default function FormDataItem({
    item,
    onPress,
    onLongPress,
    onAction,
    isSelected,
    toggleSelection,
    onSwipeChange,
    setResetSwipe,
}) {
    const translateX = useSharedValue(0);
    const isSwiped = useSharedValue(false);

    const theme = useTheme();
    const styles = getStyles(theme);

    const resetSwipe = () => {
        if (translateX.value < 0) {
            translateX.value = withTiming(0);
            isSwiped.value = false;
            runOnJS(onSwipeChange)(false);
        }
    };

    React.useEffect(() => {
        setResetSwipe(() => resetSwipe);
    }, [setResetSwipe]);

    const panGesture = Gesture.Pan()
        .minDistance(10)
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
        .onUpdate((event) => {
            if (event.translationX < 0) {
                translateX.value = event.translationX;
            }
        })
        .onEnd(() => {
            if (translateX.value < -width * 0.25) {
                translateX.value = withTiming(-width * 0.5);
                isSwiped.value = true;
                runOnJS(onSwipeChange)(true);
            } else {
                translateX.value = withTiming(0);
                isSwiped.value = false;
                runOnJS(onSwipeChange)(false);
            }
        });

    const tapGesture = Gesture.Tap().onEnd(() => {
        if (translateX.value < 0) {
            translateX.value = withTiming(0);
            isSwiped.value = false;
            runOnJS(onSwipeChange)(false);
        }
    });

    const combinedGesture = Gesture.Exclusive(panGesture, tapGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    // Updated color logic to match dashboard health stats
    const getStatusTheme = (initial) => {
        switch (initial?.toUpperCase()) {
            case 'D': return { bg: '#f1c40f', label: 'Draft' };
            case 'S': return { bg: '#2ecc71', label: 'Sent' };
            case 'F': return { bg: theme.colors.primary, label: 'Finalized' };
            default: return { bg: theme.colors.hint, label: 'Other' };
        }
    };

    const initials = item.status?.charAt(0).toUpperCase() || 'D';
    const statusTheme = getStatusTheme(initials);

    return (
        <GestureDetector gesture={combinedGesture}>
            <View style={{ marginVertical: 4, marginHorizontal: 12, position: 'relative', overflow: 'hidden' }}>

                {/* Background Swipe Actions */}
                <View style={[styles.swipeActions, { borderRightRadius: 12 }]}>
                    <Pressable
                        style={[styles.swipeButton, { backgroundColor: theme.colors.error }]}
                        onPress={() => {
                            translateX.value = withTiming(0, {}, () => {
                                runOnJS(onAction)(item.uuid, 'delete');
                                runOnJS(onSwipeChange)(false);
                            });
                        }}
                    >
                        <MaterialIcons name="delete-outline" size={24} color="#fff" />
                        <Text style={styles.badgeText}>Delete</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.swipeButton, { backgroundColor: theme.colors.hint }]}
                        onPress={() => {
                            translateX.value = withTiming(0, {}, () => {
                                runOnJS(onAction)(item.uuid, 'archive');
                                runOnJS(onSwipeChange)(false);
                            });
                        }}
                    >
                        <MaterialIcons name="archive" size={24} color="#fff" />
                        <Text style={styles.badgeText}>Arch</Text>
                    </Pressable>
                </View>

                {/* Foreground Card */}
                <Animated.View style={[animatedStyle, styles.swipeForeground]}>
                    <Pressable
                        onPress={() => (translateX.value < 0 ? resetSwipe() : onPress())}
                        onLongPress={onLongPress}
                        style={[
                            styles.card,
                            { marginBottom: 0, flexDirection: 'row' }, // Reset margin for animation container
                            isSelected && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '08' }
                        ]}
                    >
                        {/* Avatar/Selection Section */}
                        <Pressable
                            onPress={() => toggleSelection(item.id)}
                            style={{ justifyContent: 'center', marginRight: 12 }}
                        >
                            <View style={[
                                styles.avatar,
                                { backgroundColor: isSelected ? theme.colors.primary : statusTheme.bg },
                                { width: 44, height: 44, borderRadius: 22 }
                            ]}>
                                {isSelected ? (
                                    <MaterialIcons name="check" size={24} color="#fff" />
                                ) : (
                                    <FormIcons iconName={item.icon} color="#fff" />
                                )}
                            </View>
                        </Pressable>

                        {/* Content Section */}
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text numberOfLines={1} style={[styles.bodyText, { fontWeight: '600' }]}>
                                    {item.title || 'Untitled Record'}
                                </Text>
                            </View>


                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
{/* 
                                <View style={[styles.badge, { backgroundColor: theme.colors.primary, borderWidth: 1, borderColor: theme.colors.primary }]}>
                                    <Text numberOfLines={1} style={[styles.badgeText,]}>
                                        {item.form_title}
                                    </Text>
                                </View> */}

                                <View style={[styles.badge, { backgroundColor: statusTheme.bg + '20', borderWidth: 1, borderColor: statusTheme.bg }]}>
                                    <Text style={[styles.tiny, { color: statusTheme.bg, fontWeight: '800' }]}>
                                        {statusTheme.label}
                                    </Text>
                                </View>
                                <Text style={styles.tiny}>
                                    {new Date(item.status_date).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>

                        <MaterialIcons name="chevron-right" size={20} color={theme.colors.hint} style={{ alignSelf: 'center', marginLeft: 4 }} />
                    </Pressable>
                </Animated.View>

            </View>
        </GestureDetector>
    );
}
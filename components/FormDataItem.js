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
        .activeOffsetX([-10, 10]) // Only trigger for horizontal gestures
        .failOffsetY([-10, 10])   // Allow vertical gestures to propagate
        .onUpdate((event) => {
            if (event.translationX < 0) {
                translateX.value = event.translationX;
            }
        })
        .onEnd(() => {
            if (translateX.value < -width * 0.3) {
                translateX.value = withTiming(-width * 0.6);
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

    const getStatusColor = (stat_initial) => {
        const key = stat_initial?.toUpperCase();

        switch (key) {
            case 'D':
                return '#FFC078'; // Soft amber/yellow
            case 'S':
                return '#74C0FC'; // Soft sky blue
            case 'F':
                return '#8CE99A'; // Soft green
            default:
                return '#CED4DA'; // Soft gray fallback
        }
    };
    const initials = item.status
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const bColor = getStatusColor(initials);

    return (
        <GestureDetector gesture={combinedGesture}>
            <View style={[{ flexDirection: 'row', marginVertical: 2 }]}>

                <Animated.View style={[styles.itemWrapper, animatedStyle]}>
                    <View style={[styles.item, isSelected && styles.selectedItem]}>
                        <Pressable onPress={() => toggleSelection(item.id)}>
                            <View style={[styles.avatar, { backgroundColor: bColor }, isSelected && styles.selectedAvatar]}>
                                {
                                    isSelected ?
                                        (
                                            <MaterialIcons
                                                name="check"
                                                size={24}
                                                color="#fff"
                                            />
                                        ) : (
                                            <Text style={styles.avatarText}>{initials}</Text>
                                        )
                                }
                            </View>
                        </Pressable>
                        <Pressable
                            style={styles.content}
                            onPress={() => {
                                if (translateX.value < 0) {
                                    translateX.value = withTiming(0);
                                    isSwiped.value = false;
                                    runOnJS(onSwipeChange)(false);
                                } else {
                                    onPress();
                                }
                            }}
                            onLongPress={onLongPress}
                        >
                            <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
                            <Text numberOfLines={1} style={styles.metaText}>Survey: {item.form_title}</Text>
                            <View style={styles.meta}>
                                <Text style={styles.metaText}>
                                    Created: {new Date(item.created_on).toLocaleDateString()}
                                </Text>
                                <Text style={styles.metaText}>
                                    {initials == 'S' ? 'Sent' : initials == 'F' ? 'Finalized' : 'Modified'}: {new Date(item.status_date).toLocaleDateString()}
                                </Text>
                            </View>
                        </Pressable>
                    </View>
                </Animated.View>

                <View style={styles.swipeActions}>
                    <Pressable
                        style={[styles.swipeButton, styles.deleteButton]}
                        onPress={() => {
                            translateX.value = withTiming(0, {}, () => {
                                runOnJS(onAction)(item.uuid, 'delete');
                                runOnJS(onSwipeChange)(false);
                            });
                            isSwiped.value = false;
                        }}
                    >
                        <MaterialIcons name="delete" size={24} color="#fff" />
                        <Text style={styles.swipeButtonText}>Delete</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.swipeButton, styles.archiveButton]}
                        onPress={() => {
                            translateX.value = withTiming(0, {}, () => {
                                runOnJS(onAction)(item.uuid, 'archive');
                                runOnJS(onSwipeChange)(false);
                            });
                            isSwiped.value = false;
                        }}
                    >
                        <MaterialIcons name="archive" size={24} color="#fff" />
                        <Text style={styles.swipeButtonText}>Archive</Text>
                    </Pressable>
                </View>
            </View>
        </GestureDetector>
    );





}


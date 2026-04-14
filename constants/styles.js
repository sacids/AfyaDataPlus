import { Dimensions, StyleSheet } from 'react-native';
const { width } = Dimensions.get('window');

// 1. TYPOGRAPHY SCALE (The "Source of Truth" for fonts)
export const Typography = {
  h1: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  h2: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  h3: { fontSize: 17, fontWeight: '600', lineHeight: 24 }, // Your current pageTitle
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  label: { fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '400' },
  tiny: { fontSize: 11, fontWeight: '700' },
};

export const getStyles = (theme) =>
  StyleSheet.create({
    // ----- LAYOUT SYSTEM -----
    pageContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    // Standard Header Replacement (Use this instead of position: absolute)
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
      // borderBottomWidth: 1,
      // borderBottomColor: theme.colors.inputBorder,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: 16,
    },

    headerSearchActive: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: theme.colors.inputBackground, // Or a highlight color
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.primary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 15,
    },

    // ----- TYPOGRAPHY CLASSES -----
    pageTitle: {
      ...Typography.h3,
      color: theme.colors.pageTitle,
    },
    sectionTitle: {
      ...Typography.h2,
      color: theme.colors.text,
      marginBottom: 12,
    },
    title: {
      ...Typography.h2,
      color: theme.colors.text,
      marginBottom: 12,
    },
    label: {
      ...Typography.label,
      color: theme.colors.label,
      marginBottom: 4,
    },
    bodyText: {
      ...Typography.body,
      color: theme.colors.text,
    },
    hint: {
      ...Typography.caption,
      color: theme.colors.hint,
      fontStyle: 'italic',
    },

    // Add this to fix the missing styles.tiny error
    tiny: {
      ...Typography.tiny,
      color: theme.colors.hint, // Default to hint color
    },

    // A helper for the status counts and labels
    statLabel: {
      ...Typography.tiny,
      fontSize: 9,
      letterSpacing: 0.5,
      color: theme.colors.hint,
      textAlign: 'center',
    },

    // Professional pill style for tags
    tagPill: {
      backgroundColor: theme.colors.inputBorder,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginRight: 6,
      marginBottom: 6,
    },

    // ----- COMPONENT STYLES -----
    inputBase: {
      ...Typography.body,
      marginTop: 5,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 8, // Modernized from 4
      padding: 12,
    },

    card: {
      padding: 16,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      marginBottom: 12,
      // ...Platform.select({
      //   ios: {
      //     shadowColor: '#000',
      //     shadowOffset: { width: 0, height: 2 },
      //     shadowOpacity: 0.1,
      //     shadowRadius: 4,
      //   },
      //   android: {
      //     elevation: 3,
      //   },
      // }),
    },

    // Status Badge System
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginTop: 4,
    },
    badgeText: {
      ...Typography.tiny,
      color: '#fff',
      textTransform: 'uppercase',
    },
    // Multi-select support
    // checkboxContainer: {
    //   marginRight: 12,
    //   justifyContent: 'center',
    // },

    // ----- SEARCH BAR SYSTEM -----
    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.inputBackground,
      marginHorizontal: 16,
      marginVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      height: 45,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
    },

    required: { color: theme.colors.error, marginRight: 5, paddingTop: 5 },
    locationText: {
      ...Typography.tiny,
      color: '#555',
      backgroundColor: 'rgba(255,255,255,0.8)',
      padding: 3,
      position: 'absolute',
      bottom: 0,
      width: '100%',
    },

    // FAB SYSTEM
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      backgroundColor: theme.colors.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },



    // SWIPE ACTION SYSTEM
    swipeActions: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: width * 0.5,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      overflow: 'hidden',
      backgroundColor: theme.colors.inputBorder, // Background of the reveal area
    },
    swipeForeground: {
      zIndex: 1,
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    swipeButton: {
      width: (width * 0.5) / 2,
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
    },
    avatar: {
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
    },




    navButton: {
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 18,
      alignItems: 'center',
    },

    navButtonText: {
      color: theme.colors.navButtonText,
      fontSize: 12,
    },

    buttonText: {
      ...Typography.label,
      color: 'white',
    },

    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    placeholderText: {
      color: '#999',
    },


    // Add these to your StyleSheet.create inside getStyles(theme)

    // FORM FIELD WRAPPER
    container: {
      marginBottom: 20,
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },

    // INPUT BOX SYSTEM (Used by Scanned Result)
    textInput: {
      ...Typography.body,
      color: theme.colors.text,
    },
    secTextInput: {
      ...Typography.caption,
      color: theme.colors.hint,
    },

    // CAMERA & MEDIA SYSTEM
    cameraContainer: {
      height: 250,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: '#000',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
    },
    camera: {
      flex: 1,
      height: 250,
    },


    mapContainer: {
      height: 170,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: 8,
      overflow: 'hidden',
      position: 'relative',
      marginTop: 8,
      marginBottom: 8,
    },


    map: {
      ...StyleSheet.absoluteFillObject,
    },


    loadingContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.inputBackground,
      zIndex: 1,
    },

    noLocation: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.inputBackground,
    },


    // ACTION BUTTONS (The "Scan" / "Cancel" buttons)

    button: {
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      gap: 10,
      paddingVertical: 14,
    },

    // ERROR SYSTEM
    errorText: {
      ...Typography.tiny,
      color: theme.colors.error,
      marginTop: 4,
      marginLeft: 4,
      fontWeight: '600',
    },

    // EMPTY/STATE TEXT
    text: {
      ...Typography.body,
      color: theme.colors.text,
      textAlign: 'center',
    },


    // ----- SELECT & PICKER STYLES -----
    pickerContainer: {
      padding: 0, // Reset padding from inputBase to allow picker to fill
      justifyContent: 'center',
      height: 50,
      overflow: 'hidden',
    },
    picker: {
      width: '100%',
      color: theme.colors.text,
      backgroundColor: 'transparent',
    },

    // Default appearance (Radio list)
    selectOne: {
      padding: 4,
      backgroundColor: 'transparent',
      borderWidth: 0, // We often want individual item borders instead of a group border
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 4,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 8,
      //borderWidth: 1,
      //borderColor: theme.colors.inputBorder,
      marginBottom: 4,
    },
    checkboxLabel: {
      ...Typography.body,
      marginLeft: 10,
      color: theme.colors.text,
    },

    // ----- SLIDER STYLES -----
    slider: {
      width: '100%',
      height: 40,
      marginVertical: 10,
    },

    // ----- ERROR STATE -----
    inputError: {
      borderColor: theme.colors.error,
      //backgroundColor: theme.colors.error + '05', // Very light red tint
    },










    // ----- MESSAGING SYSTEM -----
    messageBubbleMe: {
      alignSelf: 'flex-end',
      backgroundColor: theme.colors.primary,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 4,
      marginVertical: 4,
      maxWidth: '80%',
      padding: 12,
    },
    messageBubbleThem: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.inputBackground,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderBottomLeftRadius: 4,
      borderBottomRightRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      marginVertical: 4,
      maxWidth: '80%',
      padding: 12,
    },
    messageTextMe: {
      ...Typography.body,
      color: '#fff',
      fontSize: 15,
    },
    messageTextThem: {
      ...Typography.body,
      color: theme.colors.text,
      fontSize: 15,
    },
    messageTime: {
      ...Typography.tiny,
      marginTop: 4,
      textAlign: 'right',
    },

    // Chat input
    chatInputContainer: {
      flexDirection: 'row',
      padding: 12,
      backgroundColor: theme.colors.inputBackground,
      borderTopWidth: 1,
      borderTopColor: theme.colors.inputBorder,
      alignItems: 'center',
      gap: 8,
    },
    chatInput: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 16,
      color: theme.colors.text,
      maxHeight: 100,
    },
    chatSendButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 24,
      paddingHorizontal: 20,
      paddingVertical: 10,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 70,
    },
    chatSendButtonDisabled: {
      backgroundColor: theme.colors.inputBorder,
      opacity: 0.5,
    },

    // Chat header
    chatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.inputBorder,
    },


    // Language Modal & List Items
    languageItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 10,
      borderRadius: 8,
      marginVertical: 2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxHeight: '80%',
      borderRadius: 15,
      padding: 20,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },

    // Loading & Reset Overlays
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },









    // Add to your styles object
    selectedChipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
      minHeight: 40,
    },
    selectedChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.chipBackground,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
      gap: 4,
      maxWidth: '100%',
    },
    selectedChipText: {
      fontSize: 12,
      color: theme.colors.chipText,
      flexShrink: 1, // Allow text to shrink if needed
      flexWrap: 'wrap', // Allow text to wrap
    },
    minimalSelectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: theme.colors.inputBorder,
    },
    minimalSelectButtonText: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '500',
    },
    modalContainer: {
      width: '96%',
      maxHeight: '80%',
      backgroundColor: theme.colors.inputBackground,
      borderColor: theme.colors.inputBorder,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.inputBorder,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    modalScrollView: {
      maxHeight: '100%',
    },
    modalFooter: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.inputBorder,
    },
    modalDoneButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    modalDoneButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },

  });
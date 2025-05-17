import { Dimensions, StyleSheet } from 'react-native';
const { width } = Dimensions.get('window');

export const getStyles = (theme) =>
  StyleSheet.create({
    pageContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: 16,
    },
    pageTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    container: {
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      marginBottom: 8,
      color: theme.colors.label,
    },
    inputBase: {
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 4,
      padding: 12,
    },
    selectMultiple: {
      paddingVertical: 10,
    },
    selectOne: {
      paddingVertical: 10,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 4,
    },
    checkboxLabel: {
      marginLeft: 8,
      fontSize: 16,
      color: theme.colors.text,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 12,
      marginTop: 4,
    },
    textInput: {
      color: theme.colors.text,
    },
    button: {
      backgroundColor: theme.colors.buttonBackground,
      paddingVertical: 5,
      paddingHorizontal: 16,
      borderRadius: 4,
      alignItems: 'center',
    },
    buttonText: {
      color: theme.colors.buttonText,
      fontSize: 12,
      fontWeight: 'bold',
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    placeholderText: {
      color: '#999',
    },






    itemWrapper: {
      zIndex: 1,
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    item: {
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    selectedItem: {
      backgroundColor: theme.colors.inputBackground,
    },

    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      position: 'relative',
    },
    selectedAvatar: {
      backgroundColor: theme.colors.primary,
    },
    checkIcon: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      backgroundColor: '#40C4FF',
      borderRadius: 8,
      padding: 2,
    },
    avatarText: {
      color: '#222',
      fontSize: 18,
      fontWeight: 'bold',
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
      color: theme.colors.text,
    },
    meta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    metaText: {
      fontSize: 10,
      color: theme.colors.secText,
      marginRight: 12,
    },
    swipeActions: {
      flexDirection: 'row',
      position: 'absolute',
      right: 0,
      height: '100%',
    },
    swipeButton: {
      width: width * 0.3,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 12,
    },
    deleteButton: {
      backgroundColor: '#B85B5B',
    },
    archiveButton: {
      backgroundColor: '#C9A876',
    },
    swipeButtonText: {
      color: '#fff',
      fontSize: 12,
      marginTop: 4,
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

    locationText: {
      flex: 1,
      padding: 3,
      fontSize: 11,
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      width: '100%',
      color: '#555',
      backgroundColor: 'rgba(255,255,255,0.8)',
      bottom: 0,
      position: 'absolute',
    },
  });
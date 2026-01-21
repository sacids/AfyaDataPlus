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
      fontSize: 17,
      fontWeight: 'bold',
      color: theme.colors.pageTitle,
    },
    container: {
      marginBottom: 16,
    },
    labelContainer: {
      flexDirection: 'row',
    },
    label: {
      fontSize: 16,
      color: theme.colors.label,
      fontWeight: 'bold',
    },
    hint: {
      fontSize: 12,
      color: theme.colors.hint,
      fontStyle: 'italic',
    },
    required: {
      color: theme.colors.error,
      marginRight: 5,
      paddingTop: 5,
    },
    inputBase: {
      marginTop: 5,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 4,
      padding: 10,
    },

    card: {

      padding: 15,
      paddingLeft: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 8,
      borderColor: theme.colors.inputBorder,
      borderWidth: 1,
      marginVertical: 5,
      marginHorizontal: 15,
    },




    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 10
    },

    caption: {
      fontSize: 8,
    },

    selectMultiple: {
      paddingVertical: 10,
    },
    selectOne: {
      paddingVertical: 10,
    },
    picker: {
      padding: 0,
      color: theme.colors.text,
      margin: 0,
    },
    pickerContainer: {
      padding: 0,
      margin: 0,

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
    secTextInput: {
      color: theme.colors.secText,
    },
    button: {
      backgroundColor: theme.colors.buttonBackground,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 18,
      alignItems: 'center',
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
      color: theme.colors.buttonText,
      fontSize: 12,
    },

    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    placeholderText: {
      color: '#999',
    },
    searchBar: {
      backgroundColor: theme.colors.inputBackground,
      padding: 3,
      borderRadius: 8,
      borderColor: theme.colors.inputBorder,
      borderWidth: 1,
    },
    inputContainer: {
      marginTop: 5,
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


    fab: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      height: 56,
      borderRadius: 10,
      justifyContent: 'center',
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 5,
      overflow: 'hidden',
    },
    fabContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
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






    cameraContainer: {
      flex: 1,
      marginTop: 15,
      gap: 10,
    },
    camera: {
      flex: 1,
      width: '100%',
      height: 130,
      borderRadius: 5,
      overflow: 'hidden',
      marginBottom: 8,
      marginTop: 5,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
    },
  });
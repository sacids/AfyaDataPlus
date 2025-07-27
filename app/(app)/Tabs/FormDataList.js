
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';


import FormDataHeader from '../../../components/FormDataHeader';
import FormDataItem from '../../../components/FormDataItem';
import { getFormData, update } from '../../../utils/database';


import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';


import { useFilterStore } from '../../../store/filterStore';
import useProjectStore from '../../../store/projectStore';
import { getForms, postData } from '../../../utils/services';


export default function FormDataList() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [swipedItemId, setSwipedItemId] = useState(null);
  const [getFormStatus, setGetFormStatus] = useState('Ready to sync');
  const [showFormStatus, setShowFormStatus] = useState(false);
  const resetSwipeRef = useRef(null);
  const selectedTag = useFilterStore((state) => state.filter);
  const { currentProject, setCurrentProject } = useProjectStore();
  const insets = useSafeAreaInsets();

  const theme = useTheme();
  const styles = getStyles(theme);


  const fetchData = async () => {
    try {
      const results = await getFormData(currentProject?.project);
      //console.log('form data list', currentProject?.project);
      setData(results);
      setFilteredData(results);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to fetch data.');
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map((item) => item.id));
    }
    setSelectAll(!selectAll);
  };

  const clearSelections = () => {
    setSelectedIds([]);
    setSelectAll(false);
  };

  const confirmAndHandleAction = async (uuid, action) => {
    const message =
      action === 'delete'
        ? 'Are you sure you want to delete this item?'
        : 'Are you sure you want to archive this item?';

    Alert.alert('Confirm Action', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'OK',
        onPress: async () => {

          if (action == 'submit') {
            console.log('do bulk submit');
          } else {
            try {
              await update(
                'form_data',
                { [action === 'delete' ? 'deleted' : 'archived']: 1 },
                'uuid = ?',
                [uuid]
              );
              await fetchData();
              clearSelections();
            } catch (error) {
              console.error(`Error performing ${action}:`, error);
              Alert.alert('Error', `Failed to ${action} item.`);
            }
          }
        },
      },
    ]);
  };

  const handleBulkAction = async (action) => {
    for (const id of selectedIds) {
      const item = data.find((d) => d.id === id);
      if (item) await confirmAndHandleAction(item.uuid, action);
    }
  };

  const handleSwipeChange = (id, isSwiped) => {
    setSwipedItemId(isSwiped ? id : null);
  };

  const resetSwipe = () => {
    if (resetSwipeRef.current && swipedItemId) {
      resetSwipeRef.current();
    }
  };

  const submitForms = async (data = []) => {

    const success_forms = [];
    const failed_forms = [];

    Alert.alert(
      'Confirm Submission',
      'Are you sure you want to submit this form(s)?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('Submission cancelled')
        },
        {
          text: 'Submit',
          onPress: async () => {
            for (const item of data) {
              try {

                const formData = new FormData();
                const directoryPath = `${FileSystem.documentDirectory}${item.original_uuid}`;

                const dirInfo = await FileSystem.getInfoAsync(directoryPath);
                if (dirInfo.exists) {
                  const files = await FileSystem.readDirectoryAsync(directoryPath);
                  // Process each file in the directory
                  for (const file of files) {
                    // Check if file matches the expected pattern (fieldName_imageName)
                    const match = file.match(/^(.+?)__(.+)$/);
                    if (match) {
                      const [, fieldName, imageName] = match;
                      // Full path to image
                      const imagePath = `${directoryPath}/${file}`;
                      try {
                        // Compress image
                        const manipulatedImage = await ImageManipulator.manipulateAsync(
                          imagePath,
                          [{ resize: { width: 800, height: 800 } }],
                          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                        );

                        // Add compressed image to FormData
                        //console.log('adding compressed image', fieldName, manipulatedImage.uri)
                        formData.append(fieldName, {
                          uri: manipulatedImage.uri,
                          type: 'image/jpeg',
                          name: `${fieldName}_${Date.now()}.jpg`
                        });
                      } catch (resizeError) {
                        console.error(`Error compressing image ${file}:`, resizeError);
                      }
                    }

                  }
                }

                for (const field in item) {
                  formData.append(field, item[field]);
                }
                const result = await postData('form-data', formData, {
                  headers: {
                    'Content-Type': 'multipart/form-data'
                  }
                });
                //console.log('Submission result:', result);

                if (!result.error) {
                  await update(
                    'form_data',
                    { status: 'sent', status_date: new Date().toISOString() },
                    'id = ?',
                    [item.id]
                  );

                  success_forms.push(item.form);
                } else {
                  failed_forms.push(item.form);
                }
              } catch (error) {
                console.error('Submission error:', error);
                failed_forms.push(item.form);
              }
            }

            Alert.alert(
              'Submission Results',
              `Successfully submitted ${success_forms.length} out of ${data.length} form(s)`,
              [
                {
                  text: 'OK',
                  onPress: async () => {
                    //console.log('Submission completed');

                    await fetchData();
                    clearSelections();
                  }
                }
              ]
            );
          }
        }
      ],
      { cancelable: false }
    );

  }
  const actOnData = (item) => {

    if (item.status.toLowerCase() === 'finalized') {
      submitForms([item]);

      // For cross-platform support, use Alert.alert with buttons


    } else if (item.status.toLowerCase() === 'sent') {
      router.push(`/Data/?id=${item.id}`);
    } else {
      // draft thus edit the form
      router.push('/Form/New?id=' + item.id);

    }

  };

  const renderItem = ({ item }) => (
    <FormDataItem
      item={item}
      isSelected={selectedIds.includes(item.id)}
      toggleSelection={toggleSelection}
      onPress={() => actOnData(item)}
      onLongPress={() => toggleSelection(item.id)}
      onAction={confirmAndHandleAction}
      onSwipeChange={(isSwiped) => handleSwipeChange(item.id, isSwiped)}
      setResetSwipe={(resetFn) => (resetSwipeRef.current = resetFn)}
    />
  );

  const goToStack = (path) => {
    setMenuVisible(false);
    router.push(path);
  };

  const toggleMenu = () => {
    setMenuVisible(prev => !prev);
  };

  const handleOutsidePress = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
  };

  const syncSurveys = async () => {
    setShowFormStatus(true);
    setMenuVisible(false);
    await getForms(currentProject?.project, setGetFormStatus);
  };

  useEffect(() => {
    async function initialize() {
      try {

        await fetchData();
      } catch (error) {
        console.error('Error during initialization:', error);
        Alert.alert('Error', 'Failed to initialize data: ' + error.message);
      }
    }
    initialize();
  }, [currentProject]);


  useEffect(() => {
    let tempData = [...data]; // Start with a fresh copy of the original data

    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      tempData = tempData.filter((item) =>
        item.title && item.title.toLowerCase().includes(sq)
      );
    }

    //console.log('Applying tag filter. selectedTag:', selectedTag, typeof selectedTag);
    if (selectedTag && selectedTag === 'Archived') {
      tempData = tempData.filter((item) =>
        item.archived
      );
    }
    if (selectedTag && selectedTag !== 'Archived' && selectedTag !== 'All') {
      const tq = selectedTag.toLowerCase();
      tempData = tempData.filter((item) =>
        item.status && item.status.toLowerCase() === tq
      );
    }


    if (selectedTag && selectedTag === 'All') {
      tempData = tempData.filter((item) => !item.archived);
    }

    setFilteredData(tempData);

  }, [data, searchQuery, selectedTag]); // Dependencies are the sources of truth



  return (
    <View style={[styles.pageContainer, { paddingBottom: insets.bottom, paddingTop: insets.top }]}>
      {selectedIds.length > 0 && (
        <View style={[lstyles.actionBar, styles.pageContainer]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>

            <TouchableOpacity onPress={clearSelections}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>{selectedIds.length}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>

            <TouchableOpacity onPress={toggleSelectAll} style={styles.checkboxRow}>
              <MaterialIcons
                name={selectAll ? 'check-box' : 'check-box-outline-blank'}
                size={26}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleBulkAction('archive')}>
              <MaterialIcons name="archive" size={26} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleBulkAction('delete')}>
              <MaterialIcons name="delete" size={26} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => submitForms(data.filter(item => selectedIds.includes(item.id)))}>
              <MaterialCommunityIcons name="upload-multiple" size={26} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        // <View style={[lstyles.actionBar]}>
        //   <View style={lstyles.actionRow}>
        //     <TouchableOpacity onPress={clearSelections}>
        //       <Ionicons name="arrow-back" size={24} color="black" />
        //     </TouchableOpacity>
        //     <View style={lstyles.actionIcons}>
        //       <TouchableOpacity onPress={() => handleBulkAction('archive')}>
        //         <MaterialIcons name="archive" size={24} color="#FFC107" />
        //       </TouchableOpacity>
        //       <TouchableOpacity onPress={() => handleBulkAction('delete')}>
        //         <MaterialIcons name="delete" size={24} color="#FF3B30" />
        //       </TouchableOpacity>
        //       <TouchableOpacity onPress={() => alert('Send not implemented')}>
        //         <MaterialIcons name="send" size={24} color="#4CAF50" />
        //       </TouchableOpacity>
        //     </View>
        //   </View>
        //   <View style={styles.selectRow}>
        //     <TouchableOpacity onPress={toggleSelectAll} style={styles.checkboxRow}>
        //       <MaterialIcons
        //         name={selectAll ? 'check-box' : 'check-box-outline-blank'}
        //         size={20}
        //         color="black"
        //       />
        //       <Text style={{ marginLeft: 8 }}>Select All</Text>
        //     </TouchableOpacity>
        //   </View>
        // </View>
      )}

      {showSearchBar && (
        <View style={[lstyles.actionBar, styles.pageContainer]}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search..."
            style={styles.textInput}
          />
          <Ionicons name="close-circle-outline" size={30} color={theme.colors.text} onPress={() => { setSearchQuery(''); setShowSearchBar(false) }} />
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 5 }}>
        <Text
          style={[styles.pageTitle, { flexShrink: 1 }]}
          numberOfLines={1}
        >{currentProject?.title || 'Project Title'}</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setShowSearchBar(!showSearchBar)}>
            <MaterialIcons name='search' size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleMenu}>
            <MaterialCommunityIcons name="dots-vertical" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>


      {menuVisible && (
        <TouchableWithoutFeedback onPress={handleOutsidePress}>
          <View style={lstyles.overlay}>
            <View style={[lstyles.menu, { backgroundColor: theme.colors.background },]}>
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  borderRadius: 6,
                }}
              />
              {currentProject && <TouchableOpacity onPress={syncSurveys}><Text style={[styles.label, { paddingVertical: 8, fontSize: 14 }]}>Sync Surveys</Text></TouchableOpacity>}
              <TouchableOpacity onPress={() => goToStack('/Project/List')}><Text style={[styles.label, { paddingVertical: 8, fontSize: 14 }]}>My Projects</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => goToStack('/Project/Join')}><Text style={[styles.label, { paddingVertical: 8, fontSize: 14 }]}>Join a Project</Text></TouchableOpacity>
              <TouchableOpacity><Text style={[styles.label, { paddingVertical: 8, fontSize: 14 }]}>Help and Feedback</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => goToStack('/Project/Settings')}><Text style={[styles.label, { paddingVertical: 8, fontSize: 14 }]}>Settings</Text></TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      )}


      <View style={{ flex: 1 }}>
        {showFormStatus ? (
          <ScrollView style={{ padding: 15 }}>
            <Text style={[{ paddingVertical: 10, color: theme.colors.secText }]}>{getFormStatus}</Text>
            <TouchableOpacity
              style={{
                borderRadius: 8,
                paddingHorizontal: 15,
                paddingVertical: 8,
                marginTop: 15,
                backgroundColor: theme.colors.inputBackground,
                borderWidth: 1,
                borderColor: theme.colors.inputBorder,
                alignSelf: 'flex-start',
              }}
              onPress={() => {
                setGetFormStatus('');
                setShowFormStatus(false);
              }}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <FlatList
            data={filteredData}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEventThrottle={16}
            contentContainerStyle={lstyles.flatListContent}
            style={lstyles.flatList}
            ListHeaderComponent={<FormDataHeader data={data} />}
            ListEmptyComponent={<Text style={{ padding: 20, color: theme.colors.text }}>No data available</Text>}
          />
        )}
      </View>

      <TouchableOpacity
        style={[lstyles.fab, lstyles.fabContent, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push(`/Form/List?id=${1}`)}
      >
        <MaterialIcons name="add-box" size={24} color="lightgray" />
      </TouchableOpacity>


    </View >
  );
}

const lstyles = StyleSheet.create({
  flatList: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1f1f1',
  },
  flatListContent: {
    paddingBottom: 80, // Space for FAB
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingBottom: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },

  actionText: {
    fontWeight: '600',
    fontSize: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  selectRow: {
    marginTop: 8,
    flexDirection: 'row',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 8,
    backgroundColor: '#414141',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 80,
  },
  searchInput: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
  },

  fabLabel: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
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

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 100,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },

  menu: {
    marginTop: 80, // slightly more than header height
    marginRight: 15,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: 190,
    elevation: 5,
    zIndex: 101,
  },


});
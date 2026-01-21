import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { getFormData, select, update } from '../../../utils/database';


import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';


import { useFocusEffect } from '@react-navigation/native';
import { submitForms } from '../../../lib/form/submitForms';
import { useFilterStore } from '../../../store/filterStore';
import useProjectStore from '../../../store/projectStore';
import { getForms } from '../../../utils/services';


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
  const { currentProject, setCurrentProject, setCurrentData, currentData } = useProjectStore();
  const insets = useSafeAreaInsets();

  const theme = useTheme();
  const styles = getStyles(theme);


  const fetchData = async () => {
    try {

      let childCodes = []
      if (currentData) {
        const currentDataForm = await select('form_defn', 'form_id = ?', [currentData.form]);
        //console.log('current data form children', currentData.form, currentDataForm[0].children,);

        // Get the children string or default to '201'
        const childrenString = currentDataForm[0]?.children || '201';

        // Split the comma-separated string into an array of codes
        childCodes = childrenString.split(',').map(code => code.trim());
      }

      // Call getFormData with the array of codes
      const results = await getFormData(currentProject?.project, childCodes);


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

          if (action === 'submit') {
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

  const doSubmit = async (data = []) => {


    await submitForms(data);

    await fetchData();
    clearSelections();

  }






















  const actOnData = (item) => {

    if (item.status.toLowerCase() === 'finalized') {
      doSubmit([item]);
    } else if (item.status.toLowerCase() === 'sent') {

      console.log('sending to Main', item.id, item.form)
      setCurrentData(item)
      router.push(`/Main/`);
    } else {
      // draft thus edit the form
      router.push('/Form/New?fdata_id=' + item.id);

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

  async function initialize() {
    try {

      await fetchData();
    } catch (error) {
      console.error('Error during initialization:', error);
      Alert.alert('Error', 'Failed to initialize data: ' + error.message);
    }
  }

  useFocusEffect(
    useCallback(() => {
      // Code to run every time the screen is focused
      //console.log('FormDataList screen is focused');

      initialize();

      return () => {
        // Optional cleanup when the screen loses focus
        //console.log('FormDataList screen is unfocused');
      };
    }, [currentProject?.project])
  );

  useEffect(() => {


    initialize();
  }, []);


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
            <TouchableOpacity onPress={() => doSubmit(data.filter(item => selectedIds.includes(item.id)))}>
              <MaterialCommunityIcons name="upload-multiple" size={26} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

      )}

      {showSearchBar && (
        <View style={[lstyles.actionBar, styles.pageContainer]}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search..."
            placeholderTextColor={theme.colors.secText}
            style={styles.textInput}
          />
          <Ionicons name="close-circle-outline" size={30} color={theme.colors.text} onPress={() => { setSearchQuery(''); setShowSearchBar(false) }} />
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10 }}>
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
              {currentProject?.title && <TouchableOpacity onPress={syncSurveys}><Text style={[styles.label, { paddingVertical: 8, fontSize: 14 }]}>Sync Surveys</Text></TouchableOpacity>}
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
        style={[styles.fab, styles.fabContent, { backgroundColor: theme.colors.primary }]}
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
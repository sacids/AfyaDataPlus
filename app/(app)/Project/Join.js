import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../../api/axiosInstance';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import useProjectStore from '../../../store/projectStore';
import { insert } from '../../../utils/database';

const listProjects = async () => {

  const response = await api.get('/api/v1/projects');
  return response.data;

};

const joinProject = async (code) => {

  const response = await api.post('/api/v1/project/request-access', {
    code
  });
  console.log(JSON.stringify(response.data, null, 2))
  return response.data;
};

const JoinProjectScreen = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const { setCurrentProject } = useProjectStore();

  const router = useRouter();

  const fetchProjects = async () => {
    try {
      const data = await listProjects();
      //console.log('data', JSON.stringify(data, null, 2));
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      //console.log('Error fetching projects:', error);

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProjects();
  }, []);

  const handleJoin = async (project) => {
    try {
      const result = await joinProject(project.code);
      if (!result.error) {
        await insert('projects', project);
        Alert.alert('Joined Successfully', `You have joined ${project.title}`);
        setCurrentProject(project.id);
        router.replace('/Tabs');
      } else {
        Alert.alert('Join Failed', result.message || 'Unable to join project');
      }
    } catch (err) {
      console.error('Join error:', err);
      Alert.alert('Error', 'Something went wrong.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <View
      style={{
        backgroundColor: theme.colors.inputBackground,
        padding: 8,
        borderRadius: 8,
        marginBottom: 12,
        borderColor: theme.colors.inputBorder,
        borderWidth: 1,
      }}>
      <View style={{ flex: 1, }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={{ color: theme.colors.secText, marginVertical: 6, fontSize: 10 }}>
          {item.description}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 6 }}>
          {item.tags?.map((tag, idx) => (
            <View
              key={idx}
              style={{
                backgroundColor: theme.colors.inputBorder,
                borderRadius: 6,
                paddingVertical: 4,
                paddingHorizontal: 6,
                marginRight: 6,
                marginBottom: 6,
              }}>
              <Text style={{ fontSize: 8, color: theme.colors.text }}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => handleJoin(item)}>
        <Text style={styles.buttonText}>Request to Join</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.pageContainer}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: insets.top + 10, paddingBottom: 10 }}>

        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name={'arrow-left'} size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Available Projects</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => alert('Filter not implemented')}>
            <MaterialIcons name={'search'} size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        contentContainerStyle={styles.scrollContent}
        data={projects}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderItem}
      />
    </View>
  );
};

export default JoinProjectScreen;

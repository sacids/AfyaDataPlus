import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { insert, select } from '../../../utils/database';

const listProjects = async () => {
  const response = await api.get('/api/v1/projects');
  return response.data;
};

const joinProject = async (code) => {
  const response = await api.post('/api/v1/project/request-access', {
    code
  });
  return response.data;
};

const JoinProjectScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = getStyles(theme);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const insets = useSafeAreaInsets();

  const { setCurrentProject, setCurrentData } = useProjectStore();
  const router = useRouter();

  const fetchProjects = async () => {
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();

    return () => {
      // Optional cleanup when the screen loses focus
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProjects();
  }, []);

  const handleJoin = async (project) => {


    if (isJoining) return;
    setIsJoining(true);

    try {
      const result = await joinProject(project.code);
      if (!result.error) {
        await insert('projects', { ...project, ['tags']: JSON.stringify(project.tags) });
        const joinedProject = await select('projects', 'project = ?', [project.id])[0];
        setCurrentData(null)
        //console.log('joined project', joinedProject)
        setCurrentProject(joinedProject);
        Alert.alert(
          t('projects:joinedSuccessfully'),
          `${t('projects:joinedSuccessfully')}: ${project.title}`
        );
        router.replace('/(app)/Main/');
      } else {
        Alert.alert(
          t('projects:joinFailed'),
          result.message || t('errors:unknown')
        );
      }
    } catch (err) {
      console.error('Join error:', err);
      Alert.alert(
        t('errors:errorTitle'),
        t('errors:unknown')
      );
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.pageContainer, { justifyContent: 'center', alignItems: 'center' }]}>
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
      <View style={{ flex: 1 }}>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <MaterialIcons name="code" size={12} color={theme.colors.secText} />
          <Text style={{ fontSize: 10, color: theme.colors.secText, marginLeft: 4 }}>
            {t('projects:code')}: {item.code}
          </Text>
        </View>
        {item.category && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <MaterialIcons name="category" size={12} color={theme.colors.secText} />
            <Text style={{ fontSize: 10, color: theme.colors.secText, marginLeft: 4 }}>
              {t('projects:category')}: {item.category}
            </Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={[styles.button, isJoining && styles.buttonDisabled]}
        onPress={() => handleJoin(item)}
        disabled={isJoining}
      >
        <Text style={styles.buttonText}>
          {isJoining ? t('common:joining', 'Joining...') : t('projects:requestJoin')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.pageContainer, { paddingBottom: insets.bottom }]}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: insets.top + 10,
        paddingBottom: 10
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}
        >
          <MaterialCommunityIcons name={'arrow-left'} size={24} color={theme.colors.text} />
          <Text style={styles.pageTitle}>{t('projects:availableProjects')}</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => alert(t('alerts:information'))}>
            <MaterialIcons name={'search'} size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        contentContainerStyle={styles.scrollContent}
        data={projects}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 20 }}>
            <Text style={{ color: theme.colors.secText, textAlign: 'center' }}>
              {t('projects:noActiveProjects')}
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default JoinProjectScreen;
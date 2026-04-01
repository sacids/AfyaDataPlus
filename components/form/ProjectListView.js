import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Text, TouchableOpacity, View } from 'react-native'
import { getStyles } from '../../constants/styles'
import { useTheme } from '../../context/ThemeContext'
import useProjectStore from '../../store/projectStore'
import { AppHeader } from '../layout/AppHeader'

const ProjectListView = ({ projects }) => {



  const { currentProject, setCurrentProject, currentData, setCurrentData } = useProjectStore();


  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const styles = getStyles(theme);
  const isNavigating = useRef(false);



  const handleProjectPress = (project) => {
    if (isNavigating.current) return;
    isNavigating.current = true;

    try {
      setCurrentData(null);
      setCurrentProject(project);

      // Use replace instead of dismissTo to avoid stacking
      router.replace('/Main/');
    } finally {
      setTimeout(() => {
        isNavigating.current = false;
      }, 500);
    }
  };


  const goToSettings = useMemo(() => [
    {
      icon: 'settings',
      onPress: () => router.push('Project/Settings'),
    }
  ], []);


  return (

    <>
      <AppHeader
        title={t('projects:myProjects')}
        searchEnabled={false}
        rightActions={goToSettings}
      />

      <TouchableOpacity
        onPress={() => router.push('/Project/Join')}
        style={[styles.button, { justifyContent: 'space-between', margin: 16, paddingHorizontal: 16 }]}>
        <Text style={[styles.buttonText, { fontWeight: 'bold' }]}>
          {t('projects:joinProject')}
        </Text>
        <MaterialCommunityIcons name="shape-square-rounded-plus" size={26} color='white' />
      </TouchableOpacity>

      <FlatList
        data={projects}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleProjectPress(item)}
            style={styles.card}
          >
            {/* Header Section */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.pageTitle}>{item.title}</Text>
              <MaterialIcons name="keyboard-arrow-right" size={24} color={theme.colors.text} />
            </View>

            {/* Meta Info Section */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.hint}>
                {t('projects:code')}: {item.code}
              </Text>
              <Text style={styles.hint}>
                {t('projects:category')}: {item.category}
              </Text>
            </View>

            {/* Stats Section */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 10,
              borderTopWidth: 0.5,
              borderTopColor: theme.colors.inputBorder
            }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.bodyText, { fontWeight: 'bold' }]}>{item.formDefnCount}</Text>
                <Text style={styles.tiny}>{t('common:forms')}</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.tiny}>
                    {t('common:total')}: {item.formDataTotal}
                  </Text>
                </View>
                <Text style={styles.tiny}>|</Text>
                <Text style={[styles.tiny, { color: '#f1c40f' }]}>
                  {t('common:draft')}: {item.formDataDrafts}
                </Text>
                <Text style={[styles.tiny, { color: '#2ecc71' }]}>
                  {t('common:final')}: {item.formDataFinalized}
                </Text>
                <Text style={[styles.tiny, { color: theme.colors.primary }]}>
                  {t('common:sent')}: {item.formDataSent}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.scrollContent}
        ListEmptyComponent={
          <Text style={[styles.hint, { textAlign: 'center', marginTop: 20 }]}>
            {t('projects:noActiveProjects')}
          </Text>
        }
      />

      {/* Standardized FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {
          setCurrentData(null)
          router.push(`/Main/`)
        }}
      >
        <MaterialIcons name="home-filled" size={24} color="white" />
      </TouchableOpacity>

    </>
  )
}

export default ProjectListView
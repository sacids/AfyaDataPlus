import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import api from '../../../api/axiosInstance';
import { AppHeader } from '../../../components/layout/AppHeader';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { useAuthStore } from '../../../store/authStore';
import useProjectStore from '../../../store/projectStore';
import { insert, select } from '../../../utils/database';
import { handleFormSubmission, syncMessages } from '../../../utils/services';
import { generateUUID } from '../../../lib/form.bak/validation';

export default function MessagesScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { currentData } = useProjectStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const flatListRef = useRef(null);
  const { user } = useAuthStore()
  const { t } = useTranslation();

  const isDataSent = currentData?.status === 'sent';


  useEffect(() => {

    if (!isDataSent) return;
    let mounted = true;

    (async () => {
      try {
        setIsSyncing(true);

        const convId = await syncMessages(currentData);
        if (!mounted) return;

        setConversationId(convId);
        await loadLocalMessages();
      } catch (e) {
        console.error('Failed to sync messages', e);
      } finally {
        if (mounted) setIsSyncing(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [currentData, isDataSent]);


  const loadLocalMessages = async () => {
    console.log('loading local messages')
    const data = await select('messages', 'formDataUUID = ?', [currentData.original_uuid]);
    setMessages(data);
  };

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const text = input.trim();
    setInput('');

    const localID = generateUUID()
    const newMessage = {
      formDataUUID: currentData.original_uuid,
      text,
      local_id: localID,
      sender_name: user.first_name,
      sender_id: user.id,
      sync_status: 'pending'
    };

    // 1. Optimistic Update (Local DB)
    await insert('messages', newMessage);
    setInput('');
    await loadLocalMessages();

    // 2. Sync to Backend
    if (conversationId) {

      try {
        await api.post(`api/v1/chat/conversations/${conversationId}/messages`, {
          text: newMessage.text,
          external_id: localID // Matches your DRF update_or_create logic
        });
        // Update local status to 'synced' if desired
      } catch (e) {
        console.error("Message will sync later", e);
      }
    }
  };

  const handleDirectSubmit = async () => {
    try {
      setIsSubmitting(true);
      // The library expects an array of forms
      await handleFormSubmission([currentData]);

      const updatedData = {
        ...currentData,
        status: 'sent',
        status_date: new Date().toISOString()
      };

      useProjectStore.getState().setCurrentData(updatedData);

    } catch (error) {
      console.error("Submission from messages failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };



  const renderItem = ({ item }) => {
    const isMe = parseInt(item.sender_id) === parseInt(user.id)
    //console.log('items', item.sender_id, user.id, isMe)

    return (
      <View
        style={[
          isMe ? styles.messageBubbleMe : styles.messageBubbleThem,
          { marginHorizontal: 16 }
        ]}
      >
        <Text style={isMe ? styles.messageTextMe : styles.messageTextThem}>
          {item.text}
        </Text>
        <Text style={[styles.messageTime, {
          color: isMe ? 'rgba(255,255,255,0.7)' : theme.colors.hint
        }]}>
          {new Date(item.created_at || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
    );
  };

  if (!isDataSent) {
    return (
      <ScreenWrapper>
        <AppHeader title={currentData?.title || t('messages:title')} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
          <MaterialCommunityIcons
            name={isSubmitting ? "cloud-upload" : "lock-outline"}
            size={80}
            color={theme.colors.primary}
          />
          <Text style={[styles.title, { textAlign: 'center', marginTop: 20 }]}>
            {isSubmitting ? t('messages:submittingTitle') : t('messages:lockedTitle')}
          </Text>
          <Text style={[styles.bodyText, { textAlign: 'center', color: theme.colors.hint, marginTop: 10 }]}>
            {isSubmitting ? t('messages:submittingSubtitle') : t('messages:lockedSubtitle')}
          </Text>

          {!isSubmitting && (
            <>
              <TouchableOpacity
                style={[styles.button, { marginTop: 30, width: '100%' }]}
                onPress={handleDirectSubmit}
              >
                <Text style={styles.buttonText}>{t('messages:submitNow')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { marginTop: 20, width: '100%', backgroundColor: theme.colors.backgroundColor, borderColor: theme.colors.primary, borderWidth: 1 }]}
                onPress={() => router.back()}
              >
                <Text style={{ color: theme.colors.hint }}>{t('messages:goBack')}</Text>
              </TouchableOpacity>
            </>
          )}

          {isSubmitting && (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
          )}
        </View>
      </ScreenWrapper>
    );
  }

  return (

    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.pageContainer]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >

        <AppHeader
          title={currentData?.title || t('messages:title')}
          searchEnabled={false}
        />



        {/* Messages List */}
        {isSyncing ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 12, color: theme.colors.hint }}>
              {t('messages:syncing')}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id?.toString()}
            contentContainerStyle={{ paddingVertical: 16 }}
            style={{ flex: 1 }}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100, paddingHorizontal: 30 }}>
                <Text style={[styles.bodyText, { color: theme.colors.hint, textAlign: 'center' }]}>
                  {t('messages:noMessages')}
                </Text>
              </View>
            }
          />
        )}


        {/* Input Area */}
        <View style={styles.chatInputContainer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            style={styles.chatInput}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.hint}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.chatSendButton,
              !input.trim() && styles.chatSendButtonDisabled
            ]}
            disabled={!input.trim()}
          >
            <Text style={styles.buttonText}>{t('messages:send')}</Text>
          </TouchableOpacity>
        </View>


      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
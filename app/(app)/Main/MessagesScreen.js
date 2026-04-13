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
import { AppHeader } from '../../../components/layout/AppHeader';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { useAuthStore } from '../../../store/authStore';
import useProjectStore from '../../../store/projectStore';
import { insert, select } from '../../../utils/database';
import { handleFormSubmission, submitSingleForm, syncMessages } from '../../../utils/services';

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

  //console.log('current data', currentData)
  const isDataSent = currentData?.status === 'sent';


  useEffect(() => {


    let mounted = true;

    (async () => {
      try {
        setIsSyncing(true);
        await loadLocalMessages();

        if (isDataSent) {
          const convId = await syncMessages(currentData);
          setConversationId(convId);
        }
        if (!mounted) return;

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
    //console.log('loading local messages')
    const data = await select('messages', 'formDataUUID = ?', [currentData?.original_uuid]);
    //console.log('message data', currentData.original_uuid, data)
    setMessages(data);
  };


  const handleSend1 = async () => {
    //console.log('current data', JSON.stringify(currentData, null, 5))
    if (!input.trim() || !currentData) return;

    const messageText = input.trim();
    setInput(''); // Clear immediately for UX

    const localId = `local_${Date.now()}`;
    const newMessage = {
      local_id: localId,
      formDataUUID: currentData.uuid,
      text: messageText,
      sender_id: user.id, // Or 'user'
      sender_name: user.name || 'Me',
      sync_status: 'pending',
      created_at: new Date().toISOString()
    };

    // 1. Always save to local DB first
    await insert('messages', newMessage);

    // Update local UI state immediately
    setMessages(prev => [...prev, { ...newMessage, id: localId }]);
    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

    // 2. Check if Data needs to be submitted
    if (currentData.status === 'finalized') {

      try {
        setIsSubmitting(true);
        // Attempt to submit the form data first
        //console.log('attempting to submit currentData', currentData)
        //await handleFormSubmission([currentData]);
        await submitSingleForm(currentData)
        const updatedData = {
          ...currentData,
          status: 'sent',
          status_date: new Date().toISOString()
        };

        useProjectStore.getState().setCurrentData(updatedData);


        await syncMessages(currentData);
        loadLocalMessages(); // Refresh to get server IDs/status

      } catch (error) {
        console.error("Submission from messages failed:", error);
      } finally {
        setIsSubmitting(false);
      }


    }


  };

  const handleSend = async () => {
    if (!input.trim() || !currentData) return;

    const messageText = input.trim();
    setInput('');

    const localId = `local_${Date.now()}`;
    const fUUID = currentData.original_uuid || currentData.uuid;

    const newMessage = {
      local_id: localId,
      formDataUUID: fUUID,
      conversation_id: conversationId, // May be null if offline/first message
      text: messageText,
      sender_id: user.id,
      sender_name: user.name || 'Me',
      sync_status: 'pending',
      created_at: new Date().toISOString()
    };

    // 1. Save to local SQLite immediately
    try {
      await insert('messages', newMessage);
      setMessages(prev => [...prev, { ...newMessage, id: localId }]);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch (e) {
      console.error("Local database save failed", e);
    }

    // 2. Process Syncing
    try {
      // If form isn't sent yet, submit it
      if (currentData.status === 'finalized') {
        setIsSubmitting(true);
        const submission = await submitSingleForm(currentData);
        if (submission.success) {
          const updatedData = { ...currentData, status: 'sent', status_date: new Date().toISOString() };
          useProjectStore.getState().setCurrentData(updatedData);
        }
      }

      // 3. Ensure Conversation exists and sync pending messages
      // syncMessages now handles updating conversation_id for all matched formDataUUIDs
      const activeConvId = await syncMessages(currentData);

      if (activeConvId) {
        setConversationId(activeConvId);

        // Load messages again to refresh the UI with correct sync_status and IDs
        await loadLocalMessages();
      }

    } catch (error) {
      console.error("Workflow failed, message remains pending locally:", error);
    } finally {
      setIsSubmitting(false);
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
    const isMe = parseInt(item.sender_id) === parseInt(user.id);
    const isSystem = item.sender_id === '0' || item.sender_id === 'system';

    //console.log('items', item.sender_id, user.id, isMe)
    if (isSystem) {
      return (
        <View style={[styles.messageBubbleThem, {
          backgroundColor: theme.colors.primary + '15',
          borderColor: theme.colors.primary + '30',
          marginHorizontal: 16,
        }]}>
          <Text style={[styles.messageTextThem, {
            color: theme.colors.primary,
            fontStyle: 'italic',
          }]}>
            {item.text}
          </Text>
        </View>
      );
    }
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
              (!input.trim() && !isSyncing) && styles.chatSendButtonDisabled
            ]}
            disabled={!input.trim() || isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator
                key="loading-indicator" // Add a unique key
                size="small"
                color="white"
              />
            ) : (
              <Text key="send-text" style={styles.buttonText}>
                {t('messages:send')}
              </Text>
            )}
          </TouchableOpacity>
        </View>


      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
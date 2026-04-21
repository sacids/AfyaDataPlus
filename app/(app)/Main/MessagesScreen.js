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
import { initChat, submitSingleForm, syncMessages } from '../../../utils/services';

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


  // useEffect(() => {


  //   let mounted = true;

  //   (async () => {
  //     try {
  //       setIsSyncing(true);
  //       await loadLocalMessages();

  //       if (isDataSent) {
  //         const convId = await syncMessages(currentData);
  //         setConversationId(convId);
  //       }
  //       if (!mounted) return;

  //     } catch (e) {
  //       console.error('Failed to sync messages', e);
  //     } finally {
  //       if (mounted) setIsSyncing(false);
  //     }
  //   })();

  //   return () => {
  //     mounted = false;
  //   };

  // }, [currentData, isDataSent]);


  const loadLocalMessages = async () => {
    //console.log('loading local messages')
    const data = await select('messages', 'formDataUUID = ?', [currentData?.original_uuid]);
    //console.log('message data', currentData.original_uuid, data)
    setMessages(data);
  };


  const handleSend1 = async () => {
    if (!input.trim() || !currentData) return;

    const messageText = input.trim();
    setInput('');

    const localId = `local_${Date.now()}`;
    const fUUID = currentData.original_uuid || currentData.uuid;

    const newMessage = {
      local_id: localId,
      formDataUUID: fUUID,
      conversation_id: conversationId,
      text: messageText,
      sender_id: user.globalUsername,
      sender_name: user.globalUsername || 'Me',
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

      if (!conversationId) {
        console.log('No conversation ID, initializing chat for form data:', currentData.original_uuid);
        let convId = await initChat(currentData);
        setConversationId(convId);
      }

      syncMessages(conversationId, currentData.original_uuid).then(() => {
        loadLocalMessages();
      });


    } catch (error) {
      console.error("Workflow failed, message remains pending locally:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // In MessagesScreen.js, update the handleSend function around line 90:

  const handleSend = async () => {
    if (!input.trim() || !currentData) return;

    const messageText = input.trim();
    setInput('');

    const localId = `local_${Date.now()}`;
    const fUUID = currentData.original_uuid || currentData.uuid;

    const newMessage = {
      local_id: localId,
      formDataUUID: fUUID,
      conversation_id: conversationId,
      text: messageText,
      sender_id: user.globalUsername,
      sender_name: user.globalUsername || 'Me',
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
        //console.log('Form is finalized, submitting form data before syncing messages');
        //console.log('submitting form data', currentData.original_uuid, JSON.stringify(currentData));

        const finalizedData = await select('form_data', 'original_uuid = ?', [currentData.original_uuid]);
        const submission = await submitSingleForm(finalizedData?.[0]);
        if (submission.success) {
          const updatedData = { ...currentData, status: 'sent', status_date: new Date().toISOString() };
          useProjectStore.getState().setCurrentData(updatedData);
        }
      }

      // Get or create conversation ID
      let convId = conversationId;
      //console.log('Current conversation ID before init:', convId);
      if (!convId) {
        //console.log('No conversation ID, initializing chat for form data:', currentData.original_uuid);
        convId = await initChat(currentData);
        setConversationId(convId);
      }

      // Only sync if we have a valid conversation ID
      if (convId && typeof convId === 'string') {
        await syncMessages(convId, currentData.original_uuid);
        await loadLocalMessages();
      } else {
        console.error('Invalid conversation ID:', convId);
      }

    } catch (error) {
      console.error("Workflow failed, message remains pending locally:", error);
    } finally {
      setIsSubmitting(false);
    }
  };



  const renderItem = ({ item }) => {
    const isMe = item.sender_name === user.globalUsername;
    const isSystem = item.sender_id === 1000000000 || item.sender_name === 'afyadata_system';

    //console.log('items', item.text, item.sender_name, user.globalUsername, 'global', isMe)

    if (isSystem) {
      return (
        <View style={[styles.messageBubbleThem, {
          backgroundColor: theme.colors.primary + '15',
          borderColor: theme.colors.primary + '30',
          marginHorizontal: 16,
        }]}>

          <Text
            style={[styles.messageTextThem, {
              color: theme.colors.primary,
              fontWeight: 'bold',
              marginBottom: 5,
            }]}
          >AfyaData</Text>
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
        {
          !isMe &&
          (
            <Text
              style={[styles.messageTextThem, {
                fontWeight: 'bold',
                marginBottom: 5,
              }]}
            >{item.sender_name}
            </Text>
          )
        }
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


  // In MessagesScreen.js, update the useEffect:

  useEffect(() => {
    let mounted = true;
    let isSyncingRef = false;

    (async () => {
      try {
        if (isSyncingRef) return;
        isSyncingRef = true;
        setIsSyncing(true);

        await loadLocalMessages();

        if (isDataSent && currentData?.original_uuid) {
          // Only try to get conversation if we don't have one
          if (!conversationId) {
            const convId = await initChat(currentData);
            if (convId && mounted) {
              setConversationId(convId);
              // Sync messages with the new conversation ID
              await syncMessages(convId, currentData.original_uuid);
              await loadLocalMessages();
            }
          } else if (conversationId && typeof conversationId === 'string') {
            // Sync messages with existing conversation ID
            await syncMessages(conversationId, currentData.original_uuid);
            await loadLocalMessages();
          }
        }

        if (!mounted) return;

      } catch (e) {
        console.error('Failed to sync messages', e);
      } finally {
        if (mounted) {
          setIsSyncing(false);
          isSyncingRef = false;
        }
      }
    })();

    return () => {
      mounted = false;
      isSyncingRef = false;
    };
  }, [currentData, isDataSent, conversationId]); // Add conversationId to dependencies

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
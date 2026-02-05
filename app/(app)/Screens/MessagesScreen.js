import { randomUUID } from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
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
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import useProjectStore from '../../../store/projectStore';
import { insert, select } from '../../../utils/database';
import { syncMessages } from '../../../utils/services';


export default function MessagesScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { currentData, user } = useProjectStore(); // Assume user info is in store
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const flatListRef = useRef(null);
  const { authState } = useAuth();


  // useEffect(() => {
  //   (async () => {
  //     const convId = await syncMessages(currentData);
  //     setConversationId(convId);
  //     await loadLocalMessages();
  //   })();
  // }, [currentData]);

  useEffect(() => {
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
  }, [currentData]);


  const loadLocalMessages = async () => {
    console.log('loading local messages')
    const data = await select('messages', 'formDataUUID = ?', [currentData.original_uuid]);
    setMessages(data);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const localID = randomUUID()
    const newMessage = {
      formDataUUID: currentData.original_uuid,
      text: input.trim(),
      local_id: localID,
      sender_name: authState.user.fullName,
      sender_id: authState.user.id,
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





  const renderItem = ({ item }) => {
    const isMe = parseInt(item.sender_id) === parseInt(authState.user.id)
    //console.log('items', item.sender_id, authState.user.id, isMe)

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
          title={currentData?.title || 'Messages'}
          searchEnabled={false}
        />



        {/* Messages List */}
        {isSyncing ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 12, color: theme.colors.hint }}>
              Syncing messages…
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
                  No messages yet. Start a conversation!
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
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>
        </View>


      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
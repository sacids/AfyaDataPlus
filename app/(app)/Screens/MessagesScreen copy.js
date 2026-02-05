import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '../../../components/layout/AppHeader';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import useProjectStore from '../../../store/projectStore';
import { insert, select } from '../../../utils/database';

export default function MessagesScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef(null);
  const { currentData } = useProjectStore();
  const insets = useSafeAreaInsets();

  const formData_id = currentData?.id;

  useEffect(() => {
    if (formData_id) {
      loadMessages();
    }
  }, [formData_id]);

  const loadMessages = async () => {
    const data = await select('messages', 'formDataUUID = ?', [formData_id]);
    setMessages(data);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
  };

  const handleSend = async () => {
    if (!input.trim() || !formData_id) return;

    await insert('messages', {
      formDataUUID: formData_id,
      text: input.trim(),
      sender_name: 'me',
      sender_id: 1
    });
    setInput('');
    await loadMessages();
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender_name === 'me';

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
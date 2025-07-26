import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { insert, select } from '@/utils/database';
import { useTheme } from '../../context/ThemeContext';
import { useId } from './_layout';
import { getStyles } from '../../constants/styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const { colors, isDark } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef(null);
  const formData_id = useId();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = getStyles(theme);

  useEffect(() => {
    (async () => {
      await loadMessages();
    })();
  }, []);

  const loadMessages = async () => {
    const data = await select('messages', 'formDataUUID = ?', [formData_id]);
    console.log('data', data);
    setMessages(data);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    await insert('messages', { formDataUUID: formData_id, text: input.trim(), sender_name: 'me', sender_id: 1 });
    setInput('');
    await loadMessages();
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender_name === 'me';
    return (
      <View
        style={[
          lstyles.messageContainer,
          isMe ? {
            alignSelf: 'flex-end',
            backgroundColor: colors.primary,
            borderTopLeftRadius: 12,
          } : {
            alignSelf: 'flex-start',
            backgroundColor: isDark ? '#2a2a2a' : '#ffffff',
            borderTopRightRadius: 12,
          },
        ]}
      >
        <Text style={[lstyles.messageText, { color: colors.text }]}>{item.text}</Text>
        <Text style={[lstyles.timestamp, { color: colors.secText }]}>
          {new Date(item.created_at || Date.now()).toLocaleTimeString().slice(0, 5)}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[lstyles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={lstyles.chat}
      />
      <View style={[lstyles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          style={[lstyles.input, { color: colors.text }]}
          placeholder="Type a message"
          placeholderTextColor={colors.label}
        />
        <TouchableOpacity onPress={handleSend} style={[lstyles.sendButton, { backgroundColor: colors.buttonBackground }]}>
          <Text style={{ color: colors.buttonText, fontSize: 18 }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
const lstyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chat: {
    padding: 10,
    paddingBottom: 20,
  },
  messageContainer: {
    padding: 10,
    borderRadius: 16,
    marginVertical: 4,
    maxWidth: '75%',
  },
  messageText: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/theme/ThemeContext';

export default function ContactScreen() {
  const { colors } = useTheme();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const copyEmail = async () => {
    await Clipboard.setStringAsync('support@chipinpool.com');
    Alert.alert('Copied', 'Email address copied to clipboard.');
  };

  const handleSend = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing Fields', 'Please fill in both subject and message.');
      return;
    }
    Alert.alert('Message sent!', "We'll get back to you within 24 hours.");
    setSubject('');
    setMessage('');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.mint} />
          <Text style={[styles.title, { color: colors.text }]}>Contact Us</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We're here to help with any questions
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CONTACT INFORMATION</Text>

        <TouchableOpacity
          style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={copyEmail}
          activeOpacity={0.7}
          data-testid="button-copy-email"
        >
          <View style={[styles.infoIconCircle, { backgroundColor: `${colors.mint}1A` }]}>
            <Ionicons name="mail-outline" size={20} color={colors.mint} />
          </View>
          <View style={styles.infoTextWrap}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>support@chipinpool.com</Text>
          </View>
          <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.infoIconCircle, { backgroundColor: `${colors.blue}1A` }]}>
            <Ionicons name="time-outline" size={20} color={colors.blue} />
          </View>
          <View style={styles.infoTextWrap}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Support Hours</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>Mon-Fri, 9am-6pm EST</Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.infoIconCircle, { backgroundColor: `${colors.green}1A` }]}>
            <Ionicons name="flash-outline" size={20} color={colors.green} />
          </View>
          <View style={styles.infoTextWrap}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Response Time</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>Within 24 hours</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>SEND US A MESSAGE</Text>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Subject</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
            value={subject}
            onChangeText={setSubject}
            placeholder="What do you need help with?"
            placeholderTextColor={colors.textSecondary}
            data-testid="input-subject"
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 16 }]}>Message</Text>
          <TextInput
            style={[styles.input, styles.messageInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
            value={message}
            onChangeText={setMessage}
            placeholder="Describe your issue or question..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            data-testid="input-message"
          />

          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.mint }]}
            onPress={handleSend}
            activeOpacity={0.8}
            data-testid="button-send-message"
          >
            <Ionicons name="send-outline" size={18} color="#001F3F" />
            <Text style={styles.sendButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  infoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: {
    flex: 1,
    marginLeft: 14,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  formCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  messageInput: {
    minHeight: 120,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#001F3F',
  },
});

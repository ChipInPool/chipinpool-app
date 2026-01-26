import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

const EMOJIS = ['💰', '🎁', '✈️', '🎉', '🍕', '🏠', '🎓', '💍', '🚗', '🎮'];

export default function CreatePoolScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💰');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: api.pools.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pools'] });
      navigation.goBack();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create pool');
    },
  });

  const handleCreate = () => {
    if (!name || !targetAmount) {
      setError('Please fill in all required fields');
      return;
    }

    createMutation.mutate({
      name,
      description,
      targetAmount: parseFloat(targetAmount),
      emoji: selectedEmoji,
    });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.label}>Choose an Emoji</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
            {EMOJIS.map((emoji) => (
              <TouchableOpacity 
                key={emoji} 
                style={[styles.emojiButton, selectedEmoji === emoji && styles.emojiButtonSelected]}
                onPress={() => setSelectedEmoji(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Pool Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Birthday Gift for Sarah"
            placeholderTextColor="#708090"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What's this pool for?"
            placeholderTextColor="#708090"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Target Amount *</Text>
          <View style={styles.amountInput}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountField}
              placeholder="0.00"
              placeholderTextColor="#708090"
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.createButton} 
          onPress={handleCreate}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#001F3F" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#001F3F" />
              <Text style={styles.createButtonText}>Create Pool</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  content: { padding: 20 },
  errorContainer: { backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#f87171', fontSize: 14 },
  section: { marginBottom: 24 },
  label: { color: '#fff', fontSize: 14, fontWeight: '500', marginBottom: 8 },
  emojiScroll: { marginHorizontal: -4 },
  emojiButton: { width: 52, height: 52, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  emojiButtonSelected: { backgroundColor: 'rgba(127, 255, 212, 0.2)', borderWidth: 2, borderColor: '#7FFFD4' },
  emojiText: { fontSize: 24 },
  inputContainer: { marginBottom: 20 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  amountInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16 },
  currencySymbol: { color: '#7FFFD4', fontSize: 24, fontWeight: '600' },
  amountField: { flex: 1, padding: 16, color: '#fff', fontSize: 24, fontWeight: '600' },
  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7FFFD4', paddingVertical: 16, borderRadius: 12, marginTop: 12 },
  createButtonText: { color: '#001F3F', fontSize: 18, fontWeight: '600' },
});

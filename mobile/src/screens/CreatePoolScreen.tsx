import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Gift', value: 'Gift', icon: 'gift-outline' },
  { label: 'Trip', value: 'Trip', icon: 'airplane-outline' },
  { label: 'Purchase', value: 'Purchase', icon: 'cart-outline' },
  { label: 'Event', value: 'Event', icon: 'calendar-outline' },
  { label: 'Recurring', value: 'Recurring', icon: 'repeat-outline' },
  { label: 'Other', value: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const getDefaultDeadline = (daysFromNow: number = 30): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
};

const TEMPLATES = [
  { label: '🎂 Birthday Gift', title: 'Birthday Gift', category: 'Gift', amount: '100.00', description: 'Collecting for a birthday present', deadline: getDefaultDeadline(14) },
  { label: '✈️ Group Trip', title: 'Group Trip', category: 'Trip', amount: '500.00', description: 'Pooling funds for our group trip', deadline: getDefaultDeadline(60) },
  { label: '🏢 Office Fund', title: 'Office Fund', category: 'Other', amount: '50.00', description: 'Office snacks and supplies fund', deadline: getDefaultDeadline(30) },
  { label: '🎉 Party Fund', title: 'Party Fund', category: 'Event', amount: '200.00', description: 'Collecting for the party expenses', deadline: getDefaultDeadline(21) },
  { label: '🛒 Group Purchase', title: 'Group Purchase', category: 'Purchase', amount: '150.00', description: 'Splitting cost of a shared purchase', deadline: getDefaultDeadline(14) },
  { label: '🔁 Monthly Pool', title: 'Monthly Pool', category: 'Recurring', amount: '100.00', description: 'Recurring monthly contribution pool', deadline: getDefaultDeadline(30), isRecurring: true, frequency: 'monthly' as const },
];

export default function CreatePoolScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(getDefaultDeadline());
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: api.pools.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pools'] });
      navigation.goBack();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create pool';
      setError(msg);
    },
  });

  const applyTemplate = (template: typeof TEMPLATES[number]) => {
    setTitle(template.title);
    setCategory(template.category);
    setTargetAmount(template.amount);
    setDescription(template.description);
    setDeadline(template.deadline);
    setIsRecurring(!!(template as any).isRecurring);
    setFrequency((template as any).frequency || '');
    setError('');
  };

  const handleCreate = () => {
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!category) {
      setError('Please select a category');
      return;
    }
    if (!targetAmount.trim() || isNaN(parseFloat(targetAmount)) || parseFloat(targetAmount) <= 0) {
      setError('Please enter a valid target amount');
      return;
    }
    if (!deadline.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      setError('Please enter a valid deadline (YYYY-MM-DD)');
      return;
    }

    const formattedAmount = parseFloat(targetAmount).toFixed(2);

    const payload: any = {
      title: title.trim(),
      category,
      targetAmount: formattedAmount,
      description: description.trim() || undefined,
      deadline: new Date(deadline).toISOString(),
    };

    if (isRecurring) {
      payload.isRecurring = true;
      if (frequency) payload.frequency = frequency;
    }

    createMutation.mutate(payload);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Templates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatesRow}>
            {TEMPLATES.map((t) => (
              <TouchableOpacity key={t.label} style={styles.templateCard} onPress={() => applyTemplate(t)} activeOpacity={0.7}>
                <Text style={styles.templateEmoji}>{t.label.split(' ')[0]}</Text>
                <Text style={styles.templateLabel} numberOfLines={1}>{t.label.split(' ').slice(1).join(' ')}</Text>
                <Text style={styles.templateAmount}>${t.amount}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Birthday Gift for Sarah"
            placeholderTextColor="#708090"
            value={title}
            onChangeText={(t) => { setTitle(t); setError(''); }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.categoryButton, category === cat.value && styles.categoryButtonSelected]}
                onPress={() => { setCategory(cat.value); setError(''); }}
                activeOpacity={0.7}
              >
                <Ionicons name={cat.icon} size={20} color={category === cat.value ? '#001F3F' : '#7FFFD4'} />
                <Text style={[styles.categoryLabel, category === cat.value && styles.categoryLabelSelected]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
              onChangeText={(t) => { setTargetAmount(t); setError(''); }}
              keyboardType="decimal-pad"
            />
          </View>
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
          <Text style={styles.label}>Deadline *</Text>
          <View style={styles.deadlineRow}>
            <Ionicons name="calendar-outline" size={20} color="#7FFFD4" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.deadlineInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#708090"
              value={deadline}
              onChangeText={(t) => { setDeadline(t); setError(''); }}
              keyboardType="default"
              maxLength={10}
            />
          </View>
        </View>

        {category === 'Recurring' && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.frequencyRow}>
              {(['weekly', 'monthly', 'quarterly'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.frequencyButton, frequency === f && styles.frequencyButtonSelected]}
                  onPress={() => { setFrequency(f); setIsRecurring(true); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.frequencyLabel, frequency === f && styles.frequencyLabelSelected]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.createButton, createMutation.isPending && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={createMutation.isPending}
          activeOpacity={0.8}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#001F3F" />
          ) : (
            <>
              <Ionicons name="add-circle" size={22} color="#001F3F" />
              <Text style={styles.createButtonText}>Create Pool</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001F3F',
  },
  content: {
    padding: 20,
    paddingTop: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    gap: 8,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#7FFFD4',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  templatesRow: {
    gap: 10,
    paddingRight: 4,
  },
  templateCard: {
    backgroundColor: 'rgba(127, 255, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(127, 255, 212, 0.2)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 100,
  },
  templateEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  templateLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateAmount: {
    color: '#7FFFD4',
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryRow: {
    gap: 8,
    paddingRight: 4,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(127, 255, 212, 0.25)',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  categoryButtonSelected: {
    backgroundColor: '#7FFFD4',
    borderColor: '#7FFFD4',
  },
  categoryLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryLabelSelected: {
    color: '#001F3F',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    color: '#7FFFD4',
    fontSize: 24,
    fontWeight: '700',
  },
  amountField: {
    flex: 1,
    padding: 16,
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  deadlineInput: {
    flex: 1,
    paddingVertical: 16,
    color: '#fff',
    fontSize: 16,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  frequencyButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(127, 255, 212, 0.25)',
  },
  frequencyButtonSelected: {
    backgroundColor: '#7FFFD4',
    borderColor: '#7FFFD4',
  },
  frequencyLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  frequencyLabelSelected: {
    color: '#001F3F',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7FFFD4',
    paddingVertical: 18,
    borderRadius: 14,
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#001F3F',
    fontSize: 18,
    fontWeight: '700',
  },
});

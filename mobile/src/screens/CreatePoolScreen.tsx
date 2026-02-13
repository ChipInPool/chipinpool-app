import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

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
  const { colors, isDark } = useTheme();

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
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {error ? (
          <View style={[styles.errorContainer, { borderColor: `${colors.red}30` }]}>
            <Ionicons name="alert-circle" size={18} color={colors.red} />
            <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mint }]}>Quick Templates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatesRow}>
            {TEMPLATES.map((t) => (
              <TouchableOpacity key={t.label} style={[styles.templateCard, { backgroundColor: `${colors.mint}10`, borderColor: `${colors.mint}4D`, shadowColor: colors.mint }]} onPress={() => applyTemplate(t)} activeOpacity={0.7}>
                <View style={[styles.templateEmojiContainer, { backgroundColor: `${colors.mint}1A` }]}>
                  <Text style={styles.templateEmoji}>{t.label.split(' ')[0]}</Text>
                </View>
                <Text style={[styles.templateLabel, { color: colors.text }]} numberOfLines={1}>{t.label.split(' ').slice(1).join(' ')}</Text>
                <Text style={[styles.templateAmount, { color: colors.mint }]}>${t.amount}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.mint }]}>Title *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
            placeholder="e.g., Birthday Gift for Sarah"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={(t) => { setTitle(t); setError(''); }}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mint }]}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.categoryButton, { backgroundColor: colors.inputBg, borderColor: `${colors.mint}33` }, category === cat.value && { backgroundColor: colors.mint, borderColor: colors.mint, shadowColor: colors.mint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 }]}
                onPress={() => { setCategory(cat.value); setError(''); }}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIconWrap, { backgroundColor: `${colors.mint}1F` }, category === cat.value && { backgroundColor: `${colors.navy}26` }]}>
                  <Ionicons name={cat.icon} size={18} color={category === cat.value ? (isDark ? colors.navy : '#FFFFFF') : colors.mint} />
                </View>
                <Text style={[styles.categoryLabel, { color: colors.text }, category === cat.value && { color: isDark ? colors.navy : '#FFFFFF', fontWeight: '700' }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.mint }]}>Target Amount *</Text>
          <View style={[styles.amountInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Text style={[styles.currencySymbol, { color: colors.mint }]}>$</Text>
            <TextInput
              style={[styles.amountField, { color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={targetAmount}
              onChangeText={(t) => { setTargetAmount(t); setError(''); }}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.mint }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
            placeholder="What's this pool for?"
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.mint }]}>Deadline *</Text>
          <View style={[styles.deadlineRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <View style={[styles.calendarIconWrap, { backgroundColor: `${colors.mint}1F` }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.mint} />
            </View>
            <TextInput
              style={[styles.deadlineInput, { color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              value={deadline}
              onChangeText={(t) => { setDeadline(t); setError(''); }}
              keyboardType="default"
              maxLength={10}
            />
          </View>
        </View>

        {category === 'Recurring' && (
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.mint }]}>Frequency</Text>
            <View style={styles.frequencyRow}>
              {(['weekly', 'monthly', 'quarterly'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.frequencyButton, { backgroundColor: colors.inputBg, borderColor: `${colors.mint}33` }, frequency === f && { backgroundColor: colors.mint, borderColor: colors.mint, shadowColor: colors.mint, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }]}
                  onPress={() => { setFrequency(f); setIsRecurring(true); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.frequencyLabel, { color: colors.text }, frequency === f && { color: isDark ? colors.navy : '#FFFFFF', fontWeight: '700' }]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.mint, shadowColor: colors.mint }, createMutation.isPending && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={createMutation.isPending}
          activeOpacity={0.8}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color={isDark ? colors.navy : '#FFFFFF'} />
          ) : (
            <>
              <Ionicons name="add-circle" size={24} color={isDark ? colors.navy : '#FFFFFF'} />
              <Text style={[styles.createButtonText, { color: isDark ? colors.navy : '#FFFFFF' }]}>Create Pool</Text>
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
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  templatesRow: {
    gap: 12,
    paddingRight: 4,
    paddingBottom: 4,
  },
  templateCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    minWidth: 110,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  templateEmojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  templateEmoji: {
    fontSize: 26,
  },
  templateLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  templateAmount: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  categoryRow: {
    gap: 10,
    paddingRight: 4,
    paddingBottom: 4,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  categoryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 4,
  },
  amountField: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    fontSize: 24,
    fontWeight: '600',
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  calendarIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deadlineInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  frequencyButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  frequencyLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
    marginTop: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native';
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

const POOL_EMOJIS = [
  '🎂', '🎉', '✈️', '🏖️', '🎁', '🛒', '🏠', '🎓',
  '💍', '🚗', '🏕️', '🎯', '🏢', '🔁', '💰', '🍕',
  '🎮', '⚽', '🎵', '📱', '🐶', '🌴', '🎄', '❤️',
  '🥳', '🍽️', '🎬', '🧳', '💐', '🎊', '🏆', '🌟',
];

const getDefaultDeadline = (daysFromNow: number = 30): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
};

const TEMPLATES = [
  { label: '🎂 Birthday Gift', title: 'Birthday Gift', category: 'Gift', amount: '100.00', description: 'Collecting for a birthday present', deadline: getDefaultDeadline(14), emoji: '🎂' },
  { label: '✈️ Group Trip', title: 'Group Trip', category: 'Trip', amount: '500.00', description: 'Pooling funds for our group trip', deadline: getDefaultDeadline(60), emoji: '✈️' },
  { label: '🏢 Office Fund', title: 'Office Fund', category: 'Other', amount: '50.00', description: 'Office snacks and supplies fund', deadline: getDefaultDeadline(30), emoji: '🏢' },
  { label: '🎉 Party Fund', title: 'Party Fund', category: 'Event', amount: '200.00', description: 'Collecting for the party expenses', deadline: getDefaultDeadline(21), emoji: '🎉' },
  { label: '🛒 Group Purchase', title: 'Group Purchase', category: 'Purchase', amount: '150.00', description: 'Splitting cost of a shared purchase', deadline: getDefaultDeadline(14), emoji: '🛒' },
  { label: '🔁 Monthly Pool', title: 'Monthly Pool', category: 'Recurring', amount: '100.00', description: 'Recurring monthly contribution pool', deadline: getDefaultDeadline(30), isRecurring: true, frequency: 'monthly' as const, emoji: '🔁' },
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
  const [emoji, setEmoji] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
    setEmoji(template.emoji || '');
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

    if (emoji) payload.emoji = emoji;
    if (externalLink.trim()) payload.externalLink = externalLink.trim();

    if (isRecurring) {
      payload.isRecurring = true;
      if (frequency) payload.frequency = frequency;
    }

    createMutation.mutate(payload);
  };

  const selectedEmoji = emoji || '💰';

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
          <Text style={[styles.label, { color: colors.mint }]}>Pool Icon</Text>
          <TouchableOpacity
            style={[styles.emojiSelector, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            onPress={() => setShowEmojiPicker(true)}
            activeOpacity={0.7}
            data-testid="button-emoji-picker"
          >
            <Text style={styles.emojiPreview}>{selectedEmoji}</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.emojiSelectorLabel, { color: colors.text }]}>
                {emoji ? 'Tap to change' : 'Choose an emoji'}
              </Text>
              <Text style={[styles.emojiSelectorHint, { color: colors.textSecondary }]}>Optional - defaults to 💰</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
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

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.mint }]}>Link (Optional)</Text>
          <View style={[styles.linkRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <View style={[styles.linkIconWrap, { backgroundColor: `${colors.blue}1F` }]}>
              <Ionicons name="link-outline" size={20} color={colors.blue} />
            </View>
            <TextInput
              style={[styles.linkInput, { color: colors.text }]}
              placeholder="https://example.com"
              placeholderTextColor={colors.textSecondary}
              value={externalLink}
              onChangeText={setExternalLink}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              data-testid="input-external-link"
            />
          </View>
          <Text style={[styles.linkHint, { color: colors.textSecondary }]}>
            Add a link to a wishlist, event page, or related website
          </Text>
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

      <Modal visible={showEmojiPicker} transparent animationType="slide" onRequestClose={() => setShowEmojiPicker(false)}>
        <View style={styles.emojiModalOverlay}>
          <TouchableOpacity style={styles.emojiModalBackdrop} activeOpacity={1} onPress={() => setShowEmojiPicker(false)} />
          <View style={[styles.emojiModalContent, { backgroundColor: isDark ? '#0A1929' : '#FFFFFF', borderColor: `${colors.mint}1A` }]}>
            <View style={[styles.emojiModalHandle, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.emojiModalHeader}>
              <Text style={[styles.emojiModalTitle, { color: colors.text }]}>Choose Pool Icon</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)} data-testid="button-close-emoji-picker">
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {emoji ? (
              <TouchableOpacity
                style={[styles.emojiClearButton, { backgroundColor: `${colors.red}15`, borderColor: `${colors.red}30` }]}
                onPress={() => { setEmoji(''); setShowEmojiPicker(false); }}
                data-testid="button-clear-emoji"
              >
                <Ionicons name="close-outline" size={16} color={colors.red} />
                <Text style={[styles.emojiClearText, { color: colors.red }]}>Remove icon (use default)</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.emojiGrid}>
              {POOL_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[
                    styles.emojiGridItem,
                    { backgroundColor: colors.inputBg },
                    emoji === e && { backgroundColor: `${colors.mint}30`, borderWidth: 2, borderColor: colors.mint },
                  ]}
                  onPress={() => { setEmoji(e); setShowEmojiPicker(false); }}
                  data-testid={`button-emoji-${e}`}
                >
                  <Text style={styles.emojiGridText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  linkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  linkInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  linkHint: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  emojiSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  emojiPreview: {
    fontSize: 32,
  },
  emojiSelectorLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  emojiSelectorHint: {
    fontSize: 12,
    marginTop: 2,
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
  emojiModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  emojiModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  emojiModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    borderWidth: 1,
  },
  emojiModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  emojiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emojiModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emojiClearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  emojiClearText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emojiGridItem: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiGridText: {
    fontSize: 28,
  },
});

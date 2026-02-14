import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Share, Modal, TextInput, Linking, Switch, RefreshControl, Image } from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api, API_URL } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeContext';

type PoolsStackParamList = {
  PoolsList: undefined;
  PoolDetails: { poolId: string };
  CreatePool: undefined;
};

type RouteProps = RouteProp<PoolsStackParamList, 'PoolDetails'>;

const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  switch (category) {
    case 'Gift': return 'gift-outline';
    case 'Trip': return 'airplane-outline';
    case 'Purchase': return 'cart-outline';
    case 'Event': return 'calendar-outline';
    case 'Recurring': return 'repeat-outline';
    default: return 'ellipsis-horizontal-outline';
  }
};

const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'Gift': return '#F472B6';
    case 'Trip': return '#60A5FA';
    case 'Purchase': return '#FBBF24';
    case 'Event': return '#A78BFA';
    case 'Recurring': return '#34D399';
    default: return '#7FFFD4';
  }
};

const formatTimeAgo = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 5) return `${diffWeek}w ago`;
  return `${diffMonth}mo ago`;
};

const getActivityIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'contribution': return 'arrow-down' as keyof typeof Ionicons.glyphMap;
    case 'transfer': return 'arrow-up' as keyof typeof Ionicons.glyphMap;
    case 'withdrawal': return 'arrow-up' as keyof typeof Ionicons.glyphMap;
    case 'spend': return 'arrow-up' as keyof typeof Ionicons.glyphMap;
    default: return 'ellipse-outline';
  }
};

const getActivityColor = (type: string, colors: any): string => {
  switch (type) {
    case 'contribution': return colors.green;
    case 'transfer': return colors.blue;
    case 'withdrawal': return colors.yellow;
    case 'spend': return colors.red;
    default: return colors.textSecondary;
  }
};

export default function PoolDetailsScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { poolId } = route.params;
  const { colors, isDark } = useTheme();

  const [showContribute, setShowContribute] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('stripe');
  const [contributeStep, setContributeStep] = useState<1 | 2>(1);

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferBankId, setTransferBankId] = useState('');
  const [transferPayoutSpeed, setTransferPayoutSpeed] = useState<'standard' | 'instant'>('standard');

  const [showDistribute, setShowDistribute] = useState(false);
  const [distributions, setDistributions] = useState<{ userId: string; amount: string }[]>([]);
  const [closePoolAfterDistribute, setClosePoolAfterDistribute] = useState(false);
  const [showEditPool, setShowEditPool] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTargetAmount, setEditTargetAmount] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editExternalLink, setEditExternalLink] = useState('');
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAutoContribute, setShowAutoContribute] = useState(false);
  const [autoContributeAmount, setAutoContributeAmount] = useState('');
  const [autoContributeFrequency, setAutoContributeFrequency] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');
  const [startImmediately, setStartImmediately] = useState(true);
  const [autoPaymentMethod, setAutoPaymentMethod] = useState<'wallet' | string>('wallet');
  const { refreshUser } = useAuth();

  const { data: pool, isLoading, isError } = useQuery({
    queryKey: ['pool', poolId],
    queryFn: () => api.pools.get(poolId),
  });

  const { data: contributions } = useQuery({
    queryKey: ['contributions', poolId],
    queryFn: () => api.pools.getContributions(poolId),
    enabled: !!pool,
  });

  const { data: walletData } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: () => api.wallet.getBalance(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => api.user.getProfile(),
  });

  const { data: bankAccountsData } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: () => api.bankAccounts.list(),
  });

  const { data: activityData } = useQuery({
    queryKey: ['poolActivity', poolId],
    queryFn: () => api.pools.getActivity(poolId),
    enabled: !!pool,
  });

  const bankAccounts = Array.isArray(bankAccountsData) ? bankAccountsData : (bankAccountsData as any)?.accounts || [];
  const walletBalance = walletData?.balance || '0.00';

  const contributorsList = Array.isArray(contributions) && contributions.length > 0
    ? contributions
    : Array.isArray(pool?.contributors) ? pool.contributors : [];

  const activityList = activityData?.activities || [];
  const activitySummary = activityData?.summary || { raised: '0.00', spent: '0.00', remaining: '0.00' };

  const isCreator = pool?.creatorId === currentUser?.id;
  const distributeTotal = distributions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      invalidateAllQueries();
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      invalidateAllQueries();
      refreshUser();
    }, [poolId])
  );

  const invalidateAllQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['pool', poolId] });
    queryClient.invalidateQueries({ queryKey: ['contributions', poolId] });
    queryClient.invalidateQueries({ queryKey: ['poolActivity', poolId] });
    queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
    queryClient.invalidateQueries({ queryKey: ['user'] });
    queryClient.invalidateQueries({ queryKey: ['pools'] });
  };

  const contributeMutation = useMutation({
    mutationFn: async (amount: string) => {
      if (paymentMethod === 'stripe') {
        const result = await api.pools.checkout(poolId, amount);
        if (result?.url) {
          await Linking.openURL(result.url);
        }
        return result;
      } else if (paymentMethod.startsWith('bank_')) {
        const bankAccountId = paymentMethod.replace('bank_', '');
        return api.pools.contributeBank(poolId, amount, bankAccountId);
      } else {
        return api.pools.contribute(poolId, amount);
      }
    },
    onSuccess: () => {
      invalidateAllQueries();
      setShowContribute(false);
      setContributeAmount('');
      setContributeStep(1);
      setPaymentMethod('stripe');
      if (paymentMethod === 'stripe') {
        Alert.alert('Stripe Checkout', 'Complete your payment in the browser.');
      } else {
        Alert.alert('Success', 'Contribution added successfully!');
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to contribute');
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      const data: any = { toUserId: transferRecipient, amount: transferAmount };
      return api.pools.transfer(poolId, data);
    },
    onSuccess: () => {
      invalidateAllQueries();
      setShowTransfer(false);
      setTransferRecipient('');
      setTransferAmount('');
      setTransferBankId('');
      setTransferPayoutSpeed('standard');
      Alert.alert('Success', 'Transfer completed successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to transfer');
    },
  });

  const distributeMutation = useMutation({
    mutationFn: async () => {
      return api.pools.distribute(poolId, distributions, closePoolAfterDistribute);
    },
    onSuccess: () => {
      invalidateAllQueries();
      setShowDistribute(false);
      setDistributions([]);
      setClosePoolAfterDistribute(false);
      Alert.alert('Success', 'Distribution completed successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to distribute');
    },
  });

  const editPoolMutation = useMutation({
    mutationFn: async () => {
      const data: any = {};
      if (editTitle.trim()) data.title = editTitle.trim();
      if (editDescription.trim()) data.description = editDescription.trim();
      if (editTargetAmount.trim()) data.targetAmount = editTargetAmount.trim();
      if (editDeadline.trim()) data.deadline = editDeadline.trim();
      data.status = editStatus;
      data.emoji = editEmoji || null;
      data.externalLink = editExternalLink.trim() || null;
      return api.pools.update(poolId, data);
    },
    onSuccess: () => {
      invalidateAllQueries();
      setShowEditPool(false);
      Alert.alert('Success', 'Pool updated successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update pool');
    },
  });

  const autoContributeMutation = useMutation({
    mutationFn: () => {
      const pm = autoPaymentMethod === 'wallet' ? 'wallet' : 'bank';
      const bankId = autoPaymentMethod.startsWith('bank_') ? autoPaymentMethod.replace('bank_', '') : undefined;
      return api.recurring.create(poolId, autoContributeAmount, autoContributeFrequency, startImmediately, pm as 'wallet' | 'bank', bankId);
    },
    onSuccess: () => {
      Alert.alert('Success', 'Auto-contribute has been set up!');
      setShowAutoContribute(false);
      setAutoContributeAmount('');
      setAutoContributeFrequency('monthly');
      setStartImmediately(true);
      setAutoPaymentMethod('wallet');
      invalidateAllQueries();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to set up auto-contribute');
    },
  });

  const handleContribute = () => {
    const amount = parseFloat(contributeAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }
    contributeMutation.mutate(contributeAmount);
  };

  const handlePoolImageUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (result.canceled) return;
      
      setUploadingImage(true);
      const asset = result.assets[0];
      
      const uploadUrlRes = await api.pools.getImageUploadUrl(poolId);
      const { uploadURL, objectPath } = uploadUrlRes;
      
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      
      await fetch(uploadURL, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': asset.mimeType || 'image/jpeg' },
      });
      
      await api.pools.confirmImage(poolId, objectPath);
      invalidateAllQueries();
      Alert.alert('Success', 'Pool image updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this pool on ChipInPool: https://chipinpool.com/pool/${poolId}`,
        url: `https://chipinpool.com/pool/${poolId}`,
      });
    } catch (error) {}
  };

  const openContributeModal = () => {
    setContributeStep(1);
    setContributeAmount('');
    setPaymentMethod('stripe');
    setShowContribute(true);
  };

  const closeContributeModal = () => {
    setShowContribute(false);
    setContributeStep(1);
    setContributeAmount('');
    setPaymentMethod('stripe');
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingSpinnerWrap}>
          <ActivityIndicator size="large" color={colors.mint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading pool details...</Text>
        </View>
      </View>
    );
  }

  if (isError || !pool) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: `${colors.red}33` }]}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.red} />
          <Text style={[styles.errorTitle, { color: colors.red }]}>Pool Not Found</Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>This pool may have been removed or is no longer available.</Text>
          <TouchableOpacity style={[styles.errorButton, { backgroundColor: `${colors.red}26`, borderColor: `${colors.red}4D` }]} onPress={() => navigation.goBack()}>
            <Text style={[styles.errorButtonText, { color: colors.red }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentAmount = parseFloat(pool?.currentAmount ?? '0') || 0;
  const targetAmount = parseFloat(pool?.targetAmount ?? '0') || 0;
  const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const categoryColor = getCategoryColor(pool?.category ?? '');

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.mint} />}>
      <View style={styles.header}>
        {pool?.image && (
          <Image 
            source={{ uri: pool.image.startsWith('http') ? pool.image : `${API_URL}/objects/${encodeURIComponent(pool.image.replace(/^\/objects\//, ''))}` }}
            style={{ width: '100%', height: 160, borderRadius: 16, marginBottom: 16 }}
            resizeMode="cover"
          />
        )}
        {pool?.emoji ? (
          <View style={[styles.iconCircle, { backgroundColor: `${categoryColor}20` }]}>
            <Text style={{ fontSize: 36 }}>{pool.emoji}</Text>
          </View>
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: `${categoryColor}20` }]}>
            <Ionicons name={getCategoryIcon(pool.category)} size={36} color={categoryColor} />
          </View>
        )}
        <Text style={[styles.title, { color: colors.text }]} data-testid="text-pool-title">{pool?.title ?? 'Untitled Pool'}</Text>
        {pool?.description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} data-testid="text-pool-description">{pool.description}</Text>
        ) : null}
        {pool?.externalLink ? (
          <TouchableOpacity
            style={[styles.externalLinkButton, { backgroundColor: `${colors.blue}15`, borderColor: `${colors.blue}30` }]}
            onPress={() => Linking.openURL(pool.externalLink!)}
            activeOpacity={0.7}
            data-testid="button-external-link"
          >
            <Ionicons name="link-outline" size={16} color={colors.blue} />
            <Text style={[styles.externalLinkText, { color: colors.blue }]} numberOfLines={1}>
              {pool.externalLink.replace(/^https?:\/\//, '').split('/')[0]}
            </Text>
            <Ionicons name="open-outline" size={14} color={colors.blue} />
          </TouchableOpacity>
        ) : null}
        {isCreator && (
          <TouchableOpacity
            style={[styles.externalLinkButton, { backgroundColor: `${colors.mint}15`, borderColor: `${colors.mint}30`, marginTop: pool?.externalLink ? 8 : 12 }]}
            onPress={handlePoolImageUpload}
            activeOpacity={0.7}
            disabled={uploadingImage}
            data-testid="button-upload-pool-image"
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color={colors.mint} />
            ) : (
              <Ionicons name="camera-outline" size={16} color={colors.mint} />
            )}
            <Text style={[styles.externalLinkText, { color: colors.mint }]}>
              {uploadingImage ? 'Uploading...' : (pool?.image ? 'Change Image' : 'Add Cover Image')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoCardsRow}>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.infoIconWrap, { backgroundColor: `${colors.mint}26` }]}>
            <Ionicons name="pricetag-outline" size={16} color={colors.mint} />
          </View>
          <Text style={[styles.infoCardLabel, { color: colors.textSecondary }]}>Category</Text>
          <Text style={[styles.infoCardValue, { color: colors.text }]} data-testid="text-pool-category">{pool?.category || 'General'}</Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.infoIconWrap, { backgroundColor: `${colors.blue}26` }]}>
            <Ionicons name="calendar-outline" size={16} color={colors.blue} />
          </View>
          <Text style={[styles.infoCardLabel, { color: colors.textSecondary }]}>Deadline</Text>
          <Text style={[styles.infoCardValue, { color: colors.text }]} data-testid="text-pool-deadline">
            {pool?.deadline ? new Date(pool.deadline).toLocaleDateString() : 'None'}
          </Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.infoIconWrap, { backgroundColor: pool?.status === 'active' ? `${colors.mint}26` : `${colors.yellow}26` }]}>
            <Ionicons name="flag-outline" size={16} color={pool?.status === 'active' ? colors.mint : colors.yellow} />
          </View>
          <Text style={[styles.infoCardLabel, { color: colors.textSecondary }]}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: pool?.status === 'active' ? `${colors.mint}26` : `${colors.yellow}26` }]}>
            <Text style={[styles.statusText, { color: pool?.status === 'active' ? colors.mint : colors.yellow }]} data-testid="text-pool-status">
              {pool?.status || 'Active'}
            </Text>
          </View>
        </View>
      </View>

      <LinearGradient colors={isDark ? ['#0D2B4E', '#1A3A5C'] : [colors.navyLight, colors.navyLight]} style={[styles.progressCard, { borderColor: `${colors.mint}26` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.progressHeader}>
          <Ionicons name="wallet-outline" size={20} color={colors.mint} />
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Pool Progress</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={[styles.currentAmount, { color: colors.mint }]} data-testid="text-current-amount">${currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={[styles.targetAmount, { color: colors.textSecondary }]} data-testid="text-target-amount">of ${targetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: colors.cardBorder }]}>
            <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: colors.mint }]} />
          </View>
        </View>
        <Text style={[styles.progressPercent, { color: colors.mint }]} data-testid="text-progress-percent">{progress.toFixed(1)}% funded</Text>
      </LinearGradient>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.mint }]}
        onPress={() => navigation.navigate('SpendNow')}
        activeOpacity={0.8}
        data-testid="button-spend-now"
      >
        <Ionicons name="bag-handle" size={22} color={isDark ? colors.navy : '#FFFFFF'} />
        <Text style={[styles.primaryButtonText, { color: isDark ? colors.navy : '#FFFFFF' }]}>Spend Now</Text>
      </TouchableOpacity>

      <View style={styles.secondaryButtonsRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: `${colors.mint}40` }, pool?.status !== 'active' && { opacity: 0.5 }]}
          onPress={pool?.status === 'active' ? openContributeModal : undefined}
          activeOpacity={0.7}
          disabled={pool?.status !== 'active'}
          data-testid="button-contribute"
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.mint} />
          <Text style={[styles.secondaryButtonText, { color: colors.mint }]}>{pool?.status === 'active' ? 'Contribute' : 'Pool Closed'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: `${colors.mint}40` }]} onPress={handleShare} activeOpacity={0.7} data-testid="button-share">
          <Ionicons name="share-outline" size={20} color={colors.mint} />
          <Text style={[styles.secondaryButtonText, { color: colors.mint }]}>Share</Text>
        </TouchableOpacity>
      </View>

      {pool?.status === 'active' && (
        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', backgroundColor: colors.card, borderColor: `${colors.mint}40` }]}
          onPress={() => setShowAutoContribute(true)}
          activeOpacity={0.7}
          data-testid="button-auto-contribute"
        >
          <Ionicons name="repeat-outline" size={20} color={colors.mint} />
          <Text style={[styles.secondaryButtonText, { color: colors.mint }]}>Set Up Auto-Contribute</Text>
        </TouchableOpacity>
      )}

      {isCreator && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={20} color={colors.mint} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pool Actions</Text>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => {
                setDistributions([]);
                setClosePoolAfterDistribute(false);
                setShowDistribute(true);
              }}
              activeOpacity={0.7}
              data-testid="button-distribute"
            >
              <View style={[styles.actionIconWrap, { backgroundColor: `${colors.blue}26` }]}>
                <Ionicons name="send-outline" size={20} color={colors.blue} />
              </View>
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => {
                setEditTitle(pool?.title || '');
                setEditDescription(pool?.description || '');
                setEditTargetAmount(pool?.targetAmount || '');
                setEditDeadline(pool?.deadline ? new Date(pool.deadline).toISOString().split('T')[0] : '');
                setEditStatus(pool?.status || 'active');
                setEditEmoji(pool?.emoji || '');
                setEditExternalLink(pool?.externalLink || '');
                setShowEditPool(true);
              }}
              activeOpacity={0.7}
              data-testid="button-edit-pool"
            >
              <View style={[styles.actionIconWrap, { backgroundColor: `${colors.yellow}26` }]}>
                <Ionicons name="create-outline" size={20} color={colors.yellow} />
              </View>
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Edit Pool</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people-outline" size={20} color={colors.mint} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contributors</Text>
          {contributorsList.length > 0 && (
            <View style={[styles.contributorCountBadge, { backgroundColor: `${colors.mint}26` }]}>
              <Text style={[styles.contributorCountText, { color: colors.mint }]}>{contributorsList.length}</Text>
            </View>
          )}
        </View>
        {contributorsList.map((contribution: any, index: number) => (
          <View key={contribution?.id ?? `contrib-${index}`} style={[styles.contributorRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid={`card-contributor-${contribution?.id}`}>
            <View style={[styles.contributorAvatar, { backgroundColor: `${colors.mint}26`, borderColor: `${colors.mint}40` }]}>
              <Text style={[styles.contributorInitials, { color: colors.mint }]}>
                {contribution?.firstName?.[0] ?? ''}{contribution?.lastName?.[0] ?? ''}
              </Text>
            </View>
            <View style={styles.contributorInfo}>
              <Text style={[styles.contributorName, { color: colors.text }]}>{contribution?.firstName ?? ''} {contribution?.lastName ?? ''}</Text>
              <Text style={[styles.contributorDate, { color: colors.textSecondary }]}>
                {new Date(contribution?.date ?? contribution?.createdAt ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            <Text style={[styles.contributorAmount, { color: colors.mint }]}>${parseFloat(contribution?.totalContributed || contribution?.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        ))}
        {contributorsList.length === 0 && (
          <View style={[styles.emptyContributors, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="people-outline" size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No contributions yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Be the first to contribute!</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="pulse-outline" size={20} color={colors.mint} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity</Text>
        </View>

        <View style={styles.activitySummaryRow}>
          <View style={[styles.activitySummaryCard, { backgroundColor: colors.card, borderColor: `${colors.green}33` }]}>
            <Text style={[styles.activitySummaryLabel, { color: colors.green }]}>Raised</Text>
            <Text style={[styles.activitySummaryValue, { color: colors.green }]}>${parseFloat(activitySummary.raised || '0').toFixed(2)}</Text>
          </View>
          <View style={[styles.activitySummaryCard, { backgroundColor: colors.card, borderColor: `${colors.red}33` }]}>
            <Text style={[styles.activitySummaryLabel, { color: colors.red }]}>Spent</Text>
            <Text style={[styles.activitySummaryValue, { color: colors.red }]}>${parseFloat(activitySummary.spent || '0').toFixed(2)}</Text>
          </View>
          <View style={[styles.activitySummaryCard, { backgroundColor: colors.card, borderColor: `${colors.blue}33` }]}>
            <Text style={[styles.activitySummaryLabel, { color: colors.blue }]}>Remaining</Text>
            <Text style={[styles.activitySummaryValue, { color: colors.blue }]}>${parseFloat(activitySummary.remaining || '0').toFixed(2)}</Text>
          </View>
        </View>

        {activityList.length > 0 ? activityList.map((activity: any, index: number) => {
          const actColor = getActivityColor(activity.type, colors);
          return (
            <View key={activity.id ?? `activity-${index}`} style={[styles.activityRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid={`card-activity-${activity.id || index}`}>
              <View style={[styles.activityIconWrap, { backgroundColor: `${actColor}20` }]}>
                <Ionicons name={getActivityIcon(activity.type)} size={16} color={actColor} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityDesc, { color: colors.text }]} numberOfLines={2}>{activity.description}</Text>
                <Text style={[styles.activityTime, { color: colors.textSecondary }]}>{formatTimeAgo(activity.createdAt || activity.date || new Date().toISOString())}</Text>
              </View>
              {activity.amount && (
                <Text style={[styles.activityAmount, { color: actColor }]}>
                  {activity.type === 'contribution' ? '+' : '-'}${parseFloat(activity.amount).toFixed(2)}
                </Text>
              )}
            </View>
          );
        }) : (
          <View style={[styles.emptyContributors, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="pulse-outline" size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No activity yet</Text>
          </View>
        )}
      </View>

      {/* Contribute Modal - Two Step Flow */}
      <Modal
        visible={showContribute}
        transparent
        animationType="slide"
        onRequestClose={closeContributeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeContributeModal} />
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#0A1929' : colors.navyLight, borderColor: `${colors.mint}1A` }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />

            {contributeStep === 1 ? (
              <>
                <View style={styles.modalHeaderRow}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Contribute to Pool</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{pool?.title ?? ''}</Text>
                  </View>
                  <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: colors.cardBorder }]} onPress={closeContributeModal} data-testid="button-close-modal">
                    <Ionicons name="close" size={22} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.quickAmountsRow}>
                  {['25', '50', '100'].map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[styles.quickAmountBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }, contributeAmount === amt && { borderColor: colors.mint, backgroundColor: `${colors.mint}14` }]}
                      onPress={() => setContributeAmount(amt)}
                      activeOpacity={0.7}
                      data-testid={`button-quick-amount-${amt}`}
                    >
                      <Text style={[styles.quickAmountText, { color: colors.text }, contributeAmount === amt && { color: colors.mint }]}>${amt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={[styles.amountInputContainer, { backgroundColor: colors.inputBg, borderColor: `${colors.mint}33` }]}>
                  <Text style={[styles.dollarPrefix, { color: colors.mint }]}>$</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.text }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                    value={contributeAmount}
                    onChangeText={setContributeAmount}
                    data-testid="input-contribute-amount"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.confirmButton, { marginTop: 8, backgroundColor: colors.mint }, (!contributeAmount || parseFloat(contributeAmount) <= 0) && styles.confirmButtonDisabled]}
                  onPress={() => {
                    const amount = parseFloat(contributeAmount);
                    if (isNaN(amount) || amount <= 0) {
                      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
                      return;
                    }
                    setContributeStep(2);
                  }}
                  disabled={!contributeAmount || parseFloat(contributeAmount) <= 0}
                  activeOpacity={0.8}
                  data-testid="button-continue-step2"
                >
                  <Text style={[styles.confirmButtonText, { color: isDark ? colors.navy : '#FFFFFF' }]}>Continue</Text>
                </TouchableOpacity>

                <View style={styles.walletBalanceRow}>
                  <Ionicons name="wallet-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.walletBalanceText, { color: colors.textSecondary }]}>Wallet Balance: ${parseFloat(walletBalance).toFixed(2)}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => setContributeStep(1)} data-testid="button-back-step1">
                      <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View>
                      <Text style={[styles.modalTitle, { color: colors.text }]}>Payment Method</Text>
                      <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Amount: ${parseFloat(contributeAmount).toFixed(2)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: colors.cardBorder }]} onPress={closeContributeModal} data-testid="button-close-modal-step2">
                    <Ionicons name="close" size={22} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodCard,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    paymentMethod === 'stripe' && { borderColor: colors.mint, backgroundColor: `${colors.mint}14` },
                  ]}
                  onPress={() => setPaymentMethod('stripe')}
                  activeOpacity={0.7}
                  data-testid="button-payment-stripe"
                >
                  <View style={[styles.paymentMethodIconWrap, { backgroundColor: colors.inputBg }]}>
                    <Ionicons name="card-outline" size={24} color={paymentMethod === 'stripe' ? colors.mint : colors.textSecondary} />
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={[styles.paymentMethodName, { color: colors.text }, paymentMethod === 'stripe' && { color: colors.mint }]}>Pay with Card</Text>
                    <Text style={[styles.paymentMethodDesc, { color: colors.textSecondary }]}>Secure checkout via Stripe</Text>
                  </View>
                  <View style={[styles.paymentMethodRadio, { borderColor: colors.cardBorder }, paymentMethod === 'stripe' && { borderColor: colors.mint }]}>
                    {paymentMethod === 'stripe' && <View style={[styles.paymentMethodRadioDot, { backgroundColor: colors.mint }]} />}
                  </View>
                </TouchableOpacity>

                {bankAccounts.length > 0 && (
                  <>
                    <Text style={[styles.paymentMethodLabel, { color: colors.text }]}>Linked Bank Accounts</Text>
                    {bankAccounts.map((account: any) => {
                      const methodKey = `bank_${account.id}`;
                      return (
                        <TouchableOpacity
                          key={account.id}
                          style={[
                            styles.paymentMethodCard,
                            { backgroundColor: colors.card, borderColor: colors.cardBorder },
                            paymentMethod === methodKey && { borderColor: colors.mint, backgroundColor: `${colors.mint}14` },
                          ]}
                          onPress={() => setPaymentMethod(methodKey)}
                          activeOpacity={0.7}
                          data-testid={`button-payment-bank-${account.id}`}
                        >
                          <View style={[styles.paymentMethodIconWrap, { backgroundColor: colors.inputBg }]}>
                            <Ionicons name="business-outline" size={24} color={paymentMethod === methodKey ? colors.mint : colors.textSecondary} />
                          </View>
                          <View style={styles.paymentMethodInfo}>
                            <Text style={[styles.paymentMethodName, { color: colors.text }, paymentMethod === methodKey && { color: colors.mint }]}>
                              {account.bankName || account.institutionName || 'Bank Account'}
                            </Text>
                            <Text style={[styles.paymentMethodDesc, { color: colors.textSecondary }]}>
                              ••••{account.last4 || account.mask || '****'}
                            </Text>
                          </View>
                          <View style={[styles.paymentMethodRadio, { borderColor: colors.cardBorder }, paymentMethod === methodKey && { borderColor: colors.mint }]}>
                            {paymentMethod === methodKey && <View style={[styles.paymentMethodRadioDot, { backgroundColor: colors.mint }]} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}

                <TouchableOpacity
                  style={[
                    styles.paymentMethodCard,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    paymentMethod === 'balance' && { borderColor: colors.mint, backgroundColor: `${colors.mint}14` },
                  ]}
                  onPress={() => setPaymentMethod('balance')}
                  activeOpacity={0.7}
                  data-testid="button-payment-balance"
                >
                  <View style={[styles.paymentMethodIconWrap, { backgroundColor: colors.inputBg }]}>
                    <Ionicons name="wallet-outline" size={24} color={paymentMethod === 'balance' ? colors.mint : colors.textSecondary} />
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={[styles.paymentMethodName, { color: colors.text }, paymentMethod === 'balance' && { color: colors.mint }]}>Wallet Balance</Text>
                    <Text style={[styles.paymentMethodDesc, { color: colors.textSecondary }]}>${parseFloat(walletBalance).toFixed(2)} available</Text>
                  </View>
                  <View style={[styles.paymentMethodRadio, { borderColor: colors.cardBorder }, paymentMethod === 'balance' && { borderColor: colors.mint }]}>
                    {paymentMethod === 'balance' && <View style={[styles.paymentMethodRadioDot, { backgroundColor: colors.mint }]} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmButton, { marginTop: 16, backgroundColor: colors.mint }, contributeMutation.isPending && styles.confirmButtonDisabled]}
                  onPress={handleContribute}
                  disabled={contributeMutation.isPending}
                  activeOpacity={0.8}
                  data-testid="button-confirm-contribute"
                >
                  {contributeMutation.isPending ? (
                    <ActivityIndicator color={isDark ? colors.navy : '#FFFFFF'} />
                  ) : (
                    <Text style={[styles.confirmButtonText, { color: isDark ? colors.navy : '#FFFFFF' }]}>Confirm Payment</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        visible={showTransfer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTransfer(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowTransfer(false)} />
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#0A1929' : colors.navyLight, borderColor: `${colors.mint}1A` }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Send to Contributor</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{pool?.title ?? ''}</Text>
              </View>
              <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: colors.cardBorder }]} onPress={() => setShowTransfer(false)} data-testid="button-close-transfer">
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.paymentMethodLabel, { color: colors.text }]}>Select Recipient</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>Funds will be sent to the recipient's wallet</Text>
            <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
              {contributorsList.filter((c: any) => c?.userId !== currentUser?.id).map((c: any, i: number) => (
                <TouchableOpacity
                  key={c?.userId || i}
                  style={[styles.paymentMethodCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }, transferRecipient === c?.userId && { borderColor: colors.mint, backgroundColor: `${colors.mint}14` }]}
                  onPress={() => setTransferRecipient(c?.userId)}
                  activeOpacity={0.7}
                  data-testid={`button-transfer-user-${c?.userId}`}
                >
                  <View style={[styles.contributorAvatar, { backgroundColor: `${colors.mint}26`, borderColor: `${colors.mint}40` }]}>
                    <Text style={[styles.contributorInitials, { color: colors.mint }]}>{c?.firstName?.[0]}{c?.lastName?.[0]}</Text>
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={[styles.paymentMethodName, { color: colors.text }, transferRecipient === c?.userId && { color: colors.mint }]}>
                      {c?.firstName} {c?.lastName}
                    </Text>
                    <Text style={[styles.paymentMethodDesc, { color: colors.textSecondary }]}>Funds sent to wallet</Text>
                  </View>
                  <View style={[styles.paymentMethodRadio, { borderColor: colors.cardBorder }, transferRecipient === c?.userId && { borderColor: colors.mint }]}>
                    {transferRecipient === c?.userId && <View style={[styles.paymentMethodRadioDot, { backgroundColor: colors.mint }]} />}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={[styles.amountInputContainer, { marginTop: 16, backgroundColor: colors.inputBg, borderColor: `${colors.mint}33` }]}>
              <Text style={[styles.dollarPrefix, { color: colors.mint }]}>$</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                value={transferAmount}
                onChangeText={setTransferAmount}
                data-testid="input-transfer-amount"
              />
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, { marginTop: 16, backgroundColor: colors.mint }, (transferMutation.isPending || !transferRecipient || !transferAmount) && styles.confirmButtonDisabled]}
              onPress={() => transferMutation.mutate()}
              disabled={transferMutation.isPending || !transferRecipient || !transferAmount}
              activeOpacity={0.8}
              data-testid="button-confirm-transfer"
            >
              {transferMutation.isPending ? (
                <ActivityIndicator color={isDark ? colors.navy : '#FFFFFF'} />
              ) : (
                <Text style={[styles.confirmButtonText, { color: isDark ? colors.navy : '#FFFFFF' }]}>Send Transfer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Distribute Modal */}
      <Modal
        visible={showDistribute}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDistribute(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowDistribute(false)} />
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#0A1929' : colors.navyLight, borderColor: `${colors.mint}1A` }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Distribute Funds</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{pool?.title ?? ''}</Text>
              </View>
              <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: colors.cardBorder }]} onPress={() => setShowDistribute(false)} data-testid="button-close-distribute">
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 12, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Available Balance</Text>
                <Text style={{ color: colors.mint, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] as any }}>
                  ${parseFloat(pool?.currentAmount || '0').toFixed(2)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Distributing</Text>
                <Text style={{ color: distributeTotal > parseFloat(pool?.currentAmount || '0') ? colors.red : colors.text, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] as any }}>
                  ${distributeTotal.toFixed(2)}
                </Text>
              </View>
              {distributeTotal > parseFloat(pool?.currentAmount || '0') && (
                <Text style={{ color: colors.red, fontSize: 12, marginTop: 6 }}>
                  Total exceeds available balance!
                </Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: `${colors.mint}14`, borderRadius: 12, borderWidth: 1, borderColor: `${colors.mint}33` }}
                onPress={() => {
                  const validContributors = contributorsList.filter((c: any) => c?.userId);
                  const allRecipients = [...validContributors];
                  if (currentUser && !validContributors.some((c: any) => c?.userId === currentUser.id)) {
                    allRecipients.push({ userId: currentUser.id, firstName: currentUser.firstName, lastName: currentUser.lastName });
                  }
                  if (allRecipients.length === 0) return;
                  const poolBalance = parseFloat(pool?.currentAmount || '0');
                  const perPerson = Math.floor((poolBalance / allRecipients.length) * 100) / 100;
                  const newDistributions = allRecipients.map((c: any) => ({
                    userId: c.userId || c.id,
                    amount: perPerson.toFixed(2),
                  }));
                  setDistributions(newDistributions);
                }}
                activeOpacity={0.7}
                data-testid="button-split-equally"
              >
                <Ionicons name="git-compare-outline" size={18} color={colors.mint} />
                <Text style={{ color: colors.mint, fontSize: 14, fontWeight: '600', marginLeft: 8 }}>Split Equally</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: `${colors.red}14`, borderRadius: 12, borderWidth: 1, borderColor: `${colors.red}33` }}
                onPress={() => setDistributions([])}
                activeOpacity={0.7}
                data-testid="button-clear-distribute"
              >
                <Ionicons name="close-circle-outline" size={18} color={colors.red} />
                <Text style={{ color: colors.red, fontSize: 14, fontWeight: '600', marginLeft: 8 }}>Clear All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
              {currentUser && !contributorsList.some((c: any) => c?.userId === currentUser.id) && (() => {
                const existing = distributions.find(d => d.userId === currentUser.id);
                return (
                  <View key={`owner-${currentUser.id}`} style={[styles.distributeRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid={`distribute-row-owner`}>
                    <View style={[styles.contributorAvatar, { borderWidth: 1, borderColor: colors.mint, backgroundColor: `${colors.mint}26` }]}>
                      <Text style={[styles.contributorInitials, { color: colors.mint }]}>{currentUser.firstName?.[0]}{currentUser.lastName?.[0]}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.contributorName, { color: colors.text }]}>{currentUser.firstName} {currentUser.lastName}</Text>
                      <Text style={{ color: colors.mint, fontSize: 11 }}>Pool Owner</Text>
                    </View>
                    <View style={[styles.distributeAmountWrap, { backgroundColor: colors.inputBg, borderColor: `${colors.mint}33` }]}>
                      <Text style={[styles.dollarPrefix, { color: colors.mint }]}>$</Text>
                      <TextInput
                        style={[styles.distributeAmountInput, { color: colors.text }]}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="decimal-pad"
                        value={existing?.amount || ''}
                        onChangeText={(text) => {
                          setDistributions(prev => {
                            const filtered = prev.filter(d => d.userId !== currentUser.id);
                            if (text) {
                              filtered.push({ userId: currentUser.id, amount: text });
                            }
                            return filtered;
                          });
                        }}
                        data-testid={`input-distribute-owner`}
                      />
                    </View>
                  </View>
                );
              })()}
              {contributorsList.map((c: any, i: number) => {
                const existing = distributions.find(d => d.userId === c?.userId);
                return (
                  <View key={c?.userId || i} style={[styles.distributeRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid={`distribute-row-${c?.userId || i}`}>
                    <View style={[styles.contributorAvatar, { backgroundColor: `${colors.mint}26`, borderColor: `${colors.mint}40` }]}>
                      <Text style={[styles.contributorInitials, { color: colors.mint }]}>{c?.firstName?.[0]}{c?.lastName?.[0]}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.contributorName, { color: colors.text }]}>{c?.firstName} {c?.lastName}</Text>
                    </View>
                    <View style={[styles.distributeAmountWrap, { backgroundColor: colors.inputBg, borderColor: `${colors.mint}33` }]}>
                      <Text style={[styles.dollarPrefix, { color: colors.mint }]}>$</Text>
                      <TextInput
                        style={[styles.distributeAmountInput, { color: colors.text }]}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="decimal-pad"
                        value={existing?.amount || ''}
                        onChangeText={(text) => {
                          setDistributions(prev => {
                            const filtered = prev.filter(d => d.userId !== c?.userId);
                            if (text) {
                              filtered.push({ userId: c?.userId, amount: text });
                            }
                            return filtered;
                          });
                        }}
                        data-testid={`input-distribute-${c?.userId || i}`}
                      />
                    </View>
                  </View>
                );
              })}
              {contributorsList.length === 0 && (
                <View style={[styles.emptyContributors, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No contributors to distribute to</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.closePoolRow}>
              <Text style={[styles.closePoolText, { color: colors.text }]}>Close pool after distribution</Text>
              <Switch
                value={closePoolAfterDistribute}
                onValueChange={setClosePoolAfterDistribute}
                trackColor={{ false: colors.inputBorder, true: `${colors.mint}4D` }}
                thumbColor={closePoolAfterDistribute ? colors.mint : colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, { marginTop: 16, backgroundColor: colors.mint }, (distributeMutation.isPending || distributions.length === 0 || distributeTotal <= 0 || distributeTotal > parseFloat(pool?.currentAmount || '0')) && styles.confirmButtonDisabled]}
              onPress={() => distributeMutation.mutate()}
              disabled={distributeMutation.isPending || distributions.length === 0 || distributeTotal <= 0 || distributeTotal > parseFloat(pool?.currentAmount || '0')}
              activeOpacity={0.8}
              data-testid="button-confirm-distribute"
            >
              {distributeMutation.isPending ? (
                <ActivityIndicator color={isDark ? colors.navy : '#FFFFFF'} />
              ) : (
                <Text style={[styles.confirmButtonText, { color: isDark ? colors.navy : '#FFFFFF' }]}>Confirm Distribution</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditPool}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditPool(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowEditPool(false)} />
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#0A1929' : colors.navyLight, borderColor: `${colors.mint}1A` }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Pool</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Update pool details</Text>
              </View>
              <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: colors.cardBorder }]} onPress={() => setShowEditPool(false)} data-testid="button-close-edit">
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <Text style={[styles.paymentMethodLabel, { color: colors.text }]}>Pool Name</Text>
              <TextInput
                style={[styles.amountInput, { paddingHorizontal: 16, fontSize: 15, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 14, color: colors.text }]}
                placeholder="Pool name"
                placeholderTextColor={colors.textSecondary}
                value={editTitle}
                onChangeText={setEditTitle}
                data-testid="input-edit-title"
              />

              <Text style={[styles.paymentMethodLabel, { marginTop: 16, color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.amountInput, { paddingHorizontal: 16, fontSize: 15, minHeight: 80, textAlignVertical: 'top', backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 14, color: colors.text }]}
                placeholder="Pool description"
                placeholderTextColor={colors.textSecondary}
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={3}
                data-testid="input-edit-description"
              />

              <Text style={[styles.paymentMethodLabel, { marginTop: 16, color: colors.text }]}>Target Amount ($)</Text>
              <View style={[styles.amountInputContainer, { backgroundColor: colors.inputBg, borderColor: `${colors.mint}33` }]}>
                <Text style={[styles.dollarPrefix, { color: colors.mint }]}>$</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  value={editTargetAmount}
                  onChangeText={setEditTargetAmount}
                  data-testid="input-edit-target"
                />
              </View>

              <Text style={[styles.paymentMethodLabel, { marginTop: 16, color: colors.text }]}>Deadline (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.amountInput, { paddingHorizontal: 16, fontSize: 15, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 14, color: colors.text }]}
                placeholder="2025-12-31"
                placeholderTextColor={colors.textSecondary}
                value={editDeadline}
                onChangeText={setEditDeadline}
                data-testid="input-edit-deadline"
              />

              <Text style={[styles.paymentMethodLabel, { marginTop: 16, color: colors.text }]}>Pool Icon</Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 14, padding: 12, marginBottom: 4 }}
                onPress={() => setShowEditEmojiPicker(!showEditEmojiPicker)}
                data-testid="button-edit-emoji"
              >
                <Text style={{ fontSize: 28, marginRight: 12 }}>{editEmoji || '💰'}</Text>
                <Text style={{ flex: 1, fontSize: 14, color: colors.textSecondary }}>{editEmoji ? 'Tap to change' : 'Choose an emoji (optional)'}</Text>
                {editEmoji ? (
                  <TouchableOpacity onPress={() => setEditEmoji('')} style={{ padding: 4 }} data-testid="button-clear-edit-emoji">
                    <Ionicons name="close-circle" size={20} color={colors.red} />
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
              {showEditEmojiPicker && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 8 }}>
                  {['🎂', '🎉', '✈️', '🏖️', '🎁', '🛒', '🏠', '🎓', '💍', '🚗', '🏕️', '🎯', '🏢', '🔁', '💰', '🍕', '🎮', '⚽', '🎵', '📱', '🐶', '🌴', '🎄', '❤️'].map((e) => (
                    <TouchableOpacity
                      key={e}
                      style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: editEmoji === e ? `${colors.mint}30` : colors.inputBg, borderWidth: editEmoji === e ? 2 : 0, borderColor: colors.mint }}
                      onPress={() => { setEditEmoji(e); setShowEditEmojiPicker(false); }}
                    >
                      <Text style={{ fontSize: 24 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.paymentMethodLabel, { marginTop: 16, color: colors.text }]}>Link (Optional)</Text>
              <TextInput
                style={[styles.amountInput, { paddingHorizontal: 16, fontSize: 15, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 14, color: colors.text }]}
                placeholder="https://example.com"
                placeholderTextColor={colors.textSecondary}
                value={editExternalLink}
                onChangeText={setEditExternalLink}
                keyboardType="url"
                autoCapitalize="none"
                data-testid="input-edit-link"
              />

              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginTop: 16, marginBottom: 8 }}>Status</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { value: 'active', label: 'Active', color: colors.mint },
                  { value: 'paused', label: 'Paused', color: colors.yellow },
                  { value: 'closed', label: 'Closed', color: colors.red },
                  { value: 'completed', label: 'Completed', color: colors.green },
                  { value: 'expired', label: 'Expired', color: colors.textSecondary },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setEditStatus(option.value)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: editStatus === option.value ? option.color : colors.inputBorder,
                      backgroundColor: editStatus === option.value ? `${option.color}20` : colors.inputBg,
                    }}
                    data-testid={`button-status-${option.value}`}
                  >
                    <Text style={{
                      fontSize: 13,
                      fontWeight: editStatus === option.value ? '700' : '500',
                      color: editStatus === option.value ? option.color : colors.textSecondary,
                    }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                {editStatus === 'paused' ? 'Contributions temporarily suspended' :
                 editStatus === 'closed' ? 'Pool closed. Can be reopened later.' :
                 editStatus === 'completed' ? 'Pool goal has been reached' :
                 editStatus === 'expired' ? 'Pool deadline has passed' :
                 'Pool is open for contributions'}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.confirmButton, { marginTop: 16, backgroundColor: colors.mint }, editPoolMutation.isPending && styles.confirmButtonDisabled]}
              onPress={() => editPoolMutation.mutate()}
              disabled={editPoolMutation.isPending}
              activeOpacity={0.8}
              data-testid="button-confirm-edit"
            >
              {editPoolMutation.isPending ? (
                <ActivityIndicator color={isDark ? colors.navy : '#FFFFFF'} />
              ) : (
                <Text style={[styles.confirmButtonText, { color: isDark ? colors.navy : '#FFFFFF' }]}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showAutoContribute} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#0A1929' : colors.navyLight, borderColor: `${colors.mint}1A` }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Set Up Auto-Contribute</Text>
              </View>
              <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: colors.cardBorder }]} onPress={() => setShowAutoContribute(false)} data-testid="button-close-auto-contribute">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
              Automatically contribute to this pool on a recurring schedule using your wallet or linked bank account.
            </Text>

            <Text style={[styles.paymentMethodLabel, { color: colors.text }]}>Amount ($)</Text>
            <View style={[styles.amountInputContainer, { backgroundColor: colors.inputBg, borderColor: `${colors.mint}33` }]}>
              <Text style={[styles.dollarPrefix, { color: colors.mint }]}>$</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={autoContributeAmount}
                onChangeText={setAutoContributeAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                data-testid="input-auto-contribute-amount"
              />
            </View>

            <Text style={[styles.paymentMethodLabel, { color: colors.text }]}>Frequency</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['weekly', 'monthly', 'quarterly'] as const).map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: autoContributeFrequency === freq ? colors.mint : colors.inputBorder,
                    backgroundColor: autoContributeFrequency === freq ? `${colors.mint}26` : colors.inputBg,
                    alignItems: 'center',
                  }}
                  onPress={() => setAutoContributeFrequency(freq)}
                  data-testid={`button-freq-${freq}`}
                >
                  <Text style={{
                    color: autoContributeFrequency === freq ? colors.mint : colors.textSecondary,
                    fontSize: 13,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}>
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.paymentMethodLabel, { color: colors.text }]}>Payment Method</Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: autoPaymentMethod === 'wallet' ? colors.mint : colors.inputBorder,
                  backgroundColor: autoPaymentMethod === 'wallet' ? `${colors.mint}1A` : colors.inputBg,
                }}
                onPress={() => setAutoPaymentMethod('wallet')}
                data-testid="auto-payment-wallet"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="wallet-outline" size={20} color={autoPaymentMethod === 'wallet' ? colors.mint : colors.textSecondary} />
                  <View>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Wallet Balance</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>${walletData?.balance ? parseFloat(walletData.balance).toLocaleString() : '0'} available</Text>
                  </View>
                </View>
                {autoPaymentMethod === 'wallet' && <Ionicons name="checkmark-circle" size={20} color={colors.mint} />}
              </TouchableOpacity>
              {bankAccounts.map((account: any) => (
                <TouchableOpacity
                  key={account.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: autoPaymentMethod === `bank_${account.id}` ? colors.mint : colors.inputBorder,
                    backgroundColor: autoPaymentMethod === `bank_${account.id}` ? `${colors.mint}1A` : colors.inputBg,
                  }}
                  onPress={() => setAutoPaymentMethod(`bank_${account.id}`)}
                  data-testid={`auto-payment-bank-${account.id}`}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="business-outline" size={20} color={autoPaymentMethod === `bank_${account.id}` ? colors.mint : colors.textSecondary} />
                    <View>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{account.bankName || 'Bank Account'}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>••••{account.accountMask}</Text>
                    </View>
                  </View>
                  {autoPaymentMethod === `bank_${account.id}` && <Ionicons name="checkmark-circle" size={20} color={colors.mint} />}
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingVertical: 8 }}>
              <Text style={{ color: colors.text, fontSize: 14 }}>Start first payment now</Text>
              <Switch
                value={startImmediately}
                onValueChange={setStartImmediately}
                trackColor={{ false: colors.inputBorder, true: `${colors.mint}4D` }}
                thumbColor={startImmediately ? colors.mint : colors.textSecondary}
                data-testid="switch-start-immediately"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.inputBorder, flex: 1 }]}
                onPress={() => setShowAutoContribute(false)}
              >
                <Text style={{ color: colors.text, fontWeight: '600', textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, {
                  backgroundColor: colors.mint,
                  flex: 1,
                  opacity: (!autoContributeAmount || parseFloat(autoContributeAmount) <= 0 || autoContributeMutation.isPending) ? 0.5 : 1,
                }]}
                onPress={() => autoContributeMutation.mutate()}
                disabled={!autoContributeAmount || parseFloat(autoContributeAmount) <= 0 || autoContributeMutation.isPending}
                data-testid="button-confirm-auto-contribute"
              >
                <Text style={{ color: isDark ? colors.navy : '#FFFFFF', fontWeight: '700', textAlign: 'center' }}>
                  {autoContributeMutation.isPending ? 'Setting up...' : 'Set Up Auto-Contribute'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSpinnerWrap: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorCard: {
    alignItems: 'center',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    borderWidth: 1,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  errorButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  externalLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  externalLinkText: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 200,
  },
  infoCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  infoCardLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  progressCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  currentAmount: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  targetAmount: {
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  progressBarContainer: {
    marginBottom: 10,
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  contributorCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  contributorCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  contributorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  contributorInitials: {
    fontWeight: '700',
    fontSize: 15,
  },
  contributorInfo: {
    flex: 1,
    marginLeft: 14,
  },
  contributorName: {
    fontWeight: '600',
    fontSize: 15,
  },
  contributorDate: {
    fontSize: 12,
    marginTop: 3,
  },
  contributorAmount: {
    fontWeight: '700',
    fontSize: 16,
  },
  emptyContributors: {
    alignItems: 'center',
    paddingVertical: 32,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  dollarPrefix: {
    fontSize: 22,
    fontWeight: '700',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    paddingVertical: 16,
  },
  confirmButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  paymentMethodLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  paymentMethodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 14,
  },
  paymentMethodName: {
    fontSize: 15,
    fontWeight: '600',
  },
  paymentMethodDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  paymentMethodRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  quickAmountsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  quickAmountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  walletBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  walletBalanceText: {
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  activitySummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  activitySummaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  activitySummaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  activitySummaryValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activityDesc: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 12,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  distributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  distributeAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    width: 100,
  },
  distributeAmountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 10,
  },
  closePoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  closePoolText: {
    fontSize: 14,
    fontWeight: '500',
  },
  payoutSpeedBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  payoutSpeedSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
});

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  Image,
  Linking,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'electronics', label: 'Electronics' },
  { key: 'fashion', label: 'Fashion' },
  { key: 'travel', label: 'Travel' },
  { key: 'food', label: 'Food & Dining' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'home', label: 'Home' },
  { key: 'health', label: 'Health' },
  { key: 'sports', label: 'Sports' },
  { key: 'education', label: 'Education' },
  { key: 'services', label: 'Services' },
];

const CARD_GAP = 10;
const SCREEN_PADDING = 20;
const CARD_WIDTH = (Dimensions.get('window').width - SCREEN_PADDING * 2 - CARD_GAP) / 2;

export default function SpendNowScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [showPoolPicker, setShowPoolPicker] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data: partnersData,
    isLoading: loadingPartners,
    refetch: refetchPartners,
    isRefetching,
  } = useQuery({
    queryKey: ['partners', selectedCategory, debouncedSearch],
    queryFn: () =>
      api.partners.list(
        selectedCategory !== 'all' ? selectedCategory : undefined,
        debouncedSearch || undefined,
      ),
  });

  const { data: poolsData } = useQuery({
    queryKey: ['pools'],
    queryFn: api.pools.list,
  });

  const availablePools = useMemo(() => {
    if (!poolsData || !user) return [];
    const pools = Array.isArray(poolsData) ? poolsData : poolsData.pools || [];
    return pools.filter(
      (p: any) => parseFloat(p.currentAmount || p.balance || '0') > 0,
    );
  }, [poolsData, user]);

  useEffect(() => {
    if (!selectedPoolId) {
      if (parseFloat(user?.balance || '0') > 0) {
        setSelectedPoolId('wallet');
      } else if (availablePools.length > 0) {
        setSelectedPoolId(String(availablePools[0].id));
      }
    }
  }, [availablePools, selectedPoolId, user]);

  const selectedPool = selectedPoolId === 'wallet' ? null : availablePools.find(
    (p: any) => String(p.id) === selectedPoolId,
  );
  const isWalletSelected = selectedPoolId === 'wallet';

  useFocusEffect(
    useCallback(() => {
      refetchPartners();
    }, [])
  );

  const partners = Array.isArray(partnersData)
    ? partnersData
    : partnersData?.partners || [];

  const getPoolBalance = (pool: any) =>
    parseFloat(pool.currentAmount || pool.balance || '0').toFixed(2);

  const renderPartnerCard = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {item.bannerImage ? (
            <Image
              source={{ uri: item.bannerImage }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.cardImagePlaceholder, { backgroundColor: `${colors.mint}0D` }]}>
              <Ionicons name="storefront" size={32} color={`${colors.mint}4D`} />
            </View>
          )}
          {item.discountPercent > 0 && (
            <View style={[styles.discountBadge, { backgroundColor: colors.green }]}>
              <Text style={[styles.discountText, { color: colors.text }]}>{item.discountPercent}% OFF</Text>
            </View>
          )}
          <View style={styles.cardContent}>
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
              {item.companyName}
            </Text>
            <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.shortDescription || item.description}
            </Text>
            {item.partnerCategory && (
              <View style={[styles.categoryBadge, { backgroundColor: `${colors.mint}1A` }]}>
                <Text style={[styles.categoryBadgeText, { color: colors.mint }]}>
                  {CATEGORIES.find((c) => c.key === item.partnerCategory)?.label ||
                    item.partnerCategory}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.shopButton, { backgroundColor: colors.mint }]}
              onPress={() => {
                const url = item.partnerShopUrl || item.website;
                if (url) Linking.openURL(url);
              }}
            >
              <Text style={[styles.shopButtonText, { color: isDark ? colors.navy : '#FFFFFF' }]}>Shop Now</Text>
              <Ionicons name="open-outline" size={14} color={isDark ? colors.navy : '#FFFFFF'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [colors, isDark],
  );

  const ListHeader = (
    <>
      <Text style={[styles.title, { color: colors.text }]}>Spend Now</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Shop directly with your wallet or pool funds at partner stores
      </Text>

      <TouchableOpacity
        style={[styles.poolSelector, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        onPress={() => setShowPoolPicker(!showPoolPicker)}
      >
        <View style={styles.poolSelectorLeft}>
          <Ionicons name="wallet" size={20} color={colors.mint} />
          <Text style={[styles.poolSelectorLabel, { color: colors.textSecondary }]}>Spending from:</Text>
        </View>
        {isWalletSelected ? (
          <View style={styles.poolSelectorRight}>
            <Text style={[styles.poolSelectorName, { color: colors.text }]} numberOfLines={1}>
              My Wallet
            </Text>
            <Text style={[styles.poolSelectorBalance, { color: colors.mint }]}>
              ${parseFloat(user?.balance || '0').toFixed(2)}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </View>
        ) : selectedPool ? (
          <View style={styles.poolSelectorRight}>
            <Text style={[styles.poolSelectorName, { color: colors.text }]} numberOfLines={1}>
              {selectedPool.title}
            </Text>
            <Text style={[styles.poolSelectorBalance, { color: colors.mint }]}>
              ${getPoolBalance(selectedPool)}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </View>
        ) : (
          <Text style={[styles.poolSelectorEmpty, { color: colors.textSecondary }]}>No funds available</Text>
        )}
      </TouchableOpacity>

      {showPoolPicker && (availablePools.length > 0 || parseFloat(user?.balance || '0') > 0) && (
        <View style={[styles.poolDropdown, { backgroundColor: colors.cardBorder, borderColor: colors.inputBorder }]}>
          {parseFloat(user?.balance || '0') > 0 && (
            <TouchableOpacity
              style={[
                styles.poolOption,
                { borderBottomColor: colors.inputBg },
                selectedPoolId === 'wallet' && { backgroundColor: `${colors.mint}1A` },
              ]}
              onPress={() => {
                setSelectedPoolId('wallet');
                setShowPoolPicker(false);
              }}
            >
              <Text style={[styles.poolOptionName, { color: colors.text }]}>My Wallet</Text>
              <Text style={[styles.poolOptionBalance, { color: colors.mint }]}>
                ${parseFloat(user?.balance || '0').toFixed(2)}
              </Text>
            </TouchableOpacity>
          )}
          {availablePools.map((pool: any) => (
            <TouchableOpacity
              key={pool.id}
              style={[
                styles.poolOption,
                { borderBottomColor: colors.inputBg },
                String(pool.id) === selectedPoolId && { backgroundColor: `${colors.mint}1A` },
              ]}
              onPress={() => {
                setSelectedPoolId(String(pool.id));
                setShowPoolPicker(false);
              }}
            >
              <Text style={[styles.poolOptionName, { color: colors.text }]}>
                {pool.title}
              </Text>
              <Text style={[styles.poolOptionBalance, { color: colors.mint }]}>
                ${getPoolBalance(pool)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryPill,
              { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
              selectedCategory === cat.key && { backgroundColor: colors.mint, borderColor: colors.mint },
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text
              style={[
                styles.categoryPillText,
                { color: colors.textSecondary },
                selectedCategory === cat.key && { color: isDark ? colors.navy : '#FFFFFF', fontWeight: '700' },
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
        <Ionicons
          name="search"
          size={18}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search partners..."
          placeholderTextColor={colors.textSecondary}
          value={searchInput}
          onChangeText={setSearchInput}
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => setSearchInput('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loadingPartners && (
        <ActivityIndicator
          size="large"
          color={colors.mint}
          style={{ marginVertical: 40 }}
        />
      )}
    </>
  );

  const ListEmpty = !loadingPartners ? (
    <View style={styles.emptyState}>
      <Ionicons name="storefront-outline" size={64} color={`${colors.textSecondary}4D`} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No partners found</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {debouncedSearch
          ? `No partners match "${debouncedSearch}". Try a different search.`
          : 'No partners available in this category yet.'}
      </Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <FlatList
        data={loadingPartners ? [] : partners}
        renderItem={renderPartnerCard}
        keyExtractor={(item: any) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchPartners}
            tintColor={colors.mint}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: SCREEN_PADDING, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  poolSelector: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    marginBottom: 8,
  },
  poolSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  poolSelectorLabel: { fontSize: 13, fontWeight: '500' },
  poolSelectorRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' },
  poolSelectorName: { fontSize: 14, fontWeight: '600', maxWidth: 120 },
  poolSelectorBalance: { fontSize: 14, fontWeight: '700' },
  poolSelectorEmpty: { fontSize: 13 },
  poolDropdown: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  poolOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  poolOptionName: { fontSize: 14, fontWeight: '500' },
  poolOptionBalance: { fontSize: 14, fontWeight: '600' },
  categoriesContainer: { marginBottom: 16 },
  categoriesContent: { gap: 8, paddingVertical: 4 },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: { fontSize: 13, fontWeight: '500' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 12 },
  row: { gap: CARD_GAP },
  cardWrapper: { width: CARD_WIDTH, marginBottom: CARD_GAP },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImage: { width: '100%', height: 100 },
  cardImagePlaceholder: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountText: { fontSize: 10, fontWeight: '700' },
  cardContent: { padding: 10 },
  cardName: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardDescription: { fontSize: 11, marginBottom: 8, lineHeight: 16 },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: '600' },
  shopButton: {
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shopButtonText: { fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
});

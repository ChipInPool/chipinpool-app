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
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

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
      (p: any) =>
        p.creatorId === user.id &&
        parseFloat(p.currentAmount || p.balance || '0') > 0,
    );
  }, [poolsData, user]);

  useEffect(() => {
    if (availablePools.length > 0 && !selectedPoolId) {
      setSelectedPoolId(String(availablePools[0].id));
    }
  }, [availablePools, selectedPoolId]);

  const selectedPool = availablePools.find(
    (p: any) => String(p.id) === selectedPoolId,
  );

  const partners = Array.isArray(partnersData)
    ? partnersData
    : partnersData?.partners || [];

  const getPoolBalance = (pool: any) =>
    parseFloat(pool.currentAmount || pool.balance || '0').toFixed(2);

  const renderPartnerCard = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.cardWrapper}>
        <View style={styles.card}>
          {item.bannerImage ? (
            <Image
              source={{ uri: item.bannerImage }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Ionicons name="storefront" size={32} color="rgba(127,255,212,0.3)" />
            </View>
          )}
          {item.discountPercent > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{item.discountPercent}% OFF</Text>
            </View>
          )}
          <View style={styles.cardContent}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.companyName}
            </Text>
            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.shortDescription || item.description}
            </Text>
            {item.partnerCategory && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {CATEGORIES.find((c) => c.key === item.partnerCategory)?.label ||
                    item.partnerCategory}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => {
                const url = item.partnerShopUrl || item.website;
                if (url) Linking.openURL(url);
              }}
            >
              <Text style={styles.shopButtonText}>Shop Now</Text>
              <Ionicons name="open-outline" size={14} color="#001F3F" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [],
  );

  const ListHeader = (
    <>
      <Text style={styles.title}>Spend Now</Text>
      <Text style={styles.subtitle}>
        Shop directly with your pool funds at partner stores
      </Text>

      <TouchableOpacity
        style={styles.poolSelector}
        onPress={() => setShowPoolPicker(!showPoolPicker)}
      >
        <View style={styles.poolSelectorLeft}>
          <Ionicons name="wallet" size={20} color="#7FFFD4" />
          <Text style={styles.poolSelectorLabel}>Spending from:</Text>
        </View>
        {selectedPool ? (
          <View style={styles.poolSelectorRight}>
            <Text style={styles.poolSelectorName} numberOfLines={1}>
              {selectedPool.name || selectedPool.title}
            </Text>
            <Text style={styles.poolSelectorBalance}>
              ${getPoolBalance(selectedPool)}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#708090" />
          </View>
        ) : (
          <Text style={styles.poolSelectorEmpty}>No pools with funds</Text>
        )}
      </TouchableOpacity>

      {showPoolPicker && availablePools.length > 0 && (
        <View style={styles.poolDropdown}>
          {availablePools.map((pool: any) => (
            <TouchableOpacity
              key={pool.id}
              style={[
                styles.poolOption,
                String(pool.id) === selectedPoolId && styles.poolOptionSelected,
              ]}
              onPress={() => {
                setSelectedPoolId(String(pool.id));
                setShowPoolPicker(false);
              }}
            >
              <Text style={styles.poolOptionName}>
                {pool.name || pool.title}
              </Text>
              <Text style={styles.poolOptionBalance}>
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
              selectedCategory === cat.key && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text
              style={[
                styles.categoryPillText,
                selectedCategory === cat.key && styles.categoryPillTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={18}
          color="#708090"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search partners..."
          placeholderTextColor="#708090"
          value={searchInput}
          onChangeText={setSearchInput}
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => setSearchInput('')}>
            <Ionicons name="close-circle" size={18} color="#708090" />
          </TouchableOpacity>
        )}
      </View>

      {loadingPartners && (
        <ActivityIndicator
          size="large"
          color="#7FFFD4"
          style={{ marginVertical: 40 }}
        />
      )}
    </>
  );

  const ListEmpty = !loadingPartners ? (
    <View style={styles.emptyState}>
      <Ionicons name="storefront-outline" size={64} color="rgba(112,128,144,0.3)" />
      <Text style={styles.emptyTitle}>No partners found</Text>
      <Text style={styles.emptySubtitle}>
        {debouncedSearch
          ? `No partners match "${debouncedSearch}". Try a different search.`
          : 'No partners available in this category yet.'}
      </Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            tintColor="#7FFFD4"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  listContent: { padding: SCREEN_PADDING, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#708090', marginBottom: 20 },
  poolSelector: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  poolSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  poolSelectorLabel: { color: '#708090', fontSize: 13, fontWeight: '500' },
  poolSelectorRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' },
  poolSelectorName: { color: '#fff', fontSize: 14, fontWeight: '600', maxWidth: 120 },
  poolSelectorBalance: { color: '#7FFFD4', fontSize: 14, fontWeight: '700' },
  poolSelectorEmpty: { color: '#708090', fontSize: 13 },
  poolDropdown: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
    overflow: 'hidden',
  },
  poolOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  poolOptionSelected: { backgroundColor: 'rgba(127,255,212,0.1)' },
  poolOptionName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  poolOptionBalance: { color: '#7FFFD4', fontSize: 14, fontWeight: '600' },
  categoriesContainer: { marginBottom: 16 },
  categoriesContent: { gap: 8, paddingVertical: 4 },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryPillActive: {
    backgroundColor: '#7FFFD4',
    borderColor: '#7FFFD4',
  },
  categoryPillText: { color: '#708090', fontSize: 13, fontWeight: '500' },
  categoryPillTextActive: { color: '#001F3F', fontWeight: '700' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 12 },
  row: { gap: CARD_GAP },
  cardWrapper: { width: CARD_WIDTH, marginBottom: CARD_GAP },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  cardImage: { width: '100%', height: 100 },
  cardImagePlaceholder: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127,255,212,0.05)',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardContent: { padding: 10 },
  cardName: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardDescription: { color: '#708090', fontSize: 11, marginBottom: 8, lineHeight: 16 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(127,255,212,0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  categoryBadgeText: { color: '#7FFFD4', fontSize: 10, fontWeight: '600' },
  shopButton: {
    backgroundColor: '#7FFFD4',
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shopButtonText: { color: '#001F3F', fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: '#708090', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
});

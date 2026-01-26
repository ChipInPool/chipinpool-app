import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function CardsScreen() {
  const { data: pools } = useQuery({
    queryKey: ['pools'],
    queryFn: api.pools.list,
  });

  const poolsWithCards = pools?.filter((pool: any) => pool.virtualCard) || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Virtual Cards</Text>
        <Text style={styles.subtitle}>Spend from your pool funds</Text>

        {poolsWithCards.length > 0 ? (
          poolsWithCards.map((pool: any) => (
            <VirtualCard key={pool.id} pool={pool} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={64} color="#708090" />
            <Text style={styles.emptyTitle}>No Virtual Cards</Text>
            <Text style={styles.emptySubtitle}>
              Virtual cards are created automatically when a pool reaches its funding goal
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function VirtualCard({ pool }: { pool: any }) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => setShowDetails(!showDetails)}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardLogo}>
            <Text style={styles.cardLogoText}>VISA</Text>
          </View>
          <View style={styles.cardChip} />
        </View>
        
        <Text style={styles.cardNumber}>
          {showDetails ? '4242 4242 4242 4242' : '•••• •••• •••• ••••'}
        </Text>
        
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.cardLabel}>Pool</Text>
            <Text style={styles.cardValue}>{pool.name}</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>Balance</Text>
            <Text style={styles.cardValue}>${parseFloat(pool.currentAmount).toLocaleString()}</Text>
          </View>
        </View>
        
        <Text style={styles.tapHint}>Tap to {showDetails ? 'hide' : 'reveal'} details</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 16, color: '#708090', marginTop: 4, marginBottom: 24 },
  card: { 
    borderRadius: 20, 
    padding: 24, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(127, 255, 212, 0.3)',
    shadowColor: '#7FFFD4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  cardLogo: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  cardLogoText: { color: '#fff', fontWeight: 'bold', fontSize: 16, fontStyle: 'italic' },
  cardChip: { width: 40, height: 30, backgroundColor: '#D4AF37', borderRadius: 4 },
  cardNumber: { fontSize: 24, fontWeight: '600', color: '#fff', letterSpacing: 2, marginBottom: 24 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { fontSize: 10, color: '#708090', textTransform: 'uppercase', marginBottom: 4 },
  cardValue: { fontSize: 16, color: '#fff', fontWeight: '500' },
  tapHint: { textAlign: 'center', color: '#708090', fontSize: 12, marginTop: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#fff', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#708090', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
});

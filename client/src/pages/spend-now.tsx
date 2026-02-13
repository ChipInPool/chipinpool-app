import { useState, useMemo, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Search, ExternalLink, Star, Store, Tag, ShoppingBag,
  Laptop, Shirt, Plane, UtensilsCrossed, Film, Home, Heart,
  Dumbbell, GraduationCap, Briefcase, MoreHorizontal,
  Wallet, ArrowRight, Sparkles, Globe
} from "lucide-react";

const categoryIcons: Record<string, any> = {
  electronics: Laptop,
  fashion: Shirt,
  travel: Plane,
  food: UtensilsCrossed,
  entertainment: Film,
  home: Home,
  health: Heart,
  sports: Dumbbell,
  education: GraduationCap,
  services: Briefcase,
  other: MoreHorizontal,
};

const categoryLabels: Record<string, string> = {
  electronics: 'Electronics',
  fashion: 'Fashion',
  travel: 'Travel',
  food: 'Food & Dining',
  entertainment: 'Entertainment',
  home: 'Home & Garden',
  health: 'Health & Wellness',
  sports: 'Sports & Fitness',
  education: 'Education',
  services: 'Services',
  other: 'Other',
};

const fetchPartners = async (category?: string, search?: string) => {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.set('category', category);
  if (search) params.set('search', search);
  const res = await fetch(`/api/partners?${params}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch partners');
  return res.json();
};

const fetchCategories = async () => {
  const res = await fetch('/api/partners/categories', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
};

const fetchPools = async () => {
  const res = await fetch('/api/pools', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch pools');
  return res.json();
};

export default function SpendNow() {
  const { user, isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [poolFromUrl, setPoolFromUrl] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const poolParam = params.get('pool');
    if (poolParam) {
      setSelectedPoolId(poolParam);
      setPoolFromUrl(true);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: partnersData, isLoading: loadingPartners } = useQuery({
    queryKey: ['partners', selectedCategory, debouncedSearch],
    queryFn: () => fetchPartners(selectedCategory, debouncedSearch),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['partnerCategories'],
    queryFn: fetchCategories,
  });

  const { data: poolsData } = useQuery({
    queryKey: ['pools'],
    queryFn: fetchPools,
    enabled: isAuthenticated,
  });

  const availablePools = useMemo(() => {
    if (!poolsData || !user) return [];
    const pools = Array.isArray(poolsData) ? poolsData : poolsData.pools || [];
    return pools.filter((p: any) => parseFloat(p.currentAmount || p.balance || '0') > 0);
  }, [poolsData, user]);

  useEffect(() => {
    if (!selectedPoolId && !poolFromUrl) {
      if (parseFloat(user?.balance || '0') > 0) {
        setSelectedPoolId('wallet');
      } else if (availablePools.length > 0) {
        setSelectedPoolId(String(availablePools[0].id));
      }
    }
  }, [availablePools, selectedPoolId, poolFromUrl, user]);

  const partners = Array.isArray(partnersData) ? partnersData : partnersData?.partners || [];
  const categoryCounts = categoriesData?.categories || {};
  const totalPartners = categoriesData?.total || 0;

  const selectedPool = selectedPoolId === 'wallet' ? null : availablePools.find((p: any) => String(p.id) === selectedPoolId);
  const isWalletSelected = selectedPoolId === 'wallet';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <Layout>
      <div data-testid="page-spend-now" className="space-y-8 pb-12">
        <div className="relative rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 md:p-12 overflow-hidden">
          <div className="absolute top-4 right-4 opacity-10">
            <ShoppingBag className="w-32 h-32" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">ChipInPay Marketplace</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Spend Now</h1>
            <p className="text-lg text-muted-foreground">
              Shop directly with your wallet or pool funds at our partnered stores
            </p>
          </div>
        </div>

        {isAuthenticated && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-card border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="w-4 h-4 text-primary" />
              <span>Spending from:</span>
            </div>
            {(availablePools.length > 0 || parseFloat(user?.balance || '0') > 0) ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
                <Select value={selectedPoolId} onValueChange={setSelectedPoolId}>
                  <SelectTrigger className="w-full sm:w-80" data-testid="select-pool-spend">
                    <SelectValue placeholder="Select a source">
                      {isWalletSelected ? (
                        <span className="flex items-center gap-2">
                          <span className="font-medium">My Wallet</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-primary font-semibold">${parseFloat(user?.balance || '0').toFixed(2)}</span>
                        </span>
                      ) : selectedPool ? (
                        <span className="flex items-center gap-2">
                          <span className="font-medium truncate">{selectedPool.name || selectedPool.title}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-primary font-semibold">${parseFloat(selectedPool.currentAmount || selectedPool.balance || '0').toFixed(2)}</span>
                        </span>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {parseFloat(user?.balance || '0') > 0 && (
                      <SelectItem value="wallet" data-testid="select-wallet-spend">
                        <div className="flex items-center justify-between gap-4 w-full">
                          <span className="font-medium">My Wallet</span>
                          <span className="text-primary font-semibold">${parseFloat(user?.balance || '0').toFixed(2)}</span>
                        </div>
                      </SelectItem>
                    )}
                    {availablePools.map((pool: any) => (
                      <SelectItem key={pool.id} value={String(pool.id)} data-testid={`select-pool-${pool.id}`}>
                        <div className="flex items-center justify-between gap-4 w-full">
                          <span className="font-medium">{pool.name || pool.title}</span>
                          <span className="text-primary font-semibold">${parseFloat(pool.currentAmount || pool.balance || '0').toFixed(2)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(selectedPool || isWalletSelected) && (
                  <Badge variant="secondary" className="whitespace-nowrap text-sm px-3 py-1" data-testid="badge-available-balance">
                    Available: ${isWalletSelected ? parseFloat(user?.balance || '0').toFixed(2) : parseFloat(selectedPool.currentAmount || selectedPool.balance || '0').toFixed(2)}
                  </Badge>
                )}
              </div>
            ) : parseFloat(user?.balance || '0') <= 0 ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">No funds available.</p>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/create">Create a Pool</Link>
                </Button>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-1 px-1">
          <button
            onClick={() => setSelectedCategory('all')}
            data-testid="button-category-all"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Globe className="w-4 h-4" />
            All
            <span className="text-xs opacity-75">({totalPartners})</span>
          </button>
          {Object.keys(categoryLabels).filter(k => k !== 'other').map((cat) => {
            const Icon = categoryIcons[cat] || MoreHorizontal;
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                data-testid={`button-category-${cat}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                {categoryLabels[cat]}
                <span className="text-xs opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search partners by name or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
            data-testid="input-search-partners"
          />
        </div>

        {loadingPartners ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : partners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Store className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No partners found</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {debouncedSearch
                ? `No partners match "${debouncedSearch}". Try a different search term.`
                : 'No partners available in this category yet. Check back soon!'}
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {partners.map((partner: any) => {
              const isFeatured = partner.isFeatured;
              return (
                <motion.div key={partner.id} variants={cardVariants}>
                  <Card
                    data-testid={`card-partner-${partner.id}`}
                    className={`overflow-hidden transition-all hover:shadow-lg group ${
                      isFeatured
                        ? 'ring-2 ring-yellow-500/50 border-yellow-500/30'
                        : 'border'
                    }`}
                  >
                    <div className="relative h-40 overflow-hidden">
                      {partner.bannerImage ? (
                        <img
                          src={partner.bannerImage}
                          alt={partner.companyName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-muted flex items-center justify-center">
                          <Store className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                      {isFeatured && (
                        <div
                          data-testid={`badge-featured-${partner.id}`}
                          className="absolute top-3 left-3 bg-yellow-500 text-yellow-950 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg"
                        >
                          <Star className="w-3 h-3 fill-current" />
                          Featured
                        </div>
                      )}
                      {partner.discountPercent > 0 && (
                        <Badge
                          data-testid={`badge-discount-${partner.id}`}
                          className="absolute top-3 right-3 bg-green-500 hover:bg-green-500 text-white shadow-lg"
                        >
                          {partner.discountPercent}% OFF
                        </Badge>
                      )}
                      {partner.logo && (
                        <div className="absolute -bottom-5 left-4">
                          <img
                            src={partner.logo}
                            alt=""
                            className="w-10 h-10 rounded-lg border-2 border-card bg-card object-cover shadow-md"
                          />
                        </div>
                      )}
                    </div>

                    <CardContent className={`p-4 ${partner.logo ? 'pt-7' : 'pt-4'}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3
                          data-testid={`text-partner-name-${partner.id}`}
                          className="font-bold text-base line-clamp-1"
                        >
                          {partner.companyName}
                        </h3>
                        {partner.partnerCategory && (
                          <Badge variant="secondary" className="text-xs whitespace-nowrap capitalize">
                            {categoryLabels[partner.partnerCategory] || partner.partnerCategory}
                          </Badge>
                        )}
                      </div>

                      <p
                        data-testid={`text-partner-description-${partner.id}`}
                        className="text-sm text-muted-foreground line-clamp-2 mb-3"
                      >
                        {partner.shortDescription || partner.description}
                      </p>

                      {partner.promoText && (
                        <div
                          data-testid={`text-promo-${partner.id}`}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm mb-3"
                        >
                          <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="line-clamp-1 font-medium">{partner.promoText}</span>
                        </div>
                      )}

                      <Button
                        data-testid={`button-shop-now-${partner.id}`}
                        className="w-full"
                        asChild
                      >
                        <a
                          href={partner.partnerShopUrl || partner.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Shop Now
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <div className="mt-12 rounded-2xl bg-card border p-8 md:p-12">
          <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Wallet className="w-7 h-7 text-primary" />
              </div>
              <div className="text-sm font-bold text-primary mb-1">Step 1</div>
              <h3 className="font-semibold mb-2">Select Your Pool</h3>
              <p className="text-sm text-muted-foreground">
                Choose which pool you'd like to spend from using the selector above.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Store className="w-7 h-7 text-primary" />
              </div>
              <div className="text-sm font-bold text-primary mb-1">Step 2</div>
              <h3 className="font-semibold mb-2">Browse Partner Stores</h3>
              <p className="text-sm text-muted-foreground">
                Explore our curated list of partner merchants offering exclusive deals.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ShoppingBag className="w-7 h-7 text-primary" />
              </div>
              <div className="text-sm font-bold text-primary mb-1">Step 3</div>
              <h3 className="font-semibold mb-2">Shop & Pay with ChipInPay</h3>
              <p className="text-sm text-muted-foreground">
                Use ChipInPay at checkout to pay directly from your pool funds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

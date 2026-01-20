export interface User {
  id: string;
  name: string;
  avatar: string;
  badges?: Badge[];
  stats?: {
    poolsCreated: number;
    totalContributed: number;
    rating: number;
  };
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Comment {
  id: string;
  userId: string;
  user: User;
  text: string;
  timestamp: string;
  likes: number;
}

export interface Notification {
  id: string;
  type: 'contribution' | 'comment' | 'goal_reached' | 'friend_request';
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
}

export interface Contributor {
  user: User;
  amount: number;
  date: string;
}

export interface Pool {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  category: 'Trip' | 'Gift' | 'Purchase' | 'Event' | 'Other' | 'Recurring';
  creator: User;
  deadline: string;
  status: 'active' | 'completed' | 'expired';
  contributors: Contributor[];
  image?: string;
  comments: Comment[];
  isRecurring?: boolean;
  frequency?: 'monthly' | 'weekly';
}

export const BADGES: Record<string, Badge> = {
  EARLY_ADOPTER: { id: 'b1', name: 'Early Adopter', icon: '🚀', color: 'bg-purple-500/20 text-purple-400' },
  TOP_CONTRIBUTOR: { id: 'b2', name: 'Top Contributor', icon: '💎', color: 'bg-blue-500/20 text-blue-400' },
  POOL_MASTER: { id: 'b3', name: 'Pool Master', icon: '👑', color: 'bg-yellow-500/20 text-yellow-400' },
};

export const CURRENT_USER: User = {
  id: 'u1',
  name: 'Alex Rivera',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
  badges: [BADGES.EARLY_ADOPTER, BADGES.POOL_MASTER],
  stats: { poolsCreated: 12, totalContributed: 3450, rating: 4.9 }
};

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'contribution', title: 'New Contribution', message: 'Jordan Lee chipped in $150 to Sarah\'s Birthday', time: '2m ago', read: false, link: '/pool/p1' },
  { id: 'n2', type: 'comment', title: 'New Comment', message: 'Casey Smith commented: "Can\'t wait for this!"', time: '1h ago', read: false, link: '/pool/p1' },
  { id: 'n3', type: 'goal_reached', title: 'Goal Reached! 🎉', message: 'Office PS5 pool has been fully funded!', time: '1d ago', read: true, link: '/pool/p3' },
];

export const MOCK_POOLS: Pool[] = [
  {
    id: 'p1',
    title: 'Sarah\'s 30th Birthday Gift',
    description: 'Pooling together to get Sarah that espresso machine she\'s been eyeing forever! ☕️',
    targetAmount: 800,
    currentAmount: 650,
    category: 'Gift',
    creator: CURRENT_USER,
    deadline: '2025-05-15',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80',
    comments: [
      { id: 'c1', userId: 'u2', user: { id: 'u2', name: 'Jordan Lee', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100' }, text: 'Happy to chip in! She is going to love this.', timestamp: '2h ago', likes: 3 },
      { id: 'c2', userId: 'u3', user: { id: 'u3', name: 'Casey Smith', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }, text: 'Does anyone know which model specifically?', timestamp: '1h ago', likes: 1 },
    ],
    contributors: [
      { user: CURRENT_USER, amount: 200, date: '2025-05-01' },
      { user: { id: 'u2', name: 'Jordan Lee', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100', badges: [BADGES.TOP_CONTRIBUTOR] }, amount: 150, date: '2025-05-02' },
      { user: { id: 'u3', name: 'Casey Smith', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }, amount: 300, date: '2025-05-03' },
    ]
  },
  {
    id: 'p2',
    title: 'Group Trip to Bali 🌴',
    description: 'Villa deposit for the summer retreat. Let\'s lock this in!',
    targetAmount: 2500,
    currentAmount: 1200,
    category: 'Trip',
    creator: { id: 'u2', name: 'Jordan Lee', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100', badges: [BADGES.TOP_CONTRIBUTOR] },
    deadline: '2025-06-01',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
    comments: [],
    contributors: [
      { user: CURRENT_USER, amount: 500, date: '2025-04-20' },
      { user: { id: 'u2', name: 'Jordan Lee', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100', badges: [BADGES.TOP_CONTRIBUTOR] }, amount: 700, date: '2025-04-21' },
    ]
  },
  {
    id: 'p3',
    title: 'Office PS5',
    description: 'For the break room. FIFA tournaments incoming. 🎮',
    targetAmount: 500,
    currentAmount: 500,
    category: 'Purchase',
    creator: { id: 'u4', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100' },
    deadline: '2025-04-10',
    status: 'completed',
    comments: [],
    contributors: [
      { user: CURRENT_USER, amount: 50, date: '2025-04-01' },
      { user: { id: 'u4', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100' }, amount: 100, date: '2025-04-01' },
      { user: { id: 'u5', name: 'Sarah Jones', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100' }, amount: 350, date: '2025-04-05' },
    ]
  },
  {
    id: 'p4',
    title: 'Monthly Rent - Apt 4B',
    description: 'March rent split for the squad.',
    targetAmount: 3200,
    currentAmount: 800,
    category: 'Recurring',
    isRecurring: true,
    frequency: 'monthly',
    creator: CURRENT_USER,
    deadline: '2025-03-01',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    comments: [],
    contributors: [
       { user: CURRENT_USER, amount: 800, date: '2025-02-25' }
    ]
  }
];

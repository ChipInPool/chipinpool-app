export interface User {
  id: string;
  name: string;
  avatar: string;
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
  category: 'Trip' | 'Gift' | 'Purchase' | 'Event' | 'Other';
  creator: User;
  deadline: string;
  status: 'active' | 'completed' | 'expired';
  contributors: Contributor[];
  image?: string;
}

export const CURRENT_USER: User = {
  id: 'u1',
  name: 'Alex Rivera',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
};

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
    contributors: [
      { user: CURRENT_USER, amount: 200, date: '2025-05-01' },
      { user: { id: 'u2', name: 'Jordan Lee', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100' }, amount: 150, date: '2025-05-02' },
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
    creator: { id: 'u2', name: 'Jordan Lee', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100' },
    deadline: '2025-06-01',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
    contributors: [
      { user: CURRENT_USER, amount: 500, date: '2025-04-20' },
      { user: { id: 'u2', name: 'Jordan Lee', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100' }, amount: 700, date: '2025-04-21' },
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
    contributors: [
      { user: CURRENT_USER, amount: 50, date: '2025-04-01' },
      { user: { id: 'u4', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100' }, amount: 100, date: '2025-04-01' },
      { user: { id: 'u5', name: 'Sarah Jones', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100' }, amount: 350, date: '2025-04-05' },
    ]
  }
];

import { storage } from "./storage";

export async function checkAndAwardBadges(userId: string) {
  const user = await storage.getUser(userId);
  if (!user) return;

  const userContributions = await storage.getUserContributions(userId);
  const userPools = await storage.getPoolsByContributor(userId);
  const allBadges = await storage.getAllBadges();

  for (const badge of allBadges) {
    const hasAlready = await storage.hasBadge(userId, badge.id);
    if (hasAlready) continue;

    const shouldAward = await checkBadgeCriteria(userId, badge, user, userContributions, userPools);
    if (shouldAward) {
      await storage.awardBadge(userId, badge.id);
      
      await storage.createNotification({
        userId,
        type: 'goal_reached',
        title: 'New Badge Earned! 🏆',
        message: `You earned the "${badge.name}" badge! +${badge.pointsAwarded} points`,
        link: '/rewards',
      });
    }
  }
}

async function checkBadgeCriteria(
  userId: string,
  badge: any,
  user: any,
  contributions: any[],
  pools: any[]
): Promise<boolean> {
  const { criteria, threshold } = badge;

  switch (criteria) {
    case 'first_contribution':
      return contributions.length >= 1;

    case 'total_contributed_100':
      return parseFloat(user.totalContributed) >= 100;

    case 'total_contributed_500':
      return parseFloat(user.totalContributed) >= 500;

    case 'total_contributed_1000':
      return parseFloat(user.totalContributed) >= 1000;

    case 'first_pool':
      return pools.filter(p => p.creatorId === userId).length >= 1;

    case 'pools_created_5':
      return pools.filter(p => p.creatorId === userId).length >= 5;

    case 'pools_created_10':
      return pools.filter(p => p.creatorId === userId).length >= 10;

    case 'pool_completed': {
      const completedPools = pools.filter(p => p.creatorId === userId && p.status === 'completed');
      return completedPools.length >= 1;
    }

    case 'following_10': {
      const following = await storage.getFollowing(userId);
      return following.length >= 10;
    }

    case 'followers_10': {
      const followers = await storage.getFollowers(userId);
      return followers.length >= 10;
    }

    case 'streak_3': {
      const points = await storage.getUserPoints(userId);
      return points ? points.currentStreak >= 3 : false;
    }

    case 'streak_7': {
      const points = await storage.getUserPoints(userId);
      return points ? points.currentStreak >= 7 : false;
    }

    case 'streak_30': {
      const points = await storage.getUserPoints(userId);
      return points ? points.currentStreak >= 30 : false;
    }

    case 'kyc_verified':
      return user.kycStatus === 'verified';

    case 'early_adopter':
      return false;

    default:
      return false;
  }
}

export async function awardContributionPoints(userId: string, amount: string) {
  const points = Math.floor(parseFloat(amount));
  await storage.addPoints(userId, points, `Contributed $${amount}`, 'contribution');
  
  await checkAndAwardBadges(userId);
}

export async function awardPoolCreationPoints(userId: string, poolId: string) {
  await storage.addPoints(userId, 25, 'Created a new pool', 'pool', poolId);
  
  await checkAndAwardBadges(userId);
}

export async function awardPoolCompletionPoints(userId: string, poolId: string, poolTitle: string) {
  await storage.addPoints(userId, 100, `Pool "${poolTitle}" completed!`, 'pool_completion', poolId);
  
  await checkAndAwardBadges(userId);
}

export async function checkKYCBadge(userId: string) {
  await checkAndAwardBadges(userId);
}

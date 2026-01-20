import { db } from "./db";
import { users, pools, contributions, comments, badges, userBadges } from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Create badges
  const badgesData = [
    { name: "Early Adopter", icon: "🚀", color: "bg-purple-500/20 text-purple-400", description: "Joined in early 2024" },
    { name: "Top Contributor", icon: "💎", color: "bg-blue-500/20 text-blue-400", description: "Contributed over $1000" },
    { name: "Pool Master", icon: "👑", color: "bg-yellow-500/20 text-yellow-400", description: "Created 10+ pools" },
  ];

  const createdBadges = await db.insert(badges).values(badgesData).returning();
  console.log(`Created ${createdBadges.length} badges`);

  // Create demo user
  const hashedPassword = await bcrypt.hash("password123", 10);
  const [demoUser] = await db
    .insert(users)
    .values({
      name: "Alex Rivera",
      email: "demo@chipin.com",
      password: hashedPassword,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces",
      location: "San Francisco, CA",
      bio: "Love pooling with friends!",
      balance: "1240.50",
      poolsCreated: 3,
      totalContributed: "750.00",
      rating: "4.9",
    })
    .returning();

  console.log("Created demo user:", demoUser.email);

  // Assign badges to demo user
  await db.insert(userBadges).values([
    { userId: demoUser.id, badgeId: createdBadges[0].id },
    { userId: demoUser.id, badgeId: createdBadges[2].id },
  ]);

  // Create additional users
  const additionalUsers = await Promise.all([
    db.insert(users).values({
      name: "Jordan Lee",
      email: "jordan@example.com",
      password: hashedPassword,
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100",
      balance: "500.00",
    }).returning(),
    db.insert(users).values({
      name: "Casey Smith",
      email: "casey@example.com",
      password: hashedPassword,
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
      balance: "800.00",
    }).returning(),
    db.insert(users).values({
      name: "Mike Chen",
      email: "mike@example.com",
      password: hashedPassword,
      avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100",
      balance: "300.00",
    }).returning(),
  ]);

  const jordan = additionalUsers[0][0];
  const casey = additionalUsers[1][0];
  const mike = additionalUsers[2][0];

  console.log("Created additional users");

  // Create demo pools
  const [pool1] = await db
    .insert(pools)
    .values({
      title: "Sarah's 30th Birthday Gift",
      description: "Pooling together to get Sarah that espresso machine she's been eyeing forever! ☕️",
      targetAmount: "800",
      currentAmount: "650",
      category: "Gift",
      creatorId: demoUser.id,
      deadline: new Date("2025-05-15"),
      status: "active",
      image: "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80",
    })
    .returning();

  const [pool2] = await db
    .insert(pools)
    .values({
      title: "Group Trip to Bali 🌴",
      description: "Villa deposit for the summer retreat. Let's lock this in!",
      targetAmount: "2500",
      currentAmount: "1200",
      category: "Trip",
      creatorId: jordan.id,
      deadline: new Date("2025-06-01"),
      status: "active",
      image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
    })
    .returning();

  const [pool3] = await db
    .insert(pools)
    .values({
      title: "Office PS5",
      description: "For the break room. FIFA tournaments incoming. 🎮",
      targetAmount: "500",
      currentAmount: "500",
      category: "Purchase",
      creatorId: mike.id,
      deadline: new Date("2025-04-10"),
      status: "completed",
    })
    .returning();

  console.log("Created demo pools");

  // Create contributions
  await db.insert(contributions).values([
    { poolId: pool1.id, userId: demoUser.id, amount: "200" },
    { poolId: pool1.id, userId: jordan.id, amount: "150" },
    { poolId: pool1.id, userId: casey.id, amount: "300" },
    { poolId: pool2.id, userId: demoUser.id, amount: "500" },
    { poolId: pool2.id, userId: jordan.id, amount: "700" },
    { poolId: pool3.id, userId: demoUser.id, amount: "50" },
    { poolId: pool3.id, userId: mike.id, amount: "100" },
    { poolId: pool3.id, userId: casey.id, amount: "350" },
  ]);

  console.log("Created contributions");

  // Create comments
  await db.insert(comments).values([
    { poolId: pool1.id, userId: jordan.id, text: "Happy to chip in! She is going to love this.", likes: 3 },
    { poolId: pool1.id, userId: casey.id, text: "Does anyone know which model specifically?", likes: 1 },
  ]);

  console.log("Created comments");
  console.log("✅ Seeding complete!");
  console.log("\nDemo credentials:");
  console.log("Email: demo@chipin.com");
  console.log("Password: password123");
}

seed()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

import { config } from "dotenv";
import { db } from "./index";
import { plansTable } from "./schema";

// Load environment variables
config({ path: ".env.local" });

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Insert credit-based subscription plans
    await db.insert(plansTable).values([
      // Basic Plans
      {
        id: "basic_monthly",
        name: "Basic Monthly",
        description: "Perfect for individual creators getting started",
        price_usd: "24.99",
        price_inr: "2400.00",
        interval: "month",
        monthly_credits: 1000,
        idea_cost: 1,
        script_cost: 2,
        audio_cost: 2,
        image_cost: 5,
        video_cost: 5,
        thumbnail_cost: 2,
        metadata_cost: 2,
        export_quality: "720P",
        features: JSON.stringify([
          "1000 credits per month",
          "720P export quality",
          "Basic AI voices",
          "Standard support",
          "All core features"
        ]),
        max_users: 1,
        max_projects: 50,
        storage_limit_gb: 10,
        api_calls_limit: 10000,
        is_popular: false,
        is_active: true,
      },
      {
        id: "basic_yearly",
        name: "Basic Yearly",
        description: "Best value for consistent creators",
        price_usd: "99.00",
        price_inr: "9999.00",
        interval: "year",
        monthly_credits: 1200,
        idea_cost: 1,
        script_cost: 2,
        audio_cost: 2,
        image_cost: 3,
        video_cost: 3,
        thumbnail_cost: 2,
        metadata_cost: 2,
        export_quality: "4K",
        features: JSON.stringify([
          "1200 credits per month",
          "4K export quality",
          "Premium AI voices",
          "Priority support",
          "All core features",
          "Save 67% vs monthly"
        ]),
        max_users: 1,
        max_projects: 100,
        storage_limit_gb: 25,
        api_calls_limit: 25000,
        is_popular: true,
        is_active: true,
      },
      
      // Pro Plans
      {
        id: "pro_monthly",
        name: "Pro Monthly",
        description: "For serious content creators and growing channels",
        price_usd: "49.99",
        price_inr: "4999.00",
        interval: "month",
        monthly_credits: 3000,
        idea_cost: 1,
        script_cost: 1,
        audio_cost: 1,
        image_cost: 3,
        video_cost: 3,
        thumbnail_cost: 1,
        metadata_cost: 1,
        export_quality: "4K",
        features: JSON.stringify([
          "3000 credits per month",
          "4K export quality",
          "Premium AI voices",
          "Advanced analytics",
          "Priority support",
          "Team collaboration",
          "Custom thumbnails"
        ]),
        max_users: 3,
        max_projects: 200,
        storage_limit_gb: 50,
        api_calls_limit: 50000,
        is_popular: false,
        is_active: true,
      },
      {
        id: "pro_yearly",
        name: "Pro Yearly",
        description: "Professional creators annual plan",
        price_usd: "199.00",
        price_inr: "19999.00",
        interval: "year",
        monthly_credits: 3600,
        idea_cost: 1,
        script_cost: 1,
        audio_cost: 1,
        image_cost: 2,
        video_cost: 2,
        thumbnail_cost: 1,
        metadata_cost: 1,
        export_quality: "8K",
        features: JSON.stringify([
          "3600 credits per month",
          "8K export quality",
          "Premium AI voices",
          "Advanced analytics",
          "Priority support",
          "Team collaboration",
          "Custom thumbnails",
          "Save 60% vs monthly"
        ]),
        max_users: 5,
        max_projects: 500,
        storage_limit_gb: 100,
        api_calls_limit: 100000,
        is_popular: true,
        is_active: true,
      },
      
      // Enterprise Plans
      {
        id: "enterprise_monthly",
        name: "Enterprise Monthly",
        description: "For agencies and high-volume creators",
        price_usd: "149.99",
        price_inr: "14999.00",
        interval: "month",
        monthly_credits: 10000,
        idea_cost: 1,
        script_cost: 1,
        audio_cost: 1,
        image_cost: 2,
        video_cost: 2,
        thumbnail_cost: 1,
        metadata_cost: 1,
        export_quality: "8K",
        features: JSON.stringify([
          "10000 credits per month",
          "8K export quality",
          "Custom AI voice cloning",
          "White-label solution",
          "API access",
          "Bulk video generation",
          "Dedicated account manager",
          "24/7 priority support"
        ]),
        max_users: 25,
        max_projects: null, // unlimited
        storage_limit_gb: 500,
        api_calls_limit: 500000,
        is_popular: false,
        is_active: true,
      },
      {
        id: "enterprise_yearly",
        name: "Enterprise Yearly",
        description: "Ultimate plan for large organizations",
        price_usd: "599.00",
        price_inr: "59999.00",
        interval: "year",
        monthly_credits: 12000,
        idea_cost: 1,
        script_cost: 1,
        audio_cost: 1,
        image_cost: 1,
        video_cost: 1,
        thumbnail_cost: 1,
        metadata_cost: 1,
        export_quality: "8K",
        features: JSON.stringify([
          "12000 credits per month",
          "8K export quality",
          "Custom AI voice cloning",
          "White-label solution",
          "API access",
          "Bulk video generation",
          "Dedicated account manager",
          "24/7 priority support",
          "Custom integrations",
          "Save 50% vs monthly"
        ]),
        max_users: null, // unlimited
        max_projects: null, // unlimited
        storage_limit_gb: 1000,
        api_calls_limit: 1000000,
        is_popular: false,
        is_active: true,
      }
    ]).onConflictDoNothing();

    console.log("✅ Database seeded successfully!");
    console.log("📋 Created credit-based subscription plans:");
    console.log("  Basic Plans:");
    console.log("    - Basic Monthly: $24.99/₹2400 (1000 credits)");
    console.log("    - Basic Yearly: $99/₹9999 (1200 credits/month)");
    console.log("  Pro Plans:");
    console.log("    - Pro Monthly: $49.99/₹4999 (3000 credits)");
    console.log("    - Pro Yearly: $199/₹19999 (3600 credits/month)");
    console.log("  Enterprise Plans:");
    console.log("    - Enterprise Monthly: $149.99/₹14999 (10000 credits)");
    console.log("    - Enterprise Yearly: $599/₹59999 (12000 credits/month)");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the seed function
seed()
  .then(() => {
    console.log("🎉 Seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Seeding failed:", error);
    process.exit(1);
  });

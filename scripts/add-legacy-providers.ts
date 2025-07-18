import { db } from "../src/db";
import { paymentProvidersConfigTable } from "../src/db/schema";

async function addLegacyProviders() {
  console.log("🔧 Adding Stripe and Lemon Squeezy as disabled providers...");

  try {
    // Add Stripe (disabled)
    await db.insert(paymentProvidersConfigTable).values({
      id: "stripe",
      name: "Stripe",
      is_enabled: false,
      display_name: "Stripe",
      icon_url: null,
      priority: 1,
    }).onConflictDoUpdate({
      target: paymentProvidersConfigTable.id,
      set: {
        name: "Stripe",
        is_enabled: false,
        display_name: "Stripe",
        priority: 1,
        updated_at: new Date(),
      }
    });

    // Add Lemon Squeezy (disabled)
    await db.insert(paymentProvidersConfigTable).values({
      id: "lemonsqueezy",
      name: "Lemon Squeezy",
      is_enabled: false,
      display_name: "Lemon Squeezy",
      icon_url: null,
      priority: 2,
    }).onConflictDoUpdate({
      target: paymentProvidersConfigTable.id,
      set: {
        name: "Lemon Squeezy",
        is_enabled: false,
        display_name: "Lemon Squeezy",
        priority: 2,
        updated_at: new Date(),
      }
    });

    console.log("✅ Legacy payment providers added successfully!");
    console.log("📋 Current provider status:");
    console.log("  - Stripe: DISABLED");
    console.log("  - Lemon Squeezy: DISABLED");
    console.log("  - Razorpay: ENABLED");

  } catch (error) {
    console.error("❌ Error adding legacy providers:", error);
    throw error;
  }
}

addLegacyProviders()
  .then(() => {
    console.log("🎉 Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });

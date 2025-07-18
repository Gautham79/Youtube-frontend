import { db } from "@/db";
import { usersTable, plansTable, subscriptionsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";

export class UserService {
  /**
   * Sync a Supabase Auth user with our custom database
   */
  static async syncUser(authUser: User) {
    try {
      // Check if user already exists in our database by ID
      const existingUserById = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, authUser.id))
        .limit(1);

      // Check if user already exists by email
      const existingUserByEmail = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, authUser.email!))
        .limit(1);

      if (existingUserById.length === 0 && existingUserByEmail.length === 0) {
        // Create new user in our database
        await db.insert(usersTable).values({
          id: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
          avatar_url: authUser.user_metadata?.avatar_url || null,
          last_sign_in: new Date(),
          metadata: JSON.stringify(authUser.user_metadata || {}),
        });

        // Create a free subscription for new users
        await this.createFreeSubscription(authUser.id);
      } else if (existingUserById.length > 0) {
        // Update existing user by ID
        await db
          .update(usersTable)
          .set({
            last_sign_in: new Date(),
            name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || existingUserById[0].name,
            avatar_url: authUser.user_metadata?.avatar_url || existingUserById[0].avatar_url,
            metadata: JSON.stringify(authUser.user_metadata || {}),
          })
          .where(eq(usersTable.id, authUser.id));
      } else if (existingUserByEmail.length > 0) {
        // User exists with same email but different ID
        // Don't update the ID due to foreign key constraints, just update other fields
        await db
          .update(usersTable)
          .set({
            last_sign_in: new Date(),
            name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || existingUserByEmail[0].name,
            avatar_url: authUser.user_metadata?.avatar_url || existingUserByEmail[0].avatar_url,
            metadata: JSON.stringify(authUser.user_metadata || {}),
          })
          .where(eq(usersTable.email, authUser.email!));
      }

      return true;
    } catch (error) {
      console.error("Error syncing user:", error);
      // If it's still a duplicate key error, just log it and continue
      if (error instanceof Error && error.message.includes('duplicate key')) {
        console.log("User already exists, continuing...");
        return true;
      }
      return false;
    }
  }

  /**
   * Create a free subscription for a new user
   */
  static async createFreeSubscription(userId: string) {
    try {
      // Check if free plan exists
      const freePlan = await db
        .select()
        .from(plansTable)
        .where(eq(plansTable.id, "free"))
        .limit(1);

      if (freePlan.length === 0) {
        console.error("Free plan not found in database");
        return false;
      }

      // Create subscription
      const subscriptionId = `free_${userId}_${Date.now()}`;
      const now = new Date();
      const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      await db.insert(subscriptionsTable).values({
        id: subscriptionId,
        user_id: userId,
        plan_id: "free",
        status: "active",
        provider: "stripe", // Default provider
        provider_subscription_id: subscriptionId,
        current_period_start: now,
        current_period_end: oneYearFromNow, // Free plan lasts 1 year
      });

      return true;
    } catch (error) {
      console.error("Error creating free subscription:", error);
      return false;
    }
  }

  /**
   * Get user with their current subscription
   */
  static async getUserWithSubscription(userId: string) {
    try {
      const result = await db
        .select({
          user: usersTable,
          subscription: subscriptionsTable,
          plan: plansTable,
        })
        .from(usersTable)
        .leftJoin(subscriptionsTable, eq(usersTable.id, subscriptionsTable.user_id))
        .leftJoin(plansTable, eq(subscriptionsTable.plan_id, plansTable.id))
        .where(eq(usersTable.id, userId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error("Error getting user with subscription:", error);
      return null;
    }
  }

  /**
   * Check if user has access to a specific feature
   */
  static async hasFeatureAccess(userId: string, featureKey: string): Promise<boolean> {
    try {
      const userWithSub = await this.getUserWithSubscription(userId);
      
      if (!userWithSub || !userWithSub.plan) {
        return false;
      }

      const plan = userWithSub.plan;
      const features = plan.features ? JSON.parse(plan.features) : [];
      
      // Check if feature is included in the plan
      return features.includes(featureKey);
    } catch (error) {
      console.error("Error checking feature access:", error);
      return false;
    }
  }

  /**
   * Get user's current plan limits
   */
  static async getUserLimits(userId: string) {
    try {
      const userWithSub = await this.getUserWithSubscription(userId);
      
      if (!userWithSub || !userWithSub.plan) {
        return null;
      }

      return {
        maxUsers: userWithSub.plan.max_users,
        maxProjects: userWithSub.plan.max_projects,
        storageLimit: userWithSub.plan.storage_limit_gb,
        apiCallsLimit: userWithSub.plan.api_calls_limit,
      };
    } catch (error) {
      console.error("Error getting user limits:", error);
      return null;
    }
  }
}

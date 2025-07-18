import { NextResponse } from "next/server";
import { verifyWebhookSignature, fetchPayment } from "@/utils/razorpay";
import { db } from "@/db";
import { 
  subscriptionsTable, 
  paymentsTable, 
  userCreditsTable,
  webhooksTable,
  usersTable,
  plansTable
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    const eventType = event.event;
    const eventId = event.payload?.payment?.entity?.id || event.payload?.subscription?.entity?.id || `event_${Date.now()}`;

    // Log webhook event
    await db.insert(webhooksTable).values({
      provider: "razorpay",
      event_type: eventType,
      event_id: eventId,
      data: body,
      processed: false,
    });

    // Handle different event types
    switch (eventType) {
      case "payment.captured":
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      
      case "payment.failed":
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      
      case "subscription.activated":
        await handleSubscriptionActivated(event.payload.subscription.entity);
        break;
      
      case "subscription.cancelled":
        await handleSubscriptionCancelled(event.payload.subscription.entity);
        break;
      
      case "subscription.charged":
        await handleSubscriptionCharged(event.payload.payment.entity);
        break;
      
      default:
        console.log(`Unhandled Razorpay event type: ${eventType}`);
    }

    // Mark webhook as processed
    await db
      .update(webhooksTable)
      .set({ 
        processed: true, 
        processed_at: new Date() 
      })
      .where(eq(webhooksTable.event_id, eventId));

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handlePaymentCaptured(payment: any) {
  try {
    // Extract plan information from payment notes
    const planId = payment.notes?.plan_id;
    if (!planId) {
      console.error("No plan ID found in payment notes");
      return;
    }

    // Get plan details
    const plan = await db
      .select()
      .from(plansTable)
      .where(eq(plansTable.id, planId))
      .limit(1);

    if (!plan.length) {
      console.error(`Plan not found: ${planId}`);
      return;
    }

    const planData = plan[0];

    // Record payment
    await db.insert(paymentsTable).values({
      id: payment.id,
      user_id: payment.notes?.user_id, // You'll need to pass this in the order creation
      provider: "razorpay",
      provider_payment_id: payment.id,
      amount: (payment.amount / 100).toString(), // Convert from paise to rupees
      currency: payment.currency,
      status: "succeeded",
      description: `Payment for ${planData.name}`,
    });

    // If this is a one-time payment, create a subscription record
    if (payment.notes?.user_id) {
      const userId = payment.notes.user_id;
      
      // Calculate subscription period
      const currentDate = new Date();
      const periodEnd = new Date(currentDate);
      
      if (planData.interval === "month") {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else if (planData.interval === "year") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      // Create subscription record
      await db.insert(subscriptionsTable).values({
        id: `razorpay_${payment.id}`,
        user_id: userId,
        plan_id: planId,
        status: "active",
        provider: "razorpay",
        provider_subscription_id: payment.id,
        current_period_start: currentDate,
        current_period_end: periodEnd,
      });

      // Allocate credits to user
      await allocateCreditsToUser(userId, planData);
    }

    console.log(`Payment captured successfully: ${payment.id}`);
  } catch (error) {
    console.error("Error handling payment captured:", error);
  }
}

async function handlePaymentFailed(payment: any) {
  try {
    // Record failed payment
    await db.insert(paymentsTable).values({
      id: payment.id,
      user_id: payment.notes?.user_id,
      provider: "razorpay",
      provider_payment_id: payment.id,
      amount: (payment.amount / 100).toString(),
      currency: payment.currency,
      status: "failed",
      description: `Failed payment for ${payment.notes?.plan_name || "subscription"}`,
      failure_reason: payment.error_description || "Payment failed",
    });

    console.log(`Payment failed: ${payment.id}`);
  } catch (error) {
    console.error("Error handling payment failed:", error);
  }
}

async function handleSubscriptionActivated(subscription: any) {
  try {
    // Update subscription status
    await db
      .update(subscriptionsTable)
      .set({ 
        status: "active",
        updated_at: new Date()
      })
      .where(eq(subscriptionsTable.provider_subscription_id, subscription.id));

    console.log(`Subscription activated: ${subscription.id}`);
  } catch (error) {
    console.error("Error handling subscription activated:", error);
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  try {
    // Update subscription status
    await db
      .update(subscriptionsTable)
      .set({ 
        status: "canceled",
        canceled_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(subscriptionsTable.provider_subscription_id, subscription.id));

    console.log(`Subscription cancelled: ${subscription.id}`);
  } catch (error) {
    console.error("Error handling subscription cancelled:", error);
  }
}

async function handleSubscriptionCharged(payment: any) {
  try {
    // Record recurring payment
    await db.insert(paymentsTable).values({
      id: payment.id,
      user_id: payment.notes?.user_id,
      provider: "razorpay",
      provider_payment_id: payment.id,
      amount: (payment.amount / 100).toString(),
      currency: payment.currency,
      status: "succeeded",
      description: `Recurring payment for subscription`,
    });

    // Refresh user credits for the new billing period
    if (payment.notes?.user_id && payment.notes?.plan_id) {
      const plan = await db
        .select()
        .from(plansTable)
        .where(eq(plansTable.id, payment.notes.plan_id))
        .limit(1);

      if (plan.length) {
        await allocateCreditsToUser(payment.notes.user_id, plan[0]);
      }
    }

    console.log(`Subscription charged: ${payment.id}`);
  } catch (error) {
    console.error("Error handling subscription charged:", error);
  }
}

async function allocateCreditsToUser(userId: string, plan: any) {
  try {
    // Calculate next refresh date
    const nextRefreshDate = new Date();
    if (plan.interval === "month") {
      nextRefreshDate.setMonth(nextRefreshDate.getMonth() + 1);
    } else if (plan.interval === "year") {
      nextRefreshDate.setFullYear(nextRefreshDate.getFullYear() + 1);
    }

    // Update or insert user credits
    const existingCredits = await db
      .select()
      .from(userCreditsTable)
      .where(eq(userCreditsTable.user_id, userId))
      .limit(1);

    if (existingCredits.length) {
      // Update existing credits
      await db
        .update(userCreditsTable)
        .set({
          plan_id: plan.id,
          current_balance: plan.monthly_credits,
          total_allocated: plan.monthly_credits,
          last_refresh_date: new Date(),
          next_refresh_date: nextRefreshDate,
          updated_at: new Date(),
        })
        .where(eq(userCreditsTable.user_id, userId));
    } else {
      // Insert new credits record
      await db.insert(userCreditsTable).values({
        user_id: userId,
        plan_id: plan.id,
        current_balance: plan.monthly_credits,
        total_allocated: plan.monthly_credits,
        last_refresh_date: new Date(),
        next_refresh_date: nextRefreshDate,
      });
    }

    console.log(`Credits allocated to user ${userId}: ${plan.monthly_credits}`);
  } catch (error) {
    console.error("Error allocating credits:", error);
  }
}

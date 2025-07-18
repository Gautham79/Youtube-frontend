import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/utils/stripe";
import { db } from "@/db";
import { usersTable, subscriptionsTable, paymentsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  // Check if Stripe is enabled
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not enabled" },
      { status: 503 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("Checkout session completed:", session.id);
        
        // Handle successful payment
        if (session.customer_email) {
          const user = await db.select().from(usersTable).where(eq(usersTable.email, session.customer_email)).limit(1);
          
          if (user.length > 0) {
            // Create subscription record
            await db.insert(subscriptionsTable).values({
              id: session.subscription as string,
              user_id: user[0].id,
              plan_id: "basic_monthly", // You'll need to determine this from the session
              status: "active",
              provider: "stripe",
              provider_subscription_id: session.subscription as string,
              provider_customer_id: session.customer as string,
              current_period_start: new Date(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            });

            // Create payment record
            await db.insert(paymentsTable).values({
              id: session.payment_intent as string,
              user_id: user[0].id,
              subscription_id: session.subscription as string,
              provider: "stripe",
              provider_payment_id: session.payment_intent as string,
              amount: (session.amount_total || 0).toString(),
              currency: session.currency || "usd",
              status: "succeeded",
            });
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        console.log("Invoice payment succeeded:", invoice.id);
        
        // Handle recurring payment
        if (invoice.subscription) {
          const subscription = await db.select().from(subscriptionsTable)
            .where(eq(subscriptionsTable.provider_subscription_id, invoice.subscription as string))
            .limit(1);
            
          if (subscription.length > 0) {
            // Update subscription period
            await db.update(subscriptionsTable)
              .set({
                current_period_start: new Date(invoice.period_start * 1000),
                current_period_end: new Date(invoice.period_end * 1000),
                status: "active"
              })
              .where(eq(subscriptionsTable.provider_subscription_id, invoice.subscription as string));

            // Create payment record
            await db.insert(paymentsTable).values({
              id: invoice.payment_intent as string,
              user_id: subscription[0].user_id,
              subscription_id: subscription[0].id,
              provider: "stripe",
              provider_payment_id: invoice.payment_intent as string,
              amount: invoice.amount_paid.toString(),
              currency: invoice.currency,
              status: "succeeded",
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        console.log("Subscription cancelled:", subscription.id);
        
        // Update subscription status
        await db.update(subscriptionsTable)
          .set({ status: "canceled" })
          .where(eq(subscriptionsTable.provider_subscription_id, subscription.id));
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

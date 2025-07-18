import { NextResponse } from "next/server";
import { createOrder, convertToSmallestUnit } from "@/utils/razorpay";
import { db } from "@/db";
import { plansTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { planId, currency = "INR" } = await req.json();

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      );
    }

    // Fetch plan details from database
    const plan = await db
      .select()
      .from(plansTable)
      .where(eq(plansTable.id, planId))
      .limit(1);

    if (!plan.length) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    const planData = plan[0];

    // Determine amount based on currency
    const amount = currency === "USD" 
      ? Number(planData.price_usd) 
      : Number(planData.price_inr);

    // Convert to smallest currency unit (paise for INR, cents for USD)
    const amountInSmallestUnit = convertToSmallestUnit(amount, currency);

    // Create Razorpay order
    const order = await createOrder({
      amount: amountInSmallestUnit,
      currency: currency,
      receipt: `plan_${planId}_${Date.now()}`,
      notes: {
        plan_id: planId,
        plan_name: planData.name,
        plan_interval: planData.interval,
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      planDetails: {
        id: planData.id,
        name: planData.name,
        description: planData.description,
        amount: amount,
        currency: currency,
        interval: planData.interval,
      },
    });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Failed to create order" 
      },
      { status: 500 }
    );
  }
}

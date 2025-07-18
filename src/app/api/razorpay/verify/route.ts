import { NextResponse } from "next/server";
import { verifyPaymentSignature } from "@/utils/razorpay";
import { db } from "@/db";
import { paymentsTable, subscriptionsTable, userCreditsTable, plansTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required payment parameters" 
        },
        { status: 400 }
      );
    }

    // Verify payment signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid payment signature" 
        },
        { status: 401 }
      );
    }

    // Payment is verified, now process it
    // Note: In a real implementation, you might want to fetch the payment details
    // from Razorpay to get additional information like amount, currency, etc.

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Payment verification failed" 
      },
      { status: 500 }
    );
  }
}

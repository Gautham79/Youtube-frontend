import Razorpay from "razorpay";
import crypto from "crypto";

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_SECRET!,
});

export interface RazorpayOrderData {
  amount: number; // Amount in smallest currency unit (paise for INR, cents for USD)
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpaySubscriptionData {
  plan_id: string;
  customer_notify: 0 | 1;
  quantity: number;
  total_count: number;
  notes?: Record<string, string>;
}

// Create a Razorpay order for one-time payments
export const createOrder = async (orderData: RazorpayOrderData) => {
  try {
    const order = await razorpay.orders.create({
      amount: orderData.amount,
      currency: orderData.currency,
      receipt: orderData.receipt,
      notes: orderData.notes,
    });
    return order;
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw error;
  }
};

// Create a Razorpay subscription
export const createSubscription = async (subscriptionData: RazorpaySubscriptionData) => {
  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: subscriptionData.plan_id,
      customer_notify: subscriptionData.customer_notify,
      quantity: subscriptionData.quantity,
      total_count: subscriptionData.total_count,
      notes: subscriptionData.notes,
    });
    return subscription;
  } catch (error) {
    console.error("Error creating Razorpay subscription:", error);
    throw error;
  }
};

// Create a Razorpay plan
export const createPlan = async (planData: {
  period: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  item: {
    name: string;
    amount: number;
    currency: string;
    description?: string;
  };
  notes?: Record<string, string>;
}) => {
  try {
    const plan = await razorpay.plans.create(planData);
    return plan;
  } catch (error) {
    console.error("Error creating Razorpay plan:", error);
    throw error;
  }
};

// Create a Razorpay customer
export const createCustomer = async (customerData: {
  name: string;
  email: string;
  contact?: string;
  notes?: Record<string, string>;
}) => {
  try {
    const customer = await razorpay.customers.create(customerData);
    return customer;
  } catch (error) {
    console.error("Error creating Razorpay customer:", error);
    throw error;
  }
};

// Verify payment signature
export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  try {
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET!)
      .update(body.toString())
      .digest("hex");
    
    return expectedSignature === signature;
  } catch (error) {
    console.error("Error verifying payment signature:", error);
    return false;
  }
};

// Verify webhook signature
export const verifyWebhookSignature = (
  body: string,
  signature: string
): boolean => {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");
    
    return expectedSignature === signature;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
};

// Fetch payment details
export const fetchPayment = async (paymentId: string) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error("Error fetching payment:", error);
    throw error;
  }
};

// Fetch subscription details
export const fetchSubscription = async (subscriptionId: string) => {
  try {
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    return subscription;
  } catch (error) {
    console.error("Error fetching subscription:", error);
    throw error;
  }
};

// Cancel subscription
export const cancelSubscription = async (subscriptionId: string, cancelAtCycleEnd: boolean = false) => {
  try {
    const subscription = await razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
    return subscription;
  } catch (error) {
    console.error("Error canceling subscription:", error);
    throw error;
  }
};

// Convert amount to smallest currency unit
export const convertToSmallestUnit = (amount: number, currency: string): number => {
  // For INR and USD, multiply by 100 to convert to paise/cents
  if (currency === "INR" || currency === "USD") {
    return Math.round(amount * 100);
  }
  return amount;
};

// Convert amount from smallest currency unit
export const convertFromSmallestUnit = (amount: number, currency: string): number => {
  // For INR and USD, divide by 100 to convert from paise/cents
  if (currency === "INR" || currency === "USD") {
    return amount / 100;
  }
  return amount;
};

export { razorpay };

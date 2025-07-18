import { type Stripe, loadStripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey || publishableKey === 'pk_12345') {
      // Return null if no valid key is provided (Stripe is disabled)
      stripePromise = Promise.resolve(null);
    } else {
      stripePromise = loadStripe(publishableKey);
    }
  }
  return stripePromise;
};

// Only initialize Stripe if we have a valid secret key
const secretKey = process.env.STRIPE_SECRET_KEY;
export const stripe = secretKey && secretKey !== 'sk_12345' 
  ? require("stripe")(secretKey)
  : null;

# Razorpay Integration Guide

This document provides a comprehensive guide for integrating Razorpay payment gateway into your application, replacing or complementing Stripe and Lemon Squeezy for regions where they are not supported.

## Overview

The Razorpay integration includes:
- ✅ Payment processing for one-time and subscription payments
- ✅ Webhook handling for payment events
- ✅ Smart checkout component that adapts to enabled payment providers
- ✅ Database schema updates to support multiple payment providers
- ✅ Credit allocation system integration
- ✅ Payment verification and security

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Razorpay Configuration
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_SECRET=your_razorpay_secret_key
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

### 2. Database Migration

Run the Razorpay migration to update your database schema:

```bash
npx tsx scripts/apply-razorpay-migration.ts
```

This migration will:
- Add `razorpay_plan_id` column to the plans table
- Create `payment_providers_config` table
- Insert default payment provider configurations
- Enable Razorpay as the default payment provider

### 3. Razorpay Dashboard Setup

1. **Create Razorpay Account**: Sign up at [razorpay.com](https://razorpay.com)
2. **Get API Keys**: Navigate to Settings > API Keys
3. **Create Webhook**: Go to Settings > Webhooks and add:
   - URL: `https://yourdomain.com/api/razorpay/webhook`
   - Events: `payment.captured`, `payment.failed`, `subscription.activated`, `subscription.cancelled`, `subscription.charged`
4. **Create Plans** (Optional): For subscription-based payments

## File Structure

```
src/
├── utils/
│   └── razorpay.ts                    # Razorpay utility functions
├── components/
│   ├── RazorpayButton.tsx            # Razorpay checkout button
│   └── SmartCheckout.tsx             # Multi-provider checkout
├── app/api/
│   ├── payment-providers/
│   │   └── route.ts                  # Get enabled providers
│   └── razorpay/
│       ├── checkout/
│       │   └── route.ts              # Create orders
│       ├── webhook/
│       │   └── route.ts              # Handle webhooks
│       └── verify/
│           └── route.ts              # Verify payments
└── db/
    └── schema.ts                     # Updated schema
```

## Usage Examples

### Basic Razorpay Button

```tsx
import RazorpayButton from '@/components/RazorpayButton';

<RazorpayButton
  planId="pro_monthly"
  planName="Pro Monthly"
  amount={999}
  currency="INR"
  className="w-full bg-blue-600 hover:bg-blue-700"
/>
```

### Smart Checkout (Multi-Provider)

```tsx
import SmartCheckout from '@/components/SmartCheckout';

<SmartCheckout
  planId="pro_monthly"
  planName="Pro Monthly"
  priceUSD={29.99}
  priceINR={2499}
  currency="INR"
  className="w-full"
/>
```

## Payment Provider Configuration

The system supports multiple payment providers through the `payment_providers_config` table:

```sql
-- Enable/disable providers
UPDATE payment_providers_config 
SET is_enabled = true 
WHERE id = 'razorpay';

UPDATE payment_providers_config 
SET is_enabled = false 
WHERE id = 'stripe';
```

### Provider Priority

Set the `priority` field to control the order of payment options:

```sql
UPDATE payment_providers_config 
SET priority = 1 
WHERE id = 'razorpay';  -- First option

UPDATE payment_providers_config 
SET priority = 2 
WHERE id = 'stripe';    -- Second option
```

## Webhook Events

The integration handles the following Razorpay webhook events:

| Event | Description | Action |
|-------|-------------|--------|
| `payment.captured` | Payment successful | Create subscription, allocate credits |
| `payment.failed` | Payment failed | Log failure reason |
| `subscription.activated` | Subscription activated | Update subscription status |
| `subscription.cancelled` | Subscription cancelled | Mark as cancelled |
| `subscription.charged` | Recurring payment | Refresh user credits |

## Security Features

### Payment Verification
- Server-side signature verification for all payments
- Webhook signature validation
- Order ID and payment ID matching

### Error Handling
- Comprehensive error logging
- Graceful fallbacks for payment failures
- User-friendly error messages

## Testing

### Test Mode Setup
1. Use test API keys from Razorpay dashboard
2. Test webhook events using Razorpay's webhook simulator
3. Use test card numbers provided by Razorpay

### Test Cards
```
Success: 4111 1111 1111 1111
Failure: 4000 0000 0000 0002
```

## Currency Support

The integration supports multiple currencies:
- **INR** (Indian Rupees) - Primary
- **USD** (US Dollars) - Secondary

Amounts are automatically converted to the smallest currency unit (paise for INR, cents for USD).

## Credit System Integration

When a payment is successful:
1. User subscription is created/updated
2. Credits are allocated based on the plan
3. Credit refresh dates are calculated
4. Transaction history is recorded

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check webhook URL is publicly accessible
   - Verify webhook secret matches environment variable
   - Check Razorpay dashboard for webhook delivery status

2. **Payment verification fails**
   - Ensure RAZORPAY_SECRET is correctly set
   - Check signature generation logic
   - Verify order ID format

3. **Credits not allocated**
   - Check webhook processing logs
   - Verify plan exists in database
   - Check user ID is passed correctly in payment notes

### Debug Mode

Enable debug logging by adding to your webhook handler:

```typescript
console.log('Webhook payload:', JSON.stringify(event, null, 2));
```

## Migration from Other Providers

### From Stripe
1. Export existing customer data
2. Map Stripe price IDs to plan IDs
3. Update checkout components to use SmartCheckout
4. Configure provider priorities

### From Lemon Squeezy
1. Export subscription data
2. Map variant IDs to plan IDs
3. Update billing cycles if different
4. Test webhook integrations

## Production Checklist

- [ ] Replace test API keys with live keys
- [ ] Update webhook URL to production domain
- [ ] Test all payment flows
- [ ] Verify webhook delivery
- [ ] Set up monitoring and alerts
- [ ] Configure provider priorities
- [ ] Test currency conversions
- [ ] Verify credit allocation
- [ ] Test subscription renewals
- [ ] Set up customer support processes

## Support

For Razorpay-specific issues:
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Support](https://razorpay.com/support/)

For integration issues:
- Check application logs
- Review webhook delivery status
- Verify environment variables
- Test with Razorpay's test mode

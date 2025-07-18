import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { plansTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval'); // 'month' or 'year'
    const currency = searchParams.get('currency'); // 'USD' or 'INR'

    // Build where conditions
    let whereClause = eq(plansTable.is_active, true);
    
    // Filter by interval if provided
    if (interval && (interval === 'month' || interval === 'year')) {
      whereClause = and(whereClause, eq(plansTable.interval, interval)) || whereClause;
    }

    const plans = await db.select().from(plansTable).where(whereClause);

    // Format plans for frontend consumption
    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      priceUSD: parseFloat(plan.price_usd),
      priceINR: parseFloat(plan.price_inr),
      interval: plan.interval,
      monthlyCredits: plan.monthly_credits,
      exportQuality: plan.export_quality,
      isPopular: plan.is_popular,
      credits: {
        idea: plan.idea_cost,
        script: plan.script_cost,
        audio: plan.audio_cost,
        image: plan.image_cost,
        video: plan.video_cost,
        thumbnail: plan.thumbnail_cost,
        metadata: plan.metadata_cost,
      },
      features: plan.features ? JSON.parse(plan.features) : [],
      stripePrice: plan.stripe_price_id,
      lemonsqueezyVariant: plan.lemonsqueezy_variant_id,
    }));

    return NextResponse.json({
      success: true,
      plans: formattedPlans,
    });

  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch plans' 
      },
      { status: 500 }
    );
  }
}

// Create or update a plan (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      id,
      name,
      description,
      priceUSD,
      priceINR,
      interval,
      monthlyCredits,
      credits,
      exportQuality,
      features,
      isPopular,
      stripePrice,
      lemonsqueezyVariant,
    } = body;

    // Validate required fields
    if (!id || !name || !priceUSD || !priceINR || !interval || !monthlyCredits || !credits) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields' 
        },
        { status: 400 }
      );
    }

    const planData = {
      id,
      name,
      description,
      price_usd: priceUSD.toString(),
      price_inr: priceINR.toString(),
      interval,
      monthly_credits: monthlyCredits,
      idea_cost: credits.idea,
      script_cost: credits.script,
      audio_cost: credits.audio,
      image_cost: credits.image,
      video_cost: credits.video,
      thumbnail_cost: credits.thumbnail,
      metadata_cost: credits.metadata,
      export_quality: exportQuality,
      features: JSON.stringify(features || []),
      is_popular: isPopular || false,
      is_active: true,
      stripe_price_id: stripePrice,
      lemonsqueezy_variant_id: lemonsqueezyVariant,
    };

    const result = await db.insert(plansTable)
      .values(planData)
      .onConflictDoUpdate({
        target: plansTable.id,
        set: {
          ...planData,
          updated_at: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      plan: result[0],
    });

  } catch (error) {
    console.error('Error creating/updating plan:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create/update plan' 
      },
      { status: 500 }
    );
  }
}

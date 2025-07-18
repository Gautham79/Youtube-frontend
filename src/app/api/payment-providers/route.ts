import { NextResponse } from "next/server";
import { db } from "@/db";
import { paymentProvidersConfigTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    // Fetch enabled payment providers from database
    const enabledProviders = await db
      .select()
      .from(paymentProvidersConfigTable)
      .where(eq(paymentProvidersConfigTable.is_enabled, true))
      .orderBy(paymentProvidersConfigTable.priority);

    // Determine if user should see provider selection
    const showSelection = enabledProviders.length > 1;

    return NextResponse.json({
      success: true,
      providers: enabledProviders,
      showSelection,
      count: enabledProviders.length,
    });
  } catch (error) {
    console.error("Error fetching payment providers:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch payment providers",
        providers: [],
        showSelection: false,
        count: 0,
      },
      { status: 500 }
    );
  }
}

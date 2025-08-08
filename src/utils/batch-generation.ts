import { db } from '@/db';
import { userCreditsTable, creditTransactionsTable, plansTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Rate limiting constants
export const DALLE_CONCURRENT_LIMIT = 2;
export const DALLE_DELAY_BETWEEN_BATCHES = 12000; // 12 seconds
export const TTS_CONCURRENT_LIMIT = 5;
export const TTS_DELAY_BETWEEN_BATCHES = 3000; // 3 seconds
export const MAX_CONSECUTIVE_ERRORS = 3;

// Types for batch processing
export interface BatchScene {
  id: number;
  prompt: string;
  skipExisting?: boolean;
}

export interface BatchSettings {
  // Image settings
  imageFormat?: string;
  imageStyle?: string;
  size?: string;
  quality?: string;
  // Audio settings
  voice?: string;
  speed?: number;
  format?: string;
}

export interface BatchResult {
  sceneId: number;
  success: boolean;
  url?: string;
  serverUrl?: string | null;
  error?: string;
  creditsUsed: number;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  consecutiveErrors: number;
  scenes: Array<{
    id: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
    url?: string;
  }>;
}

// Utility function to delay execution
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get user credits and plan information
export async function getUserCreditsAndPlan(userId: string) {
  const userCredits = await db
    .select({
      id: userCreditsTable.id,
      currentBalance: userCreditsTable.current_balance,
      planId: userCreditsTable.plan_id,
      imageCost: plansTable.image_cost,
      audioCost: plansTable.audio_cost,
      planName: plansTable.name,
    })
    .from(userCreditsTable)
    .leftJoin(plansTable, eq(userCreditsTable.plan_id, plansTable.id))
    .where(eq(userCreditsTable.user_id, userId))
    .limit(1);

  if (userCredits.length === 0) {
    throw new Error('No active subscription found');
  }

  return userCredits[0];
}

// Deduct credits and log transaction
export async function deductCreditsAndLog(
  userId: string,
  amount: number,
  actionType: 'image' | 'audio',
  description: string,
  currentBalance: number
): Promise<number> {
  const newBalance = currentBalance - amount;

  // Update user's credit balance
  await db
    .update(userCreditsTable)
    .set({
      current_balance: newBalance,
      updated_at: new Date(),
    })
    .where(eq(userCreditsTable.user_id, userId));

  // Log the transaction
  await db
    .insert(creditTransactionsTable)
    .values({
      user_id: userId,
      type: 'usage',
      amount: -amount, // Negative for spending
      action_type: actionType,
      description,
      balance_before: currentBalance,
      balance_after: newBalance,
    });

  return newBalance;
}

// Process batch with rate limiting and error handling
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrentLimit: number,
  delayBetweenBatches: number,
  maxConsecutiveErrors: number = MAX_CONSECUTIVE_ERRORS
): Promise<Array<{ item: T; result?: R; error?: Error }>> {
  const results: Array<{ item: T; result?: R; error?: Error }> = [];
  let consecutiveErrors = 0;

  for (let i = 0; i < items.length; i += concurrentLimit) {
    const batch = items.slice(i, i + concurrentLimit);
    
    console.log(`🔄 Processing batch ${Math.floor(i / concurrentLimit) + 1}/${Math.ceil(items.length / concurrentLimit)}`);

    try {
      const batchResults = await Promise.allSettled(
        batch.map(async (item) => {
          try {
            const result = await processor(item);
            return { item, result };
          } catch (error) {
            return { item, error: error as Error };
          }
        })
      );

      // Process results and check for consecutive errors
      let batchHasSuccess = false;
      for (const settledResult of batchResults) {
        if (settledResult.status === 'fulfilled') {
          const { item, result, error } = settledResult.value;
          results.push({ item, result, error });
          
          if (!error) {
            batchHasSuccess = true;
          }
        } else {
          // This shouldn't happen with our error handling, but just in case
          const item = batch[batchResults.indexOf(settledResult)];
          results.push({ 
            item, 
            error: new Error(settledResult.reason?.message || 'Unknown error') 
          });
        }
      }

      // Reset consecutive error counter if we had any success in this batch
      if (batchHasSuccess) {
        consecutiveErrors = 0;
      } else {
        consecutiveErrors++;
        console.warn(`⚠️ Batch ${Math.floor(i / concurrentLimit) + 1} had no successes. Consecutive errors: ${consecutiveErrors}`);
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error(`❌ Stopping batch processing after ${consecutiveErrors} consecutive failed batches`);
          throw new Error(`Too many consecutive failures (${consecutiveErrors} batches)`);
        }
      }

    } catch (error) {
      console.error(`❌ Batch processing error:`, error);
      
      // Add error results for all items in this batch
      for (const item of batch) {
        results.push({ 
          item, 
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
      
      consecutiveErrors++;
      if (consecutiveErrors >= maxConsecutiveErrors) {
        console.error(`❌ Stopping batch processing after ${consecutiveErrors} consecutive failed batches`);
        break;
      }
    }

    // Delay between batches to respect rate limits (except for the last batch)
    if (i + concurrentLimit < items.length) {
      console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`);
      await delay(delayBetweenBatches);
    }
  }

  return results;
}

// Calculate total credits needed for batch operation
export function calculateBatchCredits(
  scenes: BatchScene[],
  creditCostPerItem: number,
  skipExisting: boolean = false
): { totalCredits: number; itemsToProcess: number } {
  const itemsToProcess = skipExisting 
    ? scenes.filter(scene => !scene.skipExisting).length 
    : scenes.length;
  
  return {
    totalCredits: itemsToProcess * creditCostPerItem,
    itemsToProcess
  };
}

// Validate batch request
export function validateBatchRequest(scenes: BatchScene[]): { valid: boolean; error?: string } {
  if (!scenes || scenes.length === 0) {
    return { valid: false, error: 'No scenes provided' };
  }

  if (scenes.length > 50) {
    return { valid: false, error: 'Maximum 50 scenes allowed per batch' };
  }

  for (const scene of scenes) {
    if (!scene.prompt || typeof scene.prompt !== 'string' || scene.prompt.trim().length === 0) {
      return { valid: false, error: `Scene ${scene.id} has empty or invalid prompt` };
    }

    if (scene.prompt.length > 1000) {
      return { valid: false, error: `Scene ${scene.id} prompt exceeds 1000 characters` };
    }
  }

  return { valid: true };
}

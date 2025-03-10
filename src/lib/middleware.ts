import { db } from "../db";
import { apiKeys, apiUsageLog, hourlyApiUsage } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function trackApiKeyUsage(apiKey: string, req: Request, endpoint?: string, status?: number) {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = now.toISOString().split('T')[0]; // Get YYYY-MM-DD format
  const currentHour = now.getHours(); // 0-23
  
  try {
    console.log(`Tracking usage for key: ${apiKey}`); // Log middleware call
    
    // Log all headers
    const headers = Object.fromEntries(req.headers.entries());
    console.log('All Request Headers:', headers);
    
    // Capture IP
    const clientIp = headers['x-forwarded-for']?.split(',')[0].trim() || 
                     headers['cf-connecting-ip'] ||
                     headers['x-real-ip'] ||
                     (req as any).socket?.remoteAddress ||
                     'unknown';
    console.log('Captured IP:', clientIp);

    // Get the current key info
    const key = await db.select()
      .from(apiKeys)
      .where(eq(apiKeys.key, apiKey))
      .limit(1);
    
    if (!key || key.length === 0) return;
    
    const keyData = key[0];
    
    // Start transaction to ensure all updates happen
    await db.transaction(async (tx) => {
      // Check if we need to reset the counter (new month)
      if (keyData.lastResetDate && new Date(keyData.lastResetDate) < firstDayOfMonth) {
        // Reset for new month
        await tx.update(apiKeys)
          .set({ 
            currentMonthUsage: 1, // Start at 1 for this request
            lastResetDate: now
          })
          .where(eq(apiKeys.id, keyData.id));
      } else {
        // Increment usage
        await tx.update(apiKeys)
          .set({ 
            currentMonthUsage: keyData.currentMonthUsage + 1
          })
          .where(eq(apiKeys.id, keyData.id));
      }
      
      // Log the detailed usage entry
      await tx.insert(apiUsageLog)
        .values({
          keyId: keyData.id,
          clientIp,
          timestamp: now,
        });
      
      // Update hourly usage stats (upsert - insert or update if exists)
      await tx.execute(sql`
        INSERT INTO hourly_api_usage (key_id, date, hour, count)
        VALUES (${keyData.id}, ${today}, ${currentHour}, 1)
        ON CONFLICT (key_id, date, hour) 
        DO UPDATE SET count = hourly_api_usage.count + 1
      `);
    });

    // Atomic update
    const updateResult = await db.execute(sql`
      UPDATE api_keys
      SET current_month_usage = current_month_usage + 1
      WHERE key = ${apiKey}
      RETURNING current_month_usage
    `);
    
    if (updateResult.rows && updateResult.rows.length > 0) {
      console.log(`Updated usage to:`, updateResult.rows[0].current_month_usage); // Log new value
    }

    // Log the request
    const logResult = await db.insert(apiUsageLog).values({
      keyId: (await db.select({ id: apiKeys.id })
        .from(apiKeys)
        .where(eq(apiKeys.key, apiKey)))[0].id,
      clientIp,
      timestamp: new Date(),
    });
    console.log('Logged request:', logResult);

    console.log(`Updated usage for key: ${apiKey}`); // Debug logging
  } catch (error) {
    console.error("Error tracking API usage:", error);
  }
}
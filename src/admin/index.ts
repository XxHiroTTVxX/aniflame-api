import { serve } from "bun";
import { readFileSync } from "fs";
import { db } from "../db";
import { apiKeys, users, apiUsageLog, hourlyApiUsage } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createSession, verifySession } from "./auth";
import * as crypto from "crypto";

// Middleware to track API usage
const trackUsage = async (req: Request) => {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    try {
      // Fetch the current key data from the database
      const [keyData] = await db.select()
        .from(apiKeys)
        .where(eq(apiKeys.key, apiKey))
        .limit(1);

      if (keyData) {
        // Update the usage count in the database
        // Need to add usageCount to the schema first
        // For now, just log that we would update usage
        console.log(`Would update usage count for key: ${apiKey}`);
        // Once schema is updated, we can use:
        // await db.update(apiKeys)
        //   .set({ usageCount: (keyData.usageCount || 0) + 1 })
        //   .where(eq(apiKeys.key, apiKey))
        //   .execute();
      }
    } catch (error) {
      console.error("Error tracking API usage:", error);
    }
  }
};

// Serve login page
const serveLoginPage = () => {
  const html = readFileSync("./src/admin/login.html", "utf-8");
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
};

// Define API Key interface
interface APIKey {
  id: number;
  created_at: Date;
  monthly_limit: number;
  current_month_usage: number;
  last_reset_date: Date;
  whitelisted: boolean;
  key: string;
  name: string | null;
  allowed_ips: string[] | null;
  discord_id: string | null;
}

serve({
  port: process.env.ADMIN_PORT || 3001,
  async fetch(req) {
    const url = new URL(req.url);

    // Serve login page
    if (url.pathname === "/login") {
      return serveLoginPage();
    }

    // Handle login POST request
    if (url.pathname === "/api/login" && req.method === "POST") {
      const { username, password } = await req.json() as { username: string; password: string };
      const [user] = await db.select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (user && user.password === password) {
        const session = createSession(user.id);
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": `session=${session}; HttpOnly; Path=/`
          }
        });
      }
      return new Response(JSON.stringify({ success: false }), { status: 401 });
    }

    // Verify session for protected routes
    const session = req.headers.get("Cookie")?.split("session=")[1]?.split(";")[0];
    if (!session || !verifySession(session)) {
      return new Response(null, {
        status: 302,
        headers: { "Location": "/login" }
      });
    }

    // Handle API keys endpoint
    if (url.pathname === "/admin/keys" || url.pathname === "/admin/keys/") {
      try {
        // Create new key
        if (req.method === "POST") {
          console.log('Creating new API key...');
          
          // Parse JSON body
          let body;
          try {
            body = await req.json();
          } catch (error) {
            return new Response(JSON.stringify({
              success: false,
              error: "Invalid JSON body"
            }), { status: 400 });
          }

          const { 
            name, 
            blacklistedIPs, 
            monthlyLimit, 
            whitelisted,
            discordId,
            allowedEndpoints
          } = body as {
            name: string;
            blacklistedIPs: string[];
            monthlyLimit: number;
            whitelisted: boolean;
            discordId?: string;
            allowedEndpoints?: string[];
          };

          console.log('Received whitelist status:', whitelisted);

          // Validate input
          if (!name || typeof monthlyLimit !== 'number') {
            return new Response(JSON.stringify({
              success: false,
              error: "Name and monthlyLimit are required"
            }), { status: 400 });
          }

          // Generate API key
          const apiKey = crypto.randomBytes(32).toString('hex');
          console.log('Generated new API key:', apiKey);

          // Insert into database
          const newKey = await db.insert(apiKeys)
            .values({
              name,
              key: apiKey,
              blacklistedIPs: blacklistedIPs || [],
              monthlyLimit: monthlyLimit || 1000,
              currentMonthUsage: 0,
              lastResetDate: new Date(),
              whitelisted: whitelisted || false,
              discordId: discordId || null,
              allowedEndpoints: allowedEndpoints || []
            })
            .returning();

          console.log('New key created:', newKey);

          return new Response(JSON.stringify({
            success: true,
            key: newKey[0]
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }

        // Fetch all keys
        if (req.method === "GET") {
          console.log('Fetching all API keys...');
          const keysList = await db.select()
            .from(apiKeys)
            .execute();

          console.log('Keys retrieved from database:', keysList);

          if (!keysList || keysList.length === 0) {
            console.log('No keys found in database');
            return new Response(JSON.stringify({
              success: true,
              keys: []
            }), {
              headers: { "Content-Type": "application/json" }
            });
          }

          const keysWithUsage = keysList.map(key => {
            const usagePercentage = (key.currentMonthUsage / key.monthlyLimit) * 100;
            return {
              ...key,
              usagePercentage: Math.min(Math.round(usagePercentage * 10) / 10, 100)
            };
          });

          console.log('Keys with usage calculated:', keysWithUsage);

          return new Response(JSON.stringify({
            success: true,
            keys: keysWithUsage
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }
      } catch (error) {
        console.error("Error handling API keys:", error);
        return new Response(JSON.stringify({
          success: false,
          error: (error as Error).message
        }), { status: 500 });
      }
    }

    // Move export endpoint before individual key operations
    if (url.pathname === "/admin/keys/export") {
      try {
        console.log("Fetching API keys...");
        const keys = await db.select()
          .from(apiKeys)
          .execute();

        console.log("API keys:", keys);

        return new Response(JSON.stringify({
          success: true,
          data: keys
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="api-keys-export.json"'
          }
        });
      } catch (error) {
        console.error("Error exporting API keys:", error);
        return new Response(JSON.stringify({
          success: false,
          error: (error as Error).message
        }), { status: 500 });
      }
    }

    // Handle individual key operations
    if (url.pathname.startsWith("/admin/keys/")) {
      const pathParts = url.pathname.split('/');
      
      // Get the key ID from the correct position in the path
      const keyIdStr = pathParts[3]; // Should be the 4th element (index 3)
      
      console.log('Parsing key ID from URL:', {
        fullPath: url.pathname,
        pathParts,
        keyIdStr
      });

      if (!keyIdStr) {
        return new Response(JSON.stringify({
          success: false,
          error: "Missing key ID in URL"
        }), { status: 400 });
      }

      const keyId = parseInt(keyIdStr);
      if (isNaN(keyId) || keyId <= 0 || !/^\d+$/.test(keyIdStr)) {
        return new Response(JSON.stringify({
          success: false,
          error: `Invalid key ID: '${keyIdStr}' - must be a positive integer`
        }), { status: 400 });
      }

      console.log('Validated key ID:', keyId);

      try {
        // Delete key
        if (req.method === "DELETE") {
          console.log(`Deleting key with ID: ${keyId}`);
          
          const result = await db.delete(apiKeys)
            .where(eq(apiKeys.id, keyId))
            .execute();

          console.log('Delete result:', result);

          return new Response(JSON.stringify({
            success: true,
            message: "Key deleted successfully"
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }

        // Get current blacklisted IPs
        if (req.method === "GET" && url.pathname.endsWith("/ips")) {
          const [keyData] = await db.select({ blacklistedIPs: apiKeys.blacklistedIPs })
            .from(apiKeys)
            .where(eq(apiKeys.id, keyId))
            .limit(1);

          if (!keyData) {
            return new Response(JSON.stringify({
              success: false,
              error: "Key not found"
            }), { status: 404 });
          }

          return new Response(JSON.stringify({
            success: true,
            blacklistedIPs: keyData.blacklistedIPs || []
          }), {
            headers: { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*" // Add CORS header
            }
          });
        }

        // Update blacklisted IPs
        if (req.method === "PUT" && url.pathname.endsWith("/ips")) {
          const { ips } = await req.json() as { ips: string[] };
          
          // Validate IPs
          const validIPs = ips.filter(ip => {
            const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            return ipPattern.test(ip);
          });

          if (validIPs.length !== ips.length) {
            return new Response(JSON.stringify({
              success: false,
              error: "Invalid IP addresses detected"
            }), { status: 400 });
          }

          await db.update(apiKeys)
            .set({ blacklistedIPs: validIPs })
            .where(eq(apiKeys.id, keyId))
            .execute();

          return new Response(JSON.stringify({
            success: true,
            message: "IPs updated successfully"
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }
      } catch (error) {
        console.error("Error handling key operations:", error);
        return new Response(JSON.stringify({
          success: false,
          error: (error as Error).message
        }), { status: 500 });
      }
    }

    // Handle API usage statistics
    if (url.pathname === "/admin/api-usage") {
      try {
        const keyId = url.searchParams.get("keyId");

        if (!keyId) {
          return new Response(JSON.stringify({
            success: false,
            error: "Missing keyId parameter"
          }), { status: 400 });
        }

        // Get the key info
        const key = await db.select()
          .from(apiKeys)
          .where(eq(apiKeys.id, parseInt(keyId)))
          .limit(1);

        if (!key || key.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: "API key not found"
          }), { status: 404 });
        }

        // Get usage data for the past 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyUsage = await db.select({
          date: sql<string>`DATE(${apiUsageLog.timestamp})`.as('date'),
          count: sql<number>`COUNT(*)`.as('count')
        })
        .from(apiUsageLog)
        .groupBy(sql`DATE(${apiUsageLog.timestamp})`)
        .where(and(
          eq(apiUsageLog.keyId, parseInt(keyId)),
          sql`${apiUsageLog.timestamp} >= ${thirtyDaysAgo.toISOString().split('T')[0]}`
        ))
        .orderBy(sql`DATE(${apiUsageLog.timestamp})`);

        // Get IP usage breakdown
        const ipUsage = await db.select({
          ip: apiUsageLog.clientIp,
          count: sql<number>`COUNT(*)`.as('count')
        })
        .from(apiUsageLog)
        .where(eq(apiUsageLog.keyId, parseInt(keyId)))
        .groupBy(apiUsageLog.clientIp);

        return new Response(JSON.stringify({
          success: true,
          key: key[0],
          data: dailyUsage,
          ipUsage: Object.fromEntries(ipUsage.map(entry => [entry.ip, entry.count]))
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("Error fetching API usage:", error);
        return new Response(JSON.stringify({
          success: false,
          error: (error as Error).message
        }), { status: 500 });
      }
    }

    // Update IP usage export endpoint
    if (url.pathname === "/admin/ip-usage/export") {
      try {
        const ipUsage = await db.select({
          ip: apiUsageLog.clientIp,
          count: sql<number>`COUNT(*)`.as('count'),
          lastRequest: sql<Date>`MAX(${apiUsageLog.timestamp})`.as('lastRequest')
        })
        .from(apiUsageLog)
        .groupBy(apiUsageLog.clientIp);

        return new Response(JSON.stringify(ipUsage), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="ip-usage-export.json"'
          }
        });
      } catch (error) {
        console.error("Error exporting IP usage:", error);
        return new Response(JSON.stringify({
          error: (error as Error).message
        }), { status: 500 });
      }
    }

    // Handle dashboard stats endpoint
    if (url.pathname === "/admin/dashboard-stats") {
      try {
        // Get total requests from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Get total request count
        const totalRequestsResult = await db.select({
          count: sql<number>`COUNT(*)`.as('count')
        })
        .from(apiUsageLog)
        .where(sql`${apiUsageLog.timestamp} >= ${thirtyDaysAgo.toISOString()}`);
        
        const totalRequests = totalRequestsResult[0]?.count || 0;
        
        // Get active keys count
        const activeKeysResult = await db.select({
          count: sql<number>`COUNT(DISTINCT ${apiUsageLog.keyId})`.as('count')
        })
        .from(apiUsageLog)
        .where(sql`${apiUsageLog.timestamp} >= ${thirtyDaysAgo.toISOString()}`);
        
        const activeKeys = activeKeysResult[0]?.count || 0;
        
        // Calculate average usage percentage
        const avgUsageResult = await db.select({
          avg: sql<number>`AVG(${apiKeys.currentMonthUsage} * 100.0 / NULLIF(${apiKeys.monthlyLimit}, 0))`.as('avg')
        })
        .from(apiKeys);
        
        const averageUsage = Math.round((avgUsageResult[0]?.avg || 0) * 10) / 10;
        
        // Get count of keys with high usage (>80%)
        const highUsageKeysResult = await db.select({
          count: sql<number>`COUNT(*)`.as('count')
        })
        .from(apiKeys)
        .where(sql`${apiKeys.currentMonthUsage} * 100.0 / NULLIF(${apiKeys.monthlyLimit}, 0) >= 80`);
        
        const highUsageKeys = highUsageKeysResult[0]?.count || 0;
        
        // Get time-based stats for the chart
        const requestsByDayResult = await db.select({
          date: sql<string>`DATE(${apiUsageLog.timestamp})`.as('date'),
          count: sql<number>`COUNT(*)`.as('count')
        })
        .from(apiUsageLog)
        .where(sql`${apiUsageLog.timestamp} >= ${thirtyDaysAgo.toISOString()}`)
        .groupBy(sql`DATE(${apiUsageLog.timestamp})`)
        .orderBy(sql`DATE(${apiUsageLog.timestamp})`);
        
        // Fill in days with no data
        const timeLabels = [];
        const requestCounts = [];
        
        // Create a map of existing data points
        const requestsMap = new Map();
        requestsByDayResult.forEach(day => {
          requestsMap.set(day.date, day.count);
        });
        
        // Generate a complete 30-day dataset
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(today.getDate() - 29 + i);
          const dateStr = date.toISOString().split('T')[0];
          
          timeLabels.push(dateStr);
          requestCounts.push(requestsMap.has(dateStr) ? requestsMap.get(dateStr) : 0);
        }
        
        return new Response(JSON.stringify({
          success: true,
          totalRequests,
          activeKeys,
          averageUsage,
          highUsageKeys,
          timeLabels,
          requestCounts
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return new Response(JSON.stringify({
          success: false,
          error: (error as Error).message
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Handle IP usage stats endpoint
    if (url.pathname === "/admin/ip-usage") {
      try {
        // Get top IPs by request count
        const ipStats = await db.select({
          address: apiUsageLog.clientIp,
          totalRequests: sql<number>`COUNT(*)`.as('count'),
          lastRequest: sql<string>`MAX(${apiUsageLog.timestamp})`.as('last_request'),
          keyCount: sql<number>`COUNT(DISTINCT ${apiUsageLog.keyId})`.as('key_count')
        })
        .from(apiUsageLog)
        .groupBy(apiUsageLog.clientIp)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(20);
        
        // Add "suspicious" flag for IPs with high request counts or using multiple keys
        const enhancedIpStats = ipStats.map(ip => ({
          ...ip,
          suspicious: ip.totalRequests > 5000 || ip.keyCount > 3
        }));
        
        return new Response(JSON.stringify({
          success: true,
          ipStats: enhancedIpStats
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("Error fetching IP usage stats:", error);
        return new Response(JSON.stringify({
          success: false,
          error: (error as Error).message
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Serve admin panel
    if (url.pathname === "/admin") {
      const html = readFileSync("./src/admin/panel.html", "utf-8");
      return new Response(html, {
        headers: { "Content-Type": "text/html" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
});

console.log(`Admin panel running on http://localhost:${process.env.ADMIN_PORT || 3001}`);
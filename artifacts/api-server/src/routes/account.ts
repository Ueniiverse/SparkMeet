import { Router, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

router.delete("/account", async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Kein Token angegeben" });
      return;
    }
    const jwt = authHeader.slice(7);

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey) {
      res.status(500).json({ error: "Supabase nicht konfiguriert" });
      return;
    }

    // Verify the JWT and get the user ID using the anon client
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();

    if (userError || !user) {
      res.status(401).json({ error: "Ungültiges Token" });
      return;
    }

    const userId = user.id;

    // Delete all user data from app tables (cascade order matters)
    const cleanupClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    await cleanupClient.from("messages").delete().or(
      `match_id.in.(select id from matches where user_id_1.eq.${userId} or user_id_2.eq.${userId})`
    );
    await cleanupClient.from("event_likes").delete().eq("user_id", userId);
    await cleanupClient.from("matches").delete().or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
    await cleanupClient.from("profiles").delete().eq("id", userId);

    // Delete the auth user (requires service role key)
    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) {
        res.status(500).json({ error: `Auth-Löschung fehlgeschlagen: ${deleteError.message}` });
        return;
      }
      res.json({ success: true, deleted: "full" });
    } else {
      // Graceful fallback: data deleted, auth user remains but is unusable
      res.json({ success: true, deleted: "data_only" });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    res.status(500).json({ error: msg });
  }
});

export default router;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function hasSupabaseConfig() {
  return Boolean(url && publishableKey);
}

export function getSupabaseConfig() {
  if (!url || !publishableKey) {
    throw new Error("Missing Supabase public configuration");
  }
  return { url, publishableKey };
}

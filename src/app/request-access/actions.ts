"use server";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export type RequestState = { status: "idle" | "success" | "error" };

export async function submitAccessRequest(_state: RequestState, formData: FormData): Promise<RequestState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const message = String(formData.get("message") ?? "").trim();
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const website = String(formData.get("website") ?? "");

  if (website || name.length < 2 || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || message.length < 10 || message.length > 2000 || !hasSupabaseConfig()) {
    return { status: "error" };
  }

  const { error } = await (await createClient()).from("access_requests").insert({ name, email, message, locale });
  return error ? { status: "error" } : { status: "success" };
}

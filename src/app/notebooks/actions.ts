"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createNotebook(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!name || name.length > 120) return;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;
  if (!ownerId) redirect("/login");

  const { data, error } = await supabase.rpc("create_owned_notebook", { p_name: name });
  if (error) throw new Error("Unable to create notebook");
  const result = data as { status?: string; code?: string };
  if (result.status === "error") redirect(`/notebooks/new?lang=${locale}&error=${result.code}`);
  revalidatePath("/notebooks");
  redirect(`/notebooks?lang=${locale}`);
}

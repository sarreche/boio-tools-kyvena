import { isLocale } from "@/lib/i18n";
import { RequestAccessForm } from "./RequestAccessForm";

export default async function RequestAccessPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  return <RequestAccessForm initialLocale={isLocale(lang) ? lang : "es"} />;
}

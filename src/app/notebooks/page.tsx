import Link from "next/link";
import { BookOpen, Plus, SignOut } from "@phosphor-icons/react/dist/ssr";
import { KyvenaLogo } from "@/components/KyvenaLogo";
import { copy, isLocale } from "@/lib/i18n";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function NotebooksPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const locale = isLocale(lang) ? lang : "es";
  const t = copy[locale];
  let notebooks: Array<{ id: string; name: string; updated_at: string }> = [];

  if (hasSupabaseConfig()) {
    const { data } = await (await createClient()).from("notebooks").select("id,name,updated_at").order("updated_at", { ascending: false });
    notebooks = data ?? [];
  }

  return (
    <>
      <header className="app-header">
        <KyvenaLogo />
        <div className="header-actions">
          <Link className="ghost-button" href={`/notebooks?lang=${locale === "es" ? "en" : "es"}`}>{locale === "es" ? "EN" : "ES"}</Link>
          <form action={signOut}><button className="ghost-button"><SignOut size={18} /> <span className="sr-only">{t.signOut}</span></button></form>
        </div>
      </header>
      <main className="home-main">
        <div className="home-heading">
          <div><h1>{t.homeTitle}</h1><p>{t.homeBody}</p></div>
          <Link className="primary-button" href={`/notebooks/new?lang=${locale}`}><Plus size={20} weight="bold" /> {t.newNotebook}</Link>
        </div>
        {notebooks.length ? (
          <div className="empty-state" style={{ display: "block", textAlign: "left" }}>
            {notebooks.map((notebook) => <article key={notebook.id}><BookOpen size={24} color="#1261ff" /><h2><Link href={`/notebooks/${notebook.id}?lang=${locale}`}>{notebook.name}</Link></h2></article>)}
          </div>
        ) : (
          <section className="empty-state"><div className="empty-state-inner"><div className="empty-state-icon"><BookOpen size={35} weight="duotone" /></div><h2>{t.emptyTitle}</h2><p>{t.emptyBody}</p></div></section>
        )}
      </main>
    </>
  );
}

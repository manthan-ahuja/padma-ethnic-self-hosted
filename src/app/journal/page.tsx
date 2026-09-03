import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageShell } from "@/components/site-chrome";
import { journalArticles } from "@/lib/journal";
export const metadata: Metadata = { title: "Journal | Padma Ethnic", description: "Notes on Indian dress, repeat wear, colour and textile care from Padma." };
export default function JournalPage() { return <PageShell><main className="journal-page"><header className="editorial-page-hero compact-hero"><p className="eyebrow">The Padma journal</p><h1>Notes worth keeping</h1><p>Stories about dressing, caring, combining and returning to the pieces that matter.</p></header><section className="journal-grid">{journalArticles.map((article, index) => <article key={article.slug} className={index === 0 ? "journal-feature" : ""}><Link href={`/journal/${article.slug}`} className="journal-image"><Image src={article.image} alt="" fill sizes={index === 0 ? "(max-width: 800px) 100vw, 58vw" : "(max-width: 800px) 100vw, 32vw"} /></Link><div><p>{article.category} · {article.readTime}</p><Link href={`/journal/${article.slug}`}><h2>{article.title}</h2></Link><span>{article.excerpt}</span><Link className="text-link" href={`/journal/${article.slug}`}>Read the note <ArrowRight size={14} /></Link></div></article>)}</section></main></PageShell>; }

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site-chrome";
import { getJournalArticle, journalArticles } from "@/lib/journal";
export function generateStaticParams() { return journalArticles.map((article) => ({ slug: article.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const article = getJournalArticle((await params).slug); return article ? { title: `${article.title} | Padma Journal`, description: article.excerpt } : { title: "Journal article not found | Padma Ethnic" }; }
export default async function JournalArticlePage({ params }: { params: Promise<{ slug: string }> }) { const article = getJournalArticle((await params).slug); if (!article) notFound(); return <PageShell><main className="journal-article"><nav aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/journal">Journal</Link><span>/</span><span>{article.title}</span></nav><header><p>{article.category} · {article.readTime}</p><h1>{article.title}</h1><span>{article.excerpt}</span></header><div className="journal-article-image"><Image src={article.image} alt="" fill priority sizes="(max-width: 900px) 100vw, 72vw" /></div><article>{article.paragraphs.map((section, index) => <section key={index}>{section.heading && <h2>{section.heading}</h2>}<p>{section.body}</p></section>)}</article><aside><p>Continue reading</p>{journalArticles.filter((item) => item.slug !== article.slug).slice(0, 2).map((item) => <Link href={`/journal/${item.slug}`} key={item.slug}>{item.title}</Link>)}</aside></main></PageShell>; }

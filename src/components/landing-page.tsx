import Link from "next/link";
import {
  ArrowRight, Braces, CircleCheck, Clock3, FileSpreadsheet,
  Filter, Newspaper, Rss, Search, ShieldCheck,
} from "lucide-react";

import styles from "./landing-page.module.css";

const feedTypes = [
  ["Website to RSS", "Turn public blogs, news pages, and changelogs into feeds."],
  ["Native RSS & Atom", "Discover existing feeds and normalize their content."],
  ["Preview before saving", "Inspect detected articles before adding a feed to your workspace."],
  ["Scheduled refreshes", "Keep saved feeds up to date and check their refresh history."],
];

const managementTools = [
  { title: "Keyword filters", text: "Include the topics you need and exclude unwanted keywords.", Icon: Filter },
  { title: "Exact deduplication", text: "Keep repeated articles from appearing twice.", Icon: CircleCheck },
  { title: "Feed health", text: "See refresh status, warnings, and actionable errors.", Icon: Clock3 },
  { title: "Private feeds", text: "Control access with private output links.", Icon: ShieldCheck },
];

const formats = [
  { title: "RSS", text: "Follow updates in your favorite RSS reader.", Icon: Rss },
  { title: "JSON", text: "Use normalized article data in your own tools.", Icon: Braces },
  { title: "CSV", text: "Bring feed items into spreadsheets for analysis.", Icon: FileSpreadsheet },
];

const solutions = [
  { title: "News monitoring", text: "Follow publishers and keep relevant stories in one place.", Icon: Newspaper },
  { title: "Competitor tracking", text: "Watch public product blogs, release notes, and changelogs.", Icon: Search },
  { title: "Security updates", text: "Follow vendor advisories and public security feeds.", Icon: ShieldCheck },
];

// The original landing layout from b21af4d, with copy limited to the implemented MVP.
export function LandingPage() {
  return (
    <main className={styles.page} id="top">
      <a className={styles.skipLink} href="#content">Skip to content</a>
      <header className={styles.header}>
        <Link className="brand" href="/" aria-label="Srotiva home">Srotiva</Link>
        <nav className={styles.nav} aria-label="Primary navigation">
          <a href="#feeds">RSS Feeds</a>
          <a href="#formats">Output formats</a>
          <a href="#solutions">Solutions</a>
          <Link href="/help">Help</Link>
        </nav>
        <div className={styles.actions}>
          <Link href="/login">Sign in</Link>
          <Link className="button button--small" href="/signup">Sign up</Link>
        </div>
      </header>

      <section className={styles.hero} id="content">
        <div>
          <p className="eyebrow">Srotiva</p>
          <h1>Small bites from the live web.</h1>
          <p className={styles.lede}>Turn websites and native feeds into clean RSS, JSON, and CSV. Keep useful updates within reach.</p>
          <div className={styles.heroActions}>
            <Link className="button" href="/dashboard/feeds/new">Create a feed <ArrowRight aria-hidden="true" size={18} /></Link>
            <a className="button button--ghost" href="#feeds">Explore feeds</a>
          </div>
          <p className={styles.note}>For people who need useful updates without the noise.</p>
        </div>
        <div className={styles.console} aria-label="Example feed preview">
          <div className={styles.consoleBar}>
            <div><p className="eyebrow">URL to feed</p><h2>Generate RSS feeds in seconds</h2></div>
            <Rss aria-hidden="true" size={24} />
          </div>
          <div className={styles.source}>
            <span>Example source</span>
            <div className={styles.sourceUrl}><code>https://example.com/blog</code><Link href="/dashboard/feeds/new" aria-label="Create your own feed"><ArrowRight aria-hidden="true" size={20} /></Link></div>
            <p>Paste your URL in the dashboard to preview a real feed.</p>
          </div>
          <div className={styles.previewGrid}>
            <div className={styles.preview}>
              <div className={styles.previewLabel}><span>Sample articles</span><span>RSS</span></div>
              <ul>
                {["A new idea worth following", "The latest product update", "A story that matches your interests"].map((title) => (
                  <li key={title}><Newspaper aria-hidden="true" size={18} /><div><strong>{title}</strong><small>Article title and summary in one clean feed.</small></div></li>
                ))}
              </ul>
            </div>
            <div className={styles.output}>
              <p className={styles.previewLabel}>One feed, three formats</p>
              <code>RSS<br />JSON<br />CSV</code>
              <Link className={styles.textLink} href="/help/output-formats">Choose your output <ArrowRight aria-hidden="true" size={16} /></Link>
            </div>
          </div>
          <div className={styles.delivery}><span>Native feeds</span><span>Public webpages</span><span>Keyword filters</span></div>
        </div>
      </section>

      <section className={styles.section} id="feeds">
        <div className={styles.intro}><p className="eyebrow">RSS Feeds</p><h2>Turn any useful source into a feed</h2><p>Paste a URL, inspect detected content, and publish a feed you can use anywhere.</p></div>
        <div className={styles.featureGrid}>
          {feedTypes.map(([title, text], index) => <article className={styles.card} key={title}><span className={styles.index}>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className={`${styles.section} ${styles.split}`}>
        <div><p className="eyebrow">Feed Intelligence</p><h2>Manage and customize feed output</h2><p>Keep the articles that matter, remove repeated items, and see how your feeds are doing.</p><Link className={styles.textLink} href="/help/filters">How keyword filters work <ArrowRight aria-hidden="true" size={16} /></Link></div>
        <div className={styles.tools}>{managementTools.map(({ title, text, Icon }) => <article key={title}><Icon aria-hidden="true" size={20} /><div><strong>{title}</strong><small>{text}</small></div></article>)}</div>
      </section>

      <section className={`${styles.section} ${styles.formatSection}`} id="formats">
        <div className={styles.intro}><p className="eyebrow">Feed Output</p><h2>Export feeds to your stack</h2><p>One saved feed. Three clean formats. Pick the output that fits your workflow.</p></div>
        <div className={styles.formatGrid}>{formats.map(({ title, text, Icon }) => <article className={styles.card} key={title}><Icon aria-hidden="true" size={24} /><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className={styles.section} id="solutions">
        <div className={styles.intro}><p className="eyebrow">Solutions</p><h2>RSS feeds for everyday monitoring</h2><p>Follow the public sources that matter to your work.</p></div>
        <div className={styles.formatGrid}>{solutions.map(({ title, text, Icon }) => <article className={styles.card} key={title}><Icon aria-hidden="true" size={20} /><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className={styles.cta}><div><p className="eyebrow">Ready to follow the web?</p><h2>Create, customize, and share a feed from one screen</h2></div><Link className="button" href="/signup">Get started <ArrowRight aria-hidden="true" size={18} /></Link></section>
      <footer className={styles.footer}><div><Link className="brand" href="/">Srotiva</Link><p>Small bites from the live web.</p></div><nav aria-label="Footer navigation"><Link href="/help">Help</Link><Link href="/contact">Contact</Link><Link href="/legal/privacy">Privacy</Link><Link href="/legal/terms">Terms</Link></nav></footer>
    </main>
  );
}

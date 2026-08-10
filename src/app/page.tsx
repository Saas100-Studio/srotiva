import {
  ArrowRight,
  BellRing,
  Blocks,
  Bot,
  Braces,
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  CircleCheck,
  Code2,
  FileJson,
  Filter,
  Globe2,
  Layers3,
  type LucideIcon,
  Mail,
  Megaphone,
  MessageSquare,
  Newspaper,
  PanelTop,
  Search,
  ShieldAlert,
  SquareStack,
  Workflow,
} from "lucide-react";

import { FeedConsole } from "../components/feed-console.tsx";

const feedTypes: Array<[string, string]> = [
  ["Website to RSS", "Convert pages, blogs, and changelogs into feeds."],
  ["Visual Builder", "Select page sections and extract titles, images, and dates."],
  ["Topic Feeds", "Monitor keywords across news and web sources."],
  ["Newsletter to RSS", "Turn inbox newsletters into reader-friendly feed output."],
];

const managementTools: Array<[string, string, LucideIcon]> = [
  ["Aggregator", "Bundle many feeds into one normalized stream.", Layers3],
  ["Manual Curation", "Approve or reject posts before they publish.", CircleCheck],
  ["Keyword Filters", "Keep matched articles and remove duplicates.", Filter],
  ["Translation", "Localize feed output for multilingual audiences.", Globe2],
];

const widgets: Array<[string, string]> = [
  ["News Wall", "A responsive grid for multiple feeds."],
  ["List", "A compact, scrollable post list."],
  ["Carousel", "Featured posts in a rotating display."],
  ["Ticker", "A headline strip for fast-moving updates."],
  ["Magazine", "Editorial layout with thumbnails and summaries."],
];

const botCards: Array<[string, string, LucideIcon]> = [
  ["Discord", "Auto-post articles into channels.", MessageSquare],
  ["Slack", "Send monitored updates to teams.", MessageSquare],
  ["Telegram", "Publish feed updates to groups.", Megaphone],
  ["Email", "Deliver daily or weekly digests.", Mail],
];

const integrationNames = [
  "Zapier",
  "n8n",
  "Make",
  "IFTTT",
  "Bubble",
  "Mailchimp",
  "Notion",
  "Airtable",
  "Buffer",
  "Hootsuite",
  "Coda",
  "Google Sheets",
];

const solutions: Array<[string, string, LucideIcon]> = [
  ["News Monitoring", "Follow publishers, search terms, and media coverage.", Newspaper],
  ["Competitor Tracking", "Watch product launches, blogs, pricing, and job posts.", Search],
  ["Brand Monitoring", "Track mentions across web, social, and review sources.", BellRing],
  ["Financial News", "Aggregate market updates and institutional signals.", ChartNoAxesCombined],
  ["Security Alerts", "Monitor advisories, CVEs, and vendor updates.", ShieldAlert],
  ["Internal Comms", "Route relevant industry updates into workplace tools.", Building2],
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Morsel home">
          <span className="brand-mark">
            <span />
          </span>
          Morsel
        </a>
        <nav className="main-nav" aria-label="Primary navigation">
          <a href="#feeds">
            RSS Feeds <ChevronDown aria-hidden="true" size={14} />
          </a>
          <a href="#widgets">
            Widgets <ChevronDown aria-hidden="true" size={14} />
          </a>
          <a href="#bots">
            Bots <ChevronDown aria-hidden="true" size={14} />
          </a>
          <a href="#solutions">Solutions</a>
          <a href="#api">API</a>
        </nav>
        <div className="header-actions">
          <a href="/login">Sign in</a>
          <a className="button button--small" href="/signup">
            Sign up
          </a>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero__copy">
          <p className="eyebrow">Morsel</p>
          <h1>Small bites from the live web.</h1>
          <p className="lede">
            Turn websites, newsletters, and social sources into clean feeds,
            widgets, and alerts.
          </p>
          <div className="hero-actions">
            <a className="button" href="#builder">
              Create a feed <ArrowRight aria-hidden="true" size={18} />
            </a>
            <a className="button button--ghost" href="#widgets">
              See widgets
            </a>
          </div>
          <div className="rating-strip" aria-label="Rating">
            <strong>4.7</strong>
            <span>For teams that need useful updates without the noise.</span>
          </div>
        </div>
        <div id="builder" className="hero__console">
          <FeedConsole />
        </div>
      </section>

      <section className="section section--ruled" id="feeds">
        <div className="section__intro">
          <p className="eyebrow">RSS Feeds</p>
          <h2>Turn any useful source into a feed</h2>
          <p>
            Paste a URL, inspect detected content, customize the output, and
            publish the generated feed anywhere.
          </p>
        </div>
        <div className="feature-grid">
          {feedTypes.map(([title, text], index) => (
            <article className="feature-card" key={title}>
              <span className="index">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section split">
        <div>
          <p className="eyebrow">Feed Intelligence</p>
          <h2>Manage and customize feed output</h2>
          <p>
            Combine, curate, filter, and translate generated feeds before they
            reach readers, embeds, APIs, or automation bots.
          </p>
        </div>
        <div className="tool-list">
          {managementTools.map(([title, text, Icon]) => (
            <article key={title}>
              <Icon aria-hidden="true" size={20} />
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="metrics" aria-label="Morsel metrics">
        <div>
          <strong>400,000+</strong>
          <span>RSS feeds created monthly</span>
        </div>
        <div>
          <strong>45M+</strong>
          <span>Articles processed monthly</span>
        </div>
        <div>
          <strong>50,000+</strong>
          <span>Widgets powered monthly</span>
        </div>
        <div>
          <strong>100,000+</strong>
          <span>Automated bot posts monthly</span>
        </div>
      </section>

      <section className="section widget-section" id="widgets">
        <div className="section__intro">
          <p className="eyebrow">RSS Widgets</p>
          <h2>Embed live social and news widgets</h2>
          <p>
            Shape live updates into walls, lists, carousels, tickers, image
            boards, and editorial feeds.
          </p>
        </div>
        <div className="widget-board" aria-label="Widget layout preview">
          <div className="widget-board__toolbar">
            <PanelTop aria-hidden="true" size={18} />
            <span>Widget Builder</span>
            <button type="button">Publish</button>
          </div>
          <div className="widget-board__content">
            <article className="widget-large">
              <span>News Wall</span>
              <strong>Live updates across selected feeds</strong>
            </article>
            <div className="widget-stack">
              {widgets.map(([title, text]) => (
                <article key={title}>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section split" id="bots">
        <div>
          <p className="eyebrow">Auto-Posting Bots</p>
          <h2>Route feeds into the tools teams already watch</h2>
          <p>
            Send news articles, social updates, and feed alerts to messaging
            platforms or email without building a polling system.
          </p>
          <a className="text-link" href="#api">
            Explore API and export options <ArrowRight aria-hidden="true" size={16} />
          </a>
        </div>
        <div className="bot-grid">
          {botCards.map(([title, text, Icon]) => (
            <article key={title}>
              <Icon aria-hidden="true" size={22} />
              <strong>{title}</strong>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section api-section" id="api">
        <div>
          <p className="eyebrow">RSS API & Integrations</p>
          <h2>Export feeds to your stack</h2>
          <p>
            Connect feed data through webhooks, a REST API, or exports in CSV,
            JSON, and OPML formats.
          </p>
        </div>
        <div className="api-cards">
          <article>
            <Workflow aria-hidden="true" />
            <strong>Webhooks</strong>
            <span>Real-time delivery when feeds update.</span>
          </article>
          <article>
            <Braces aria-hidden="true" />
            <strong>REST API</strong>
            <span>Programmatic access to normalized feed content.</span>
          </article>
          <article>
            <FileJson aria-hidden="true" />
            <strong>Exports</strong>
            <span>Download CSV, JSON, and OPML output.</span>
          </article>
        </div>
        <div className="integration-strip" aria-label="Integrations">
          {integrationNames.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </section>

      <section className="section solutions" id="solutions">
        <div className="section__intro">
          <p className="eyebrow">Solutions</p>
          <h2>RSS feeds for every monitoring workflow</h2>
          <p>
            The product surface covers content curation, competitive
            intelligence, alerts, market news, security, and internal comms.
          </p>
        </div>
        <div className="solution-grid">
          {solutions.map(([title, text, Icon]) => (
            <article key={title}>
              <Icon aria-hidden="true" size={20} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta">
        <div>
          <p className="eyebrow">Ready to automate content?</p>
          <h2>Create, customize, and share a feed from one screen</h2>
        </div>
        <a className="button" href="#builder">
          Get started free <ArrowRight aria-hidden="true" size={18} />
        </a>
      </section>

      <footer className="site-footer">
        <div>
          <a className="brand" href="#top">
            <span className="brand-mark">
              <span />
            </span>
            Morsel
          </a>
          <p>Small bites from the live web.</p>
        </div>
        <div className="footer-links">
          <a href="#feeds">RSS Feeds</a>
          <a href="#widgets">Widgets</a>
          <a href="#bots">Bots</a>
          <a href="#api">API</a>
        </div>
        <div className="footer-tools">
          <Code2 aria-hidden="true" size={18} />
          <Blocks aria-hidden="true" size={18} />
          <Bot aria-hidden="true" size={18} />
          <SquareStack aria-hidden="true" size={18} />
        </div>
      </footer>
    </main>
  );
}

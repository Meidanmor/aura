> **Scope:** this file is for the YallaFlow / qwoo platform only: `hostinger_mm` (the qwoo-core mirror), `qwoo-platform`, `qwoo-platform-app`, plus the qwoo-core-platform and aura folders listed below. In other projects under PhpstormProjects (piano4u, ribak-academy…), ignore it.
>
> **Keep it current:** at the end of each round of work (new version, new decision, status change), update this file and the roadmap. It lives here, outside every deployed folder; never copy it into `hostinger_mm` (PhpStorm uploads that folder to Hostinger, including external changes).

# YallaFlow store platform (qwoo)

A platform that creates and runs online stores. Each customer gets their own stack: a WordPress +
WooCommerce backend on Hostinger running **qwoo-core-platform**, a headless storefront (**aura**,
Quasar SSR/PWA) on its own Vercel project, and a private content repo on GitHub. The owner
manages everything from the platform's dashboard at https://platform.meidanm.net/app/.

## Repositories and folders

| What | Where | Notes |
|---|---|---|
| Platform plugin (qwoo-platform) | `C:\Users\meida\PhpstormProjects\qwoo-platform` | Runs on platform.meidanm.net. Not in git; the user uploads it. Bump `Version` + `QWOO_PLATFORM_VERSION` in `qwoo-platform.php` each round, and update `README.md`. |
| Dashboard app (Vue 3 + Vite) | `C:\Users\meida\PhpstormProjects\qwoo-platform-app` | `npm run build` writes into `qwoo-platform/assets/portal/dist` (strict CSP). |
| Store plugin (qwoo-core-platform) | `C:\Users\meida\Desktop\qwoo-core backup\qwoo-core-platform\qwoo-core` | Git repo Meidanmor/qwoo-core-platform. **Commit and push allowed.** All platform store code goes here. |
| Storefront (aura) | `C:\Users\meida\Desktop\aura\aura-app\aura` | Git repo; **leave changes uncommitted** for the user to push. |
| qwoo-core mirror | `…\hostinger_mm\domains\meidanm.net\public_html\wp-content\plugins\qwoo-core` | A Hostinger mirror of the public qwoo-core project (Meidanmor/qwoo-core). PhpStorm uploads all of `hostinger_mm` to the server. **Never put platform code or notes here.** |
| This guide | `C:\Users\meida\PhpstormProjects\CLAUDE.md` | Loaded automatically in every session under PhpstormProjects. |
| Saved code | `C:\Users\meida\PhpstormProjects\qwoo-saved\` | Features taken out but kept to bring back (each folder has a README and a restore script). Not deployed. |
| Roadmap | https://claude.ai/artifact/9CAU1z2V2zxm3UQhRBimo5 | Source file in the session scratchpad (`roadmap.html`; latest copy in `a8f25bb0-…`). If it's missing, read the artifact and rebuild from it. Statuses are in the page itself; update it each round. |

## Architecture

- **Store creation** is a job chain on the platform (`includes/jobs/class-qp-job-create-store.php`):
  Hostinger subdomain → WordPress → plugins → qwoo-core → content repo from a template
  (`YallaFlow/template-*`) → Vercel project → store address → import template → **apply_branding**
  → health check. The chain continues itself through REST runner links (`QP_Runner`). **No cron.**
- **Platform → store calls** are signed (`QP_Store_Link::call`, Ed25519, 60s single-use tokens).
  The dashboard API (`class-qp-portal-api.php`) relays most screens to the store with
  `on_store('<action>')`. The store answers in `includes/class-platform-dashboard.php`, where every
  action is allow-listed. Only known fields are forwarded (see `dashboard_product_save`), so a new
  product field needs adding there too.
- **Publishing (on the store, 0.33.0):** the Shop Builder (`includes/shop-builder/*`) stages JSON
  configs and images through the `admin-options.php` batch helpers (`aps_github_start_batch` & co.,
  `push_all_pages`). For stores in "local" mode they go to `Qwoo_Site_Content`
  (`includes/class-site-content.php`): `uploads/qwoo-site/files/{git blob sha}.{ext}` plus a manifest
  per version (`v/{version}.json`: files map + the config JSON inline), option `qwoo_site_current`,
  last 10 versions kept. `GET qwoo/v1/site` (proxy secret) says which version is live. The storefront
  (`src-ssr/site-content.js`, an Express middleware before the static files) checks every 3s in the
  background through its own CDN (`/__site/current`, `Vercel-CDN-Cache-Control: max-age=3`), loads
  a new version once (`/__site/m/{v}`, immutable), keeps it in memory, sets
  `globalThis.__QWOO_SITE` for the render, and serves the content paths and `/manifest.json` from it.
  No GitHub, no Vercel build; live in ~2s (tested locally). Languages, store name, colours
  (`<style id="qwoo-colors">`), favicon links and theme colour come from it at run time
  (`window.__QWOO_SITE__` for the browser; routes are built per router from the live languages).
  A store switches to local mode for good when its storefront first calls `qwoo/v1/site` with
  `X-Qwoo-Storefront: 2`; its first version copies the GitHub content repo (tarball via PharData,
  else file by file). Older stores still commit to GitHub, whose webhook triggers a Vercel deploy.
  Builds (`scripts/fetch-content.mjs`) take the store's files when it publishes on itself, else the
  repo (with retries and named errors).
  **Vercel serves the project's `public/` as plain files before any rewrite or function**: a
  store build that took the store's files removes them from `public/` again
  (`scripts/after-build.mjs`, marker `.qwoo-content.json`), or the build-time copies hide the
  live version (found 2026-10-10: stale configs on navigation). The service worker never
  precaches `config/**`, `data/**` or `manifest.json`. A due version check waits up to 500ms
  (`CHECK_WAIT_MS`); the CDN keeps `/__site/current` 2s with no stale-while-revalidate.
- **Emails** go through Resend (`QP_Resend`), from `<slug>@` the platform mail domain or the owner's
  own domain.
- **Custom domains:** `QP_Store_Domains` (Vercel API) and Settings → Domain.

### Store builder (dashboard "Store builder", routes `#/design/*`)
- Six groups (`dashboard/Design.vue`):
  - Pages
  - Shop pages (All products, Category pages, Product page, Cart, Checkout)
  - Blog (Blog page, Blog post)
  - Menus
  - Header & footer
  - Brand & app (Branding, App, Contact button)
- **Pages** (`trait-sb-pages.php`, `design/PagesEditor.vue`): up to 50 pages, nested up to 6 levels,
  stored in `shop_builder_options['custom_pages']`.
  - Each page is `{id pg_…, title, slug, parent, status, show_title, role, seo, sections}`.
  - Publishing writes `config/pages.json` (`{pages:[{id,path,title,parent,role?}]}`) and
    `config/page-{id}.json`.
  - Live pages are remembered in option `qwoo_published_pages`, which feeds SEO, the sitemap and
    old-address 301s.
- **Roles** (one page each): `home` (the homepage, path `''`, top level, holds no pages, always
  published), `privacy`, `terms`, `returns`.
- **`trait-sb-store-pages.php`:**
  - `ensure_store_pages()` turns an old store's Homepage tab (hero + sections) into a Home page.
    It runs on `design_get`, on `admin_init`, and in setup's `apply_platform_branding`, where it
    also adds the legal pages as drafts.
  - `store_page_template($role)` holds the legal texts. They live on the store only; the dashboard
    asks for them via design op `page_template`.
- **Menus** (`trait-sb-menus.php`): `options['menus']`, published as header.json `menu` and
  footer.json `columns`. Menus are edited only in the Menus tab (the user's decision). Item types
  include builtin `blog` (/blog, not in a new store's default menu) and `blog_category`.
- **Slots and templates** (`class-sb-constants.php`): `PAGE_SECTION_LOCATIONS` covers shop,
  category, product, cart and checkout. `TEMPLATE_PAGES` (blog, blog_post) are fully block-built,
  with built-in defaults (`default_template_sections`; aura `utils/blog-templates.js`); blog.json
  is only published once the owner saves that tab. Dynamic blocks have `'category' => 'dynamic'`
  and a `'pages'` list (BlockPicker's "This page").
- **Layouts** (`trait-sb-layouts.php`, `LAYOUT_PAGES`): extra versions of the product, category,
  blog and blog_post pages for chosen products / product categories / blog categories, stored in
  `options[page]['layouts']` (`{id lay_…, name, conditions, sections}`, up to 20). The dashboard
  edits them as `pages['page@layId']` (`LayoutsBar.vue`). Published with `*_slugs` added; aura
  picks the first match (`utils/layouts.js`), else the default.

### Discount codes (dashboard "Discounts", routes `#/discounts/*`)
- WooCommerce coupons with all of wp-admin's options, in the store's
  `includes/trait-platform-coupons.php` (actions `coupons_list`, `coupon_get`, `coupon_save`,
  `coupon_delete`, `coupons_enable`). Fields use WooCommerce's own prop names; the platform
  forwards only those (`dashboard_coupon_save`).
- The storefront applies codes through the Store API: no aura changes needed.
- WooCommerce stores codes in small letters. Status is publish (Active) or draft (Paused).
- Free-shipping codes need a Free shipping method with `requires` coupon / either / both, which
  Settings → Shipping now offers ("Who gets it").

### SEO (own, no Yoast at all)
- `includes/class-seo.php` provides `qwoo/v1/seo` and `qwoo/v1/sitemap`, owner-editable fields,
  automatic descriptions, and an audit (`seo_audit`, SeoCheck.vue).
- aura renders the meta tags, JSON-LD (`src-ssr/middlewares/render.js`), the sitemap and robots.

### Storefront (aura) notes
- **Routes:** `':pagePath(.+)'` → `CustomPage.vue`. `IndexPage.vue` shows the role-`home` page
  (`homePageOf()`), with a fallback to the old `home.json` hero, and default "Our products"
  sections when there are none.
- **Hydration:** every `window.__X__` used at hydration must be in render.js states.
- **Images:** logo, hero and section images are published as `{attachment id}-{name}`, with
  `logo_path` / `hero_image_path` in the config. Their `vercel.json` headers make them immutable
  for a year. Hashed `/assets/` files are immutable via `src-ssr/server.js`.
- **No-cache API:** the store sets `rest_send_nocache_headers`, the SSR proxy rewrites
  `/wp-json` cache-control, and the service worker uses NetworkOnly for API GETs. This is because
  Hostinger adds a 7-day public cache to anything without headers.

## Decisions (and why)

- **One stack per store**, not multi-tenant: isolation and simpler hosting.
- **No cron** anywhere: Hostinger shared hosting. Use self-continuing chains instead.
- **Own SEO, no Yoast**, not even as a fallback.
- **CDN cache clearing was rejected**: rely on no-cache headers for the API only, and long caching
  for images whose name changes when they're replaced.
- **Platform stays international:** local payment providers only for stores in that country (Grow
  for Israel, which the user is building). English UI for now; Hebrew/RTL later.
- **Legal templates** are plain-language starting points with `[brackets]`; at setup they're
  drafts, never published automatically.
- **Homepage:** an existing owner's hero text is kept when converting. New stores get the store
  name, the "What do you sell?" description (an optional signup field, also saved as the
  WordPress tagline) and an "Our products" button.
- **Store builder hero button** uses the `secondary` colour, because templates keep `primary`
  light.
- **Set aside for now (2026-10-08):** caching storefront HTML at Vercel, and moving store backends
  to real subdomains. Don't build them unless the user brings them back.
- **Public launch (user, 2026-10-10):** no public sign-ups until the roadmap's "Launch readiness"
  list is done. **Free to build, pay to open**, no card to start: unpaid stores show "Coming
  soon", take no real orders, connect no domain; unused unpaid stores are paused after 30 days
  and deleted 30 days later (emails first). Stores move to their **own domain** (not
  meidanm.net; on the Public Suffix List); no migration code, since there are no public stores
  yet. Also before launch: report + suspend a store, email caps per store, bot check and sign-up
  limits, platform terms / acceptable use / DPA (lawyer), one real live-money order.
- **Plan billing:** the provider keeps the card and charges by itself (subscriptions + webhooks
  → `QP_Plans`); never store cards. Provider not chosen: Stripe likely won't take an Israeli
  business (to check); options Grow / Cardcom / Tranzila, or Paddle / Lemon Squeezy as merchant
  of record. Not urgent (user).

## Working rules

- **Ask before building anything that involves choices.** Commit/push only when asked (pushing
  qwoo-core-platform is pre-approved). Creating or pushing repos in the YallaFlow org needs an
  explicit OK.
- **Secrets** (tokens, `.pem`, `QWOO_PLATFORM_KEY`, `QWOO_PLATFORM_RESEND_KEY`, the IMAP password)
  live only in wp-config.php. Never paste or commit them. Never type passwords into live sites.
- **Security first:** the user wants "the most secured platform with the highest standards".
- **Writing:** plain, short, owner-facing wording in the UI and in replies.
- **Bash heredocs drop backslashes here.** Write edit scripts with the Write tool, then run them
  with `node`. Files may be CRLF, so scripts replace `\n` with the file's newline. Python isn't
  installed.
- **Stop local servers after testing**, and rebuild aura without the test env vars.

## Local testing

- **Node:** scratchpad `node22/node_modules/node/node_modules/node-win-x64/bin/node.exe`. The
  scratchpad is
  `C:\Users\meida\AppData\Local\Temp\claude\C--Users-meida-PhpstormProjects-hostinger-mm-domains-meidanm-net-public-html-wp-content-plugins-qwoo-core\<session>\scratchpad`;
  test files are in `e0ceb96b-…/scratchpad/qp/` (node lives there too).
- **Git Bash rewrites `/wordpress/...` mount paths**: run Playground with `MSYS_NO_PATHCONV=1`.
- **Rate limit:** the platform allows 120 dashboard calls per 5 minutes per owner. Running a flow
  script several times in a row hits it (429); wait 5 minutes.
- **WordPress Playground:** **boot one at a time**, because parallel boots race on unpacking.
  ```
  node node_modules/@wp-playground/cli/wp-playground.js server --port=9500 --php=8.2 --define AUTH_KEY "store-test-auth-key-9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d" --mount-dir "<qwoo-core-platform>" /wordpress/wp-content/plugins/qwoo-core --mount-dir "<qp/muS-dash>" /wordpress/wp-content/mu-plugins --blueprint=./blueprintB.json
  node node_modules/@wp-playground/cli/wp-playground.js server --port=9400 --php=8.2 --mount-dir "<qwoo-platform>" /wordpress/wp-content/plugins/qwoo-platform --mount-dir "<qp/mu-dash>" /wordpress/wp-content/mu-plugins --blueprint=./blueprint.json
  ```
- **Seed:** `9400/?qp_seed_owner=1` (gives store id 1), then `9500/?qp_seed_conn=1` and
  `9500/?qp_seed_orders=1`. Log in with `9400/?qp_owner_login=1`.
- **Test helpers** (in `muS-dash`):
  - `?qp_pages_publish=1`: pages + menus against a fake batch.
  - `?qp_publish_fake=1[&reset][&image][&setup]`: a full publish against an in-memory GitHub;
    `setup` runs the branding step.
  - `?qp_seo_path=`, `?qp_seo=1`, `?qp_try=`.
- **Playground runs on SQLite:** MySQL-only SQL (e.g. `FIND_IN_SET`) silently matches nothing
  there. Write portable SQL (see `media_in_list_sql`).
- **Mount paths** must be Windows-style (`C:/…`), not `/c/…`; the "stale Playground temp dirs"
  EACCES line at boot is harmless.
- **Flow scripts** in `qp/`: `home-flow.mjs`, `launch-flow.mjs`, `bugs-flow.mjs`,
  `round2-flow.mjs`, `coupons-flow.mjs`, etc. They print PASS/FAIL.
- **Storefront:**
  1. Build with `WP_BACKEND_URL=http://127.0.0.1:9500 PROXY_SHARED_SECRET=test-proxy-secret npx quasar build -m ssr`
     (Quasar inlines these at build time).
  2. Copy the published pages in with `node qp/round2-publish-local.mjs`.
  3. Serve with `node scratchpad/seo-serve.mjs` on port 9600.
  4. Stop the server before rebuilding (it locks dist), and rebuild normally afterwards.

## Current status (2026-10-10, round 11)

Built: sign-up and setup; Overview with the "Get ready to sell" checklist; products (options,
SEO, weight and size, formatted descriptions, sale dates, sorting and filters, bulk changes,
duplicate, WooCommerce-format CSV import/export); categories; orders (cash-on-delivery aware);
customers (accounts and guests, notes, editing, CSV export, privacy deletion); product reviews
(verified buyers, owner approval, replies, review-request emails); blog (posts, categories,
scheduling, Latest posts section, block-built blog templates); Store builder layouts by product /
category; cart and checkout slots; checkout terms checkbox and "create an account"; customers
deleting their own account; settings; payments (Stripe, COD, bank transfer, local
providers); domains; Resend email; the Store builder with pages, menus, the homepage as a page,
ready-made legal pages, live preview and versions; own SEO; support chat; discount codes;
Hebrew dashboard and storefront (RTL), store language chosen at setup; extra storefront
languages (premium addon) with prefixes, Store builder copies, item translations, hreflang and
per-language sitemap; plans (Basic/Pro/Plus) and the Premium addons screen; a media picker in
every image field and a Media screen; SVG images everywhere; videos in product galleries (round 9);
publishing on the store itself, live within seconds, no GitHub commit or Vercel build (round 10);
moving an old WordPress / WooCommerce store in through the YallaFlow Mover plugin (round 11).

Latest (all live, confirmed working by the user on 2026-10-10): **qwoo-platform 0.33.0**,
**qwoo-core-platform 353344d**, aura **a4153a9** (17cc6c0 "new store files load strategy" + a4153a9
"fix stale data", on top of cdde790; includes the round 9 fixes: carousel/drawer, logo size,
carousel arrows, homepage live preview).

Round 11: qwoo-platform 0.34.0 + qwoo-core-platform **128c9c2** live; the user tested a move and
it works (2026-10-11). **0.34.1 to upload** (dashboard only, no store change): sign-up option
removed, the optional choices remembered.

**Done (user, 2026-10-11):** the sign-up option is removed (saved in
`qwoo-saved/signup-move-in/`: `node restore.cjs --apply` puts it back); the "posts came in
unasked" report is closed (no bug found on a first move; the second-move box reset is fixed).

Round 12 (2026-10-11), **not tested by me** (the user tests it; don't run Playground for it): qwoo-platform **0.35.0** (dashboard), qwoo-core-platform **47c1b1b** (pushed), aura
uncommitted. Order: upload 0.35.0, Update all stores, then push aura (old aura reads "default"
alignment safely; new aura with old stores would show saved "Left" literally).
- Background image per screen size: `bg_image` responsive; 0 / '' on tablet/mobile inherits
  (sanitizer, `output_fields`, dashboard `fields.js`, wp-admin `sb-builder-fields.js`); aura
  `--sb-bg-img(-t|-m)`.
- "Default" alignment in `ALIGN_OPTIONS` (fields that defaulted to left now default to it);
  `upgrade_default_alignment()` (flag `_align_default`; options, versions, templates; forced
  after a template import) turns saved desktop "left" into "default". aura: `alignToFlex` is
  direction-aware (left/right are physical, "default" = flex-start), `alignToText`
  ("default" = start).
- Sections from another language: `shop_builder_options['section_sync'][code][key] = source`,
  saved with the design (`sync`), applied at publish (`with_section_sync`, loops fall back to
  the own copy). Dashboard `SectionsSync.vue` (Copy once / Always use them), `design.sources`.
- Priority images (aura `utils/priority-image.js`, `usePriorityBlock`): the first section per
  screen size (top slots only on slot pages) → `fetchpriority=high` + head preloads with media
  queries; the header logo drops to auto; carousels no longer make every first slide high; the
  shop grid's first 3 cards lose high priority when a section above has the image.
- **Fix (0.35.1, store e5f8890):** responsive images are published as the desktop payload
  `{ url, width, height }` plus `tablet` / `mobile` (not `{ desktop, tablet, mobile }`): the old aura
  read `bg_image.url` and showed no background. The user's aura push 778b488 failed its build on an
  unused `computed` import in RelatedProductsSlider.vue (aura lint errors stop the build), so the
  stores kept the old aura. Always build aura before saying it can be pushed.
- **Stale configs found on the live store (2026-10-11):** when the site middleware had no live
  version (cold start, store slow), the build's copy went out with express.static's 30-day
  `max-age` and Vercel's CDN kept serving it (HIT for hours, every browser). Fixed in
  `site-content.js`: fallback content answers are `no-store`. The next aura deploy also clears
  the CDN. Why the store couldn't be reached at that moment is not known.

Round 13 (2026-10-11): **brand fonts**, tested locally by me. qwoo-platform **0.36.0** (dashboard
only), qwoo-core-platform **1e563d5** (pushed), aura uncommitted (builds). Order: upload 0.36.0,
Update all stores, publish, then push aura (old aura ignores the new fields; new aura with an old
store shows Roboto as before). See "Round 13 notes" below.

**Waiting on the user:** uploading 0.34.1. Not tried yet: a big store. When a round changes the store plugin, always say where to
update: platform wp-admin → Stores → **Update all stores** (or a store's Store plugin card); stores
only get qwoo-core-platform when created or through this (the user was confused by this on
2026-10-09).

**Agreed work queue (user's order, 2026-10-08):** all done: More for products (round 3),
Customers (round 4), Product reviews (round 5), Blog (round 6).
- Blog (decided): posts go live from the store (no Store builder publish); blog categories,
  scheduled posts and a "Latest posts" section; addresses /blog and /blog/<post>; no automatic
  menu link; no "products in posts" for now.
- Reviews (decided): stars + text (no photos); stars on the product page only (plus Google's
  aggregateRating); owner alerted by a dashboard count and an email; public replies; review
  requests by email.
- Customers (decided): accounts and guests together; profile and orders, edit details and a
  private note, CSV export, delete a customer's data. No marketing-consent checkbox for now.
- Reviews: the owner turns them on or off; only verified buyers can review; the owner approves
  every review before it shows.
- Blog: an article editor (title, cover image, formatted text, category, excerpt, SEO), not the
  section builder.

### Products notes (round 3)
- Store code: `includes/trait-platform-product-tools.php` (bulk, duplicate, CSV, scheduled sales)
  and `includes/class-product-csv.php` (WooCommerce exporter/mapper subclasses, loaded lazily).
- Store actions run with no WordPress user: the import grants `manage_product_terms` only for
  its run, so it can create categories.
- Due scheduled sales are started and ended on `rest_api_init`, every 15 minutes at most
  (`wc_scheduled_sales`).
- Bulk changes and imports turn off the "on sale" push notifications for that request.
- Test scripts: `50a594a9-…/scratchpad/store-tools.mjs` (store, via `?qp_try`, which now also
  reads POST `qp_params`) and `qp/products-more-flow.mjs` (through the platform).
  `muS-dash/qp-src.php` prints WooCommerce source files (`?qp_src=includes/...`).

### Customers notes (round 4)
- Store code: `includes/trait-platform-customers.php`. Totals come from one SQL query per
  order storage (custom order tables or posts): test both.
- Test seed: `9500/?qp_seed_customers=1[&hpos=1]` (`muS-dash/qp-customers-seed.php`); it
  deletes orders in the current storage before switching, since WooCommerce refuses to switch
  otherwise. Tests: `50a594a9-…/scratchpad/store-customers.mjs [hpos]` and
  `qp/customers-flow.mjs` (reads the local test owner's password from the seed file).
- The Playground site answers before WooCommerce is installed: wait for
  `?qp_src=woocommerce.php` before seeding.

### Reviews notes (round 5)
- Store code: `includes/class-reviews.php` (storefront routes, emails, request queue) and
  `includes/trait-platform-reviews.php` (dashboard). aura: `ProductReviews.vue`, `ReviewForm.vue`,
  `pages/ReviewPage.vue`, render.js `aggregateRating`.
- **Rate limits go in the REST callback, not `permission_callback`:** WordPress also runs every
  method's permission callback to build the `Allow` header, so a limit there counts GETs too (and
  counts the matched request twice). The storefront's existing `/login` limit has this problem.
- `wc_get_orders` ignored a `meta_query` on the posts order storage (it returned every completed
  order), so review requests use a queue option instead. Don't rely on order meta queries.
- `.review` is already a class in the dashboard (signup confirmation): the Reviews screen uses
  `rv-*`.
- Test helpers: `muS-dash/qp-reviews-test.php` (`?qp_mail_capture=1|0`, `?qp_mails=1`,
  `?qp_review_link=<order>&p=<product>`, `?qp_order_status=<order>&to=`, `?qp_review_force=1`,
  `?qp_rl_reset=1`, `?qp_debug_log=1`). Seeded customers' test password: in
  `qp-customers-seed.php`. Tests: `50a594a9-…/scratchpad/store-reviews.mjs` and
  `qp/reviews-flow.mjs <order> <order>`.

### Blog notes (round 6)
- Store code: `includes/class-blog.php` (storefront routes, cleaning, scheduled posts, sample
  post) and `includes/trait-platform-blog.php` (dashboard). SEO paths and sitemap in
  `class-seo.php`. aura: `pages/BlogPage.vue`, `pages/BlogPostPage.vue`,
  `components/blog/BlogCard.vue`, `components/sections/LatestPostsSection.vue`, `api/blog.js`,
  `sanitizeBlogHtml`, render.js `blogData` state + BlogPosting.
- Dates on the storefront use the store's day (`day`) in a fixed format: locale- or
  time-zone-dependent text breaks hydration.
- The storefront's CSP allows https images only, so covers don't show in the http local test.
- `HtmlField`: `subheading` and `image` tools are opt-in (`tools` prop; `upload` for images); an
  empty box starts with a paragraph on focus, and an empty paragraph counts as empty.
- Test helpers: `muS-dash/qp-blog-test.php` (`?qp_blog_reset=1`, `?qp_post_due=<id>`,
  `?qp_post_status=<id>`, `?qp_block_schema=<type>`). Tests:
  `50a594a9-…/scratchpad/store-blog.mjs`, `qp/blog-flow.mjs`. A test homepage with the section:
  write `dist/ssr/client/config/pages.json` + `page-pg_home.json` after building.

### Round 7 notes (2026-10-09)
- The user asked me to decide preferences myself and list them as questions and answers.
  Decided: a hybrid (slots stay; conditional layouts for product/category/blog pages; product
  dynamic blocks later); account deletion confirmed by an emailed link (`class-account-deletion.php`,
  refused while orders are open, owner told); terms checkbox only when a terms or privacy page is
  live, on by default, enforced by the store (`class-checkout-extras.php`, order meta
  `_qwoo_terms_accepted`); "create an account" on by default (syncs WooCommerce's options);
  Categories became a tab inside Products ("Product categories"), blog categories a tab in Blog
  (`SubTabs.vue`); list duplicates stay on the list with a "Copy made" notice; review requests can
  go "right away" (`request_days` 0, sent after the response); Reviews has a Turn off button.
- Test helpers: `muS-dash/qp-r7-test.php` (`?qp_r7=terms|delete|review_now`); the fake publish
  now logs every config as `log.cfg`. Tests: `50a594a9-…/scratchpad/store-r7.mjs` (reset limits
  first with `?qp_rl_reset=1`), `r7-local.mjs` writes a fake publish into aura's dist.
- Proxy-only storefront routes need the `x-proxy-secret` header in `rest_do_request` tests;
  account deletion needs `frontend_domain` set.

### Round 8 notes (2026-10-09): languages, plans
- **CSV import fix** (store ce66112 → 2c74f34): rows match by SKU, else by ID + same name (or ID
  alone when the file has no Name column), else they're new. IDs are renumbered before the import
  (`Qwoo_Product_CSV_Importer` takes matched IDs as they are); new products keep
  `_qwoo_source_id` so the same file updates them next time. Test: `f98a25b0-…/scratchpad/store-csv.mjs`.
- **Decisions (user, 2026-10-09):** extra languages are a premium addon (main language free);
  fixed addresses, never translated slugs, only a language prefix (`/en/...`) that the owner can
  rename (e.g. /us); show the "also in …" bar; translations per item (not WPML duplicate posts);
  English + Hebrew only for now; store language and dashboard language chosen separately at
  sign-up and changeable later; plans Basic / Pro / Plus; first addons: extra languages, gift
  cards, loyalty points (I chose: Pro = extra languages + loyalty, Plus = all; gift cards and
  loyalty "coming soon").
- **Dashboard i18n** (qwoo-platform-app): `src/lib/i18n.js` (`t()`, `tn()`, English text as key,
  `{name}` placeholders, patterns for server messages), `src/i18n/he.js` (≈2,200 entries, a
  hashed lazy chunk). `api.js` translates every server message. RTL via logical CSS properties
  (+ a few `[dir="rtl"]` rules at the end of app.css). Missing texts: set localStorage
  `qp-i18n-debug=1`, then sessionStorage `qp-i18n-missing` lists them. Scripts (scratchpad
  `f98a25b0-…`): `i18n-wrap.cjs`, `i18n-wrap2.cjs`, `i18n-audit.cjs`, `i18n-extract.cjs`,
  `i18n-php.cjs`, `i18n-merge.cjs`, `he-build.cjs` (he/*.json → he.js), `css-logical.cjs`.
- **Platform:** `QP_I18n` (owner language: user meta `qp_lang`, cookie `qp_lang`,
  Accept-Language; Hebrew emails), route `account/language`, `<html lang dir>` at render.
  `QP_Plans` (plans in store state `plan`, addon catalog, interest per user meta), routes
  `dashboard/addons`, admin plan picker on the store screen, interest counts on Settings.
- **Store:** `Qwoo_Store_Language` (option `qwoo_store_lang`, WPLANG, language packs,
  `public/config/languages.json`), `Qwoo_I18n` (qwoo/v1 `message` + emails + new-store content
  in the store's language; Hebrew legal templates), actions `store_language`, `plan_set`
  (`Qwoo_Platform_Dashboard::has_feature()`).
- **aura:** `src/i18n/index.js` + `boot/i18n.js` (`t`/`tn` globals, `useI18n()`, Quasar `he`
  lang pack), `src/i18n/he.js`, languages from `public/config/languages.json` at build
  (`process.env.QWOO_LANGUAGES`), `postcss-rtlcss` (every rule gets `[dir]` variants; `<html dir>`
  must always be set, App.vue `useMeta htmlAttr`). Header buttons use `data-action` (not the
  translated aria-label). Test a Hebrew build with a temporary `public/config/languages.json`
  `{ "main": "he" }` — delete it afterwards.
- **Extra languages (built):**
  - Store: `Qwoo_Store_Language` extra settings (option `qwoo_languages`: extra, prefixes,
    live; reserved and page-address prefixes refused; off without the plan, but removable);
    `request_lang()` from the `X-Qwoo-Lang` header (live extras only). `Qwoo_Translations`
    (meta `_qwoo_i18n` on products, terms, posts; Store API getters filtered, and
    `switch_to_locale` so WooCommerce messages follow). `Qwoo_I18n::default_code()` = the
    language being published (`in_language()`), else the request's, else the store's.
  - Store builder: `SB_Languages` (`trait-sb-languages.php`): copies in
    `shop_builder_options['i18n'][lang]`; pages carry `translated`; a draft identical to the
    main language isn't saved as a translation; publishing writes `public/config/{lang}/`
    (only the translatable files) and remembers live pages per language
    (`qwoo_published_pages_{lang}`). SEO (`class-seo.php`): canonical with the prefix, own SEO
    title/description per language, posts only when translated, sitemap `base` with prefix.
  - Platform: `dashboard/languages` (plan checked), `dashboard/design?lang=`, `translations`
    forwarded on product/category/post saves.
  - Dashboard: Settings → Languages (`LanguageSettings.vue`), Store builder language picker
    (`design.language`, `translating()`: no adding/moving/readdressing pages; Branding and App
    tabs shared), `TranslationsCard.vue` in the product, category and post editors.
  - aura: `src/i18n/lang.js` (prefixes, `currentLang()`, `withLang`, `stripLang`); the route
    tree is repeated under each prefix (names `products@en`); the router adds the prefix to
    every link/push and reloads when the language changes; `render.js` runs each render in an
    AsyncLocalStorage (`globalThis.__QWOO_LANG_ALS`) and adds `X-Qwoo-Lang` to the server's
    `/wp-json/` fetches; the browser's fetch is patched in `boot/i18n.js`;
    `loadPageConfig` reads `/config/{lang}/x.json` (`configName()`); hreflang links for
    home/shop/products/categories; `LanguageSwitcher.vue` (header and mobile menu),
    `AlsoInBar.vue` (browser language, dismissal in localStorage `qwoo-language`);
    `api/sitemap.js` lists each language. An extra language without its own Home page shows
    the default "Our products" sections.
  - The main language moved from Store details to Settings → Languages (user, 2026-10-09);
    making an extra language the main one removes it from the extra list (translations kept).
    "Unknown action." from an older store now shows as "Your store needs an update".
  - Storefront fixes after going live (2026-10-10, user's store
    https://jewelry-shop-10.shops.meidanm.net, main English, Hebrew at /he; browse it to check
    problems instead of a local setup): Quasar config `lang: { noHtmlAttrs: true }` (Quasar set
    `dir=ltr` in the browser before the app's language loaded: a left-to-right flash), so
    `<html lang dir>` is written by render.js from the address and set at boot (Quasar Meta's
    useMeta did NOT write it on the server: pages came out `<html >`, all left-to-right, and
    swipes mixed up); sale/sold-out badge uses class
    `.card-badge` (inline `left` didn't flip, so it covered the wishlist button); no inline
    left/right styles (they don't flip). The "also in" bar was removed (user); the switcher shows
    flags + names (English: US flag, UK when the prefix is uk/gb), at the bottom of the mobile menu
    and in the desktop header. Swipes open the drawer on the edge pulled from. Missing
    `/config/*` and `/data/*` files answer 404 in render.js (before, a missing config made the
    server render itself in a loop); an extra language falls back to the main language's file
    except pages.
  - Fixed on the way: `stores/products.js` no longer answers server renders from products an
    earlier request loaded (it leaked between visitors and languages).
- **Store plugin updates (0.30.0, user's choices 2026-10-09):** the admin starts them (per store
  or "Update all stores"); the newest commit on the branch is offered; one-click roll back to the
  previous version; a health check after each update that rolls back by itself; the storefront
  is published once afterwards. Test helper `mu-dash/qp-update-test.php`
  (`?qp_update_test=start[&broken=1]|tick|state`, marks the install as done since there's no
  Hostinger locally; `?qp_admin_login=1` signs the browser in as the local admin). Tested: update
  → check → publish, the "already running" and "no hosting details" guards, a failing check
  rolling back after 3 minutes. Not tested: a real install on Hostinger.
- **Plans reach the store late (0.30.1):** the user set Pro while the store ran an old plugin, so
  the store never got it and Languages showed "Sell in more languages". The platform now resends
  the plan (`QP_Plans::sync`) on a mismatch in `dashboard_languages`, before
  `dashboard_languages_save`, and in the update job's publish step.
- **Tests:** `f98a25b0-…/scratchpad/store-langs.mjs` (store; the first run on a fresh store
  passes; reruns fail 3 checks that assume untranslated items), `store-langs2.mjs`,
  `langs-local.mjs` (fake publish into aura's dist, language folders included),
  `sitemap-test.mjs` (runs api/sitemap.js; run from the aura folder), `missing.mjs <src> <he.js>`
  (texts with no Hebrew). The fake publish helper (`qp-publish-fake.php`) now logs
  `en/…` and `page-…` files. Local storefront navigation waits ~4s for the service worker
  (sw.js doesn't load in the local server): wait before checking the URL.

### Round 9 notes (2026-10-10): media picker, Media screen, PSI
- **PSI drop (live store, 2026-10-10):** the score fell from 90+ to ~70 because of the logo, not
  RTL. The store publishes the original upload as the logo (`trait-sb-github-push.php`
  branding: `file_get_contents` of the attachment): a 1254px, 516 KB PNG shown at 84×19, with
  `fetchpriority="high"`. Blocking it in Lighthouse: ~70 → 82–89, LCP 6.4s → 3.5s. RTL CSS
  costs ~0.1s. Also found (not fixed): the homepage `ProductGridBlock.vue` cards are all
  `loading="lazy"` (the shop grid makes its first 3 eager), and product images' `sizes` says
  100vw. The user is testing with a smaller logo; a resized/WebP logo at publish was offered.
- **Decisions (user, 2026-10-10):** product photos pick several at once; alt text is edited in
  the picker; a Media screen too (browse, upload, rename, alt text, where used, delete).
- **Dashboard:** `src/media/` (`MediaLibrary.vue` the picker, `MediaDetails.vue`,
  `media.js`, `media.css`); `dashboard/Media.vue` (#/media, menu after Blog). Used by the
  product photos (`multiple`, `max`; dropping files on the tile still uploads directly), the
  category photo, blog cover, images in posts (`HtmlField` image tool, no `upload` prop now),
  share images (`SeoCard` "+ Choose") and the Store builder (`MediaField`). Items carry
  `product` (woocommerce_thumbnail) and `large` URLs: editors use the size they used for
  uploads before. Generic `.modal` rules moved to app.css.
- **Store:** `includes/trait-platform-media.php` (`media_get` with `uses`, `media_save`
  alt/title, `media_delete`); the list is still `design_media`
  (`Shop_Settings_Builder::platform_media`, now with alt/product/large) so older stores'
  pickers keep working; `platform_media_used_ids()` walks `shop_builder_options` for
  Store builder use. Delete clears galleries, category thumbnails and `_qwoo_seo` image_id;
  WordPress clears `_thumbnail_id`; images inside text stay broken (the dashboard warns).
- **Platform:** routes `dashboard/media/{id}` GET/POST/DELETE (only alt and title forwarded).
- **Tests:** `qp/media-flow.mjs` (21 checks), `qp/media-seed.mjs` (uploads 4 test images).
- **SVG and video (user, 2026-10-10):** SVG allowed in every image field; product photos warn
  when the main one is an SVG (share images warn too: WhatsApp/Facebook don't show SVG). The
  Media screen has one upload for any file and filters (All / Photos / SVG / Videos, month; the
  month menu shows from 2 months on). Product galleries hold photos and videos together.
  - SVG: `QP_Svg` (platform) and `Qwoo_Svg_Sanitizer` (store) both clean it, 512 KB max;
    `media_svg_upload` allows the type only during that upload. `Qwoo_Media_Support`
    (`class-media-support.php`) answers `wp_get_attachment_image_src` for SVGs with the file
    itself (size from width/height or viewBox), so WooCommerce, the Store API and the
    dashboard show them; `Qwoo_Media_Support::is_image()` replaces `wp_attachment_is_image`
    in the store's checks (variants, categories, blog, SEO).
  - Videos: WooCommerce keeps photos only (the first photo is always the main one, even if a
    video was put first); meta `_qwoo_gallery` keeps the full order; Store API
    `extensions.qwoo.videos` [{id, position, src, type}]; aura `ProductPage.vue` `gallery`
    splices them in (videos pause when the slide changes; the lightbox shows photos only).
    Variant photos and share images exclude videos (`stills`).
  - List kinds (design op `media`): image (all images), photo, svg, video, all; `month`;
    `months: true` lists months. Dashboard CSP now has `media-src 'self' https: blob:`.
  - Tests: `qp/svg-video-flow.mjs` (27 checks; Store API calls need the
    `x-proxy-secret: test-proxy-secret` header), `qp/video-seed.mjs` (a minimal MP4 header
    passes the store's type check). Local storefront: run `seo-serve.mjs` from the aura root.

### Round 9 fixes (2026-10-10, 0.32.1)
- **Blocked page after swiping a carousel:** MainLayout's drawer swipe took the backdrop's
  `hidden` class off and only put it back on pointerup; when the browser starts scrolling a
  carousel it sends pointercancel instead, leaving a transparent full-screen backdrop over the
  page (Quasar only sets the class again when a drawer opens/closes). `resetDrag(el, closed)` now
  restores it, and swipes that start inside anything that scrolls sideways
  (`inSidewaysScroller`) never pull a drawer.
- **Header logo:** was hard-coded `width="84" height="19"`. The store now publishes
  `logo_width` / `logo_height` in branding.json (`wp_get_attachment_image_src` full, SVGs
  included); the header uses them, and `.header-logo` caps it at 150×44 (120×36 on phones).
  Older stores have no size until their next publish (CSS only). No logo size setting in
  Branding (user, 2026-10-10): it belongs in a header & footer builder instead.
- **Carousel block arrows** (`CarouselBlock.vue` row mode): same look as AppCarousel's (plain
  chevrons in the secondary colour, 20px gutters, at 38% height), shown on phones too; RTL
  scrolling fixed (negative scrollLeft).
- **Homepage live preview:** the dashboard's `previewPayload` didn't send pages' `role`, and
  IndexPage looks for role `home`. Now sent; IndexPage also matches the published Home page's id.
- My browser pane can't test the storefront's drawers: they mount in a requestAnimationFrame,
  which doesn't run while the pane is hidden.

### Round 11 notes (2026-10-10): moving an old store in
- **Decisions (user, 2026-10-10):** WordPress first, other platforms later; a helper plugin
  only (no API keys; logging in with the owner's password was rejected as unsafe and fragile);
  password hashes come over, and customers whose hash can't be checked get a set-password
  email on their first sign-in; optional: orders, discount codes, reviews, blog posts +
  categories (no pages); in Settings only (the sign-up option was removed on 2026-10-11 as too
  complicated for sign-up: the user's call; the code is saved in `qwoo-saved/signup-move-in/`
  and the user may bring it back). Connecting the same store again starts the boxes
  from the last move's `what` (before, they all came back ticked, so a second run brought the
  blog in unasked).
  My picks: plugin name "YallaFlow Mover"; the owner pastes a one-time code; the store pulls
  over https, signed; the code dies when the move ends; products, categories, tags,
  customers and WooCommerce settings always come; "remove the products already here" is an
  opt-in (template samples, to the trash).
- **Mover plugin:** `qwoo-platform/mover/yallaflow-mover/yallaflow-mover.php` (PHP 7.4+, WP 5.6+),
  zipped by the platform on download. Read-only REST `yallaflow-mover/v1/data` { type, after,
  limit }, signed HMAC-SHA256("time\nnonce\nbody"); option `yfm_link`. Never sends staff
  (administrator, shop_manager, editor, author, contributor) or payment settings; renders blocks
  and shortcodes to HTML; Yoast / Rank Math texts with their variables filled.
- **Store:** `class-migration.php` (`Qwoo_Migration`: code parsing, sealed secret with sodium
  + `wp_salt('auth')`, signed fetch via `wp_safe_remote_*`, order-number filter, old-path
  lookups for `Qwoo_Seo::for_path`, the sign-in fallback in `auth.php`) and
  `trait-platform-migration.php` (actions `migrate_*`, phases, importers). Items carry
  `_qwoo_mig_id` = "<md5(host)[0..8]>:<old id>"; images `_qwoo_mig_src` = md5(url); old
  addresses `_qwoo_old_path`; old order numbers `_qwoo_order_number`. While moving: all mail
  off (WooCommerce emails disabled per email, else WooCommerce notes them as failed), WooCommerce's
  stock / sales / coupon-count hooks removed, review requests off. Customers who signed in here
  since (`_qwoo_mig_touched`) are never changed by a later move; a hash only follows if it's still
  the one brought in. Only simple and variable products come (grouped / external / others are
  listed); only flat rate, free shipping and local pickup methods. New orders are numbered after
  the old ones (`ALTER TABLE … AUTO_INCREMENT`, MySQL only).
- **Platform:** job `migrate_store` (24 h limit; never marks the store failed), routes
  `dashboard/migration` (+ `/mover`, `/check|start|cancel|forget`).
- **Gotchas found:** Playground's PHP can't do network I/O inside a C callback
  (`preg_replace_callback`, `array_map` with a download…) — it crashes with "unreachable": download
  first, then replace. WooCommerce's `remove_order_items()` is MySQL-only (fails on SQLite):
  remove items one by one. `WC_Coupon::set_used_by()` isn't saved: write `_used_by` meta rows.
  The dashboard's `fill()` dropped 0 values ("{percent}%"): fixed in `lib/i18n.js`.
- **Tests:** an old store on port 9700 (`--mount-dir <qwoo-platform>/mover/yallaflow-mover
  /wordpress/wp-content/plugins/yallaflow-mover --mount-dir qp/mu-old /wordpress/wp-content/mu-plugins
  --blueprint=./blueprintOld.json`; `?yfm_seed=1`, `?yfm_fix=1`, `?yfm_code=1`, `?yfm_change=1`,
  `?yfm_state=1`); store helpers `muS-dash/qp-migration-test.php` (`QWOO_MIGRATION_ALLOW_LOCAL`,
  `?qp_mig_dump=1`, `?qp_mig_reset=1`, `?qp_mig_login=`, `?qp_mig_sample=1`). Scripts in `qp/`:
  `mover-test.mjs` (27), `store-migrate.mjs` (56, run twice: no copies), `store-migrate2.mjs` (16:
  remove existing, stop/go on, expired code, disconnect), `migrate-flow.mjs` (through the platform
  job). `mu-dash/qp-show-errors.php` shows real PHP errors on the platform.

### Round 13 notes (2026-10-11): brand fonts
- **Decisions (user, 2026-10-11):** global font settings only, never a font list on every
  section: built-in Text, Headings, Buttons, plus the owner's own named fonts; an item that should
  look different picks one of those. Files hosted by the store (no Google calls from visitors);
  a hand-picked list; set in Branding under the colours. My picks: Text '' = aura's Roboto,
  Headings / Buttons '' = same as Text, up to 10 own fonts (`cf_…`), Font fields on the Heading
  (title, subtitle), Text and Button blocks only, a removed own font falls back to the item's
  default, Hebrew letters filled in by Heebo / Frank Ruhl Libre (serif) on stores with Hebrew,
  weights 300–800, no italics (browsers slant them).
- **List:** `qwoo-platform-app/scripts/font-catalog.mjs` (system node) reads Google's metadata and
  CSS and writes `src/design/fonts/catalog.json` + `samples/fs-*.woff2` (each name in its own
  font) and the store's `includes/fonts/catalog.json`. 50 fonts, 18 with Hebrew.
- **Store:** `includes/class-brand-fonts.php` (`Qwoo_Brand_Fonts`): `branding.fonts`
  `{ text, headings, buttons, custom: [{ id, name, family }] }`, field type `font`
  (`sanitize_choice`), schema `fonts` (builtin, families, max_custom). Publishing
  (`stage()`, in the branding step) downloads files once to `uploads/qwoo-fonts/`, stages
  `public/brand-fonts/{family}-{subset}-{weight}-{sha10}.woff2`, removes unused ones, and writes
  branding.json `fonts { vars, families { generic, fallback }, faces }` (absent when nothing is
  set). A save without `fonts` (wp-admin's Branding form) keeps them; `save_input` replaces the
  list whole. Site content allows `brand-fonts/` and `.woff2`. wp-admin's builder shows the Font
  field as a select (`shopBuilder.brandFonts`).
- **Dashboard:** `design/fonts.js`, `FontPicker.vue`, `BrandFonts.vue`; FieldControl type `font`.
  The live preview gets the published shape with fonts.gstatic.com files (`previewFonts()`). Vite now
  builds with `base: './'` and never inlines `.woff2` (CSP font-src 'self'). `font-family: 'x',
  inherit` is invalid CSS (drops the whole rule): use a real fallback.
- **aura:** `src/utils/brand-fonts.js` (CSS from branding.json, everything checked by regex;
  `html:root` vars `--qf-{key}`), `render.js` `fontsHead()` (style + up to 2 preloads; old GitHub
  stores read the built branding.json), app.css defaults (`--qf-text` Roboto…, headings: h1–h6 and
  `div.text-h*` only, since menu links use `text-h6` for size), blocks use
  `var(--qf-{key}, var(--qf-default))`. `/brand-fonts/` served by site-content.js (immutable, CORS),
  vercel.json, after-build / fetch-content lists, native-app prefixes, not precached.
- **Tests** (scratchpad `a8f25bb0-…/scratchpad/fonts/`): `store-fonts.mjs [he]` (29 checks, fake
  GitHub publish), `store-fonts-local.mjs` (publishing on the store), `css-unit.mjs <aura>` (12).
  The local storefront needs the store to answer: while another Playground boots it times out and
  waits 60s. Seed the platform owner **before** `?qp_seed_conn=1`, or the dashboard's store calls
  answer 502.
- **Not tested:** the live preview end to end (the iframe), the native app, a real Hostinger
  download.

## Open issues and decisions

- **Not tested end to end:** Stripe OAuth and real payments.
- **Dashboard speed:** each screen takes about 0.7–0.9s because of two server hops.

- **Hostinger file limit (inodes), found 2026-10-10:** the plan allows 100 websites but 400,000
  inodes, and ~20 stores already near it (~20k files each). This caps stores far below 100.
  Waiting on the user: measure per-store file counts, then choose between trimming, sharing one
  code copy, WordPress multisite, or other hosting.
- **Hosting and budget (discussed 2026-10-11, nothing decided):** my advice was isolated stores
  for every plan (Hostinger shared runs all sites as one user), not private hosting as a Pro
  perk; Pro/Plus sell "more power", a server of its own only for Plus; no "bring your own
  server" except maybe Enterprise later. Estimates: ~$1.5–3 per store a month on Basic, ~$4–8 on
  Pro, ~$18–25 on Plus; start-up money ~$6–10k lean, ~$15–25k comfortable. Budget calculator:
  https://claude.ai/artifact/McwYByhEDFxHnDUiQcWSsV (source `yallaflow-budget.html` in scratchpad
  `5419b7b9-…`). Still to check: real Vercel usage per project (the 3s version check may cost
  CDN requests and memory).

## Next steps (suggested order)

0. **Header & footer builder** (user, 2026-10-10): build the header and footer from blocks like the
   other pages (logo, menu, icons, language switcher, text…), with a ready-made layout set at store
   creation that the owner can change, add to and remove from. Questions to settle before building.
0. **GitHub secondary rate limit** (hit 2026-10-10): fixed in round 10 by publishing on the store
   (see Architecture); live and confirmed by the user (publishes no longer deploy, no stale data).
   Decision (user, 2026-10-10): keep every feature the same, store the published files on the
   WordPress backend (my pick, the user trusted it), as long as the storefront doesn't get slower.
   Product saves no longer commit; the products backup refreshes at most daily from storefront
   traffic (`aps_maybe_refresh_data_files`, never on the `qwoo/v1/site` request); the hourly
   WP-cron job is cleared. Live CDN checked: `/__site/current` is a Vercel CDN HIT.
   **Still open:** every aura push rebuilds every store project at once (Vercel fetches aura from
   GitHub each time). Ideas: spread storefront code updates out, or one shared storefront
   deployment for all stores (changes "one stack per store": the user's call). Not checked: the
   daily products backup running after the answer on Hostinger (`litespeed_finish_request`).

1. More for orders: tracking number in the shipping email, packing slip, tap-to-call/WhatsApp.
2. Abandoned-cart emails, reports, owner phone alerts, automatic discounts (no code).
3. Fix the storefront `/login` rate limit counting twice (limit in `permission_callback`).
4. Product dynamic blocks (title, price, gallery, add to cart) so the product page can be fully
   block-built like the blog post.
5. Later for products/blog: variant-level sale dates, saved CSV column mappings, products in
   posts, review photos.
6. Image sizes and formats (publish a resized/WebP logo; eager first homepage grid cards and a
   real `sizes`, see round 9 notes); a contrast warning in the colour pickers.
7. Languages, later: "Text & translations" (owner overrides of the storefront's built-in texts),
   blog category translations, order emails in the shopper's language, the language of an
   order shown in the dashboard.
8. Later: Grow, tax invoices, billing for plans, gift cards and loyalty points (listed as
   coming soon), own Stripe Connect, fleet updates, backups, platform legal pages, moving in
   from other platforms (Shopify, Wix…).

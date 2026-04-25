# Mind the Guitar — Website

Static site for [mindtheguitar.com](https://mindtheguitar.com): landing page,
Privacy Notice, Terms of Use, and an Account Deletion guide (required by
Google Play since 2024).

- **No frameworks, no build step.** Pure HTML + one CSS file.
- **No external requests.** No Google Fonts, no analytics, no ads, no trackers
  — consistent with the "No Tracking" clause in the Privacy Notice.
- **Hosted on Cloudflare Pages** (free plan), domain on Cloudflare DNS.

## Repository structure

```
Mind_the_Guitar_Website/
├── public/                    ← deploy root (Cloudflare Pages "build output")
│   ├── index.html             ← landing
│   ├── privacy.html           ← /privacy   (Privacy Notice)
│   ├── terms.html             ← /terms     (Terms of Use)
│   ├── delete.html            ← /delete    (Account deletion — Play Console req.)
│   ├── 404.html               ← Not Found
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── _headers               ← Cloudflare Pages security headers
│   └── assets/
│       └── styles.css
├── README.md
└── .gitignore
```

## Local preview

No build step. Just serve the `public/` folder:

```bash
cd public
python3 -m http.server 8080
# open http://localhost:8080
```

Or with Node:

```bash
npx serve public
```

## Updating the legal text

Source of truth for the privacy/terms wording lives in the app repo:

- `Mind_the_Guitar/lib/terms_and_conditions/privacy_policy.md`
- `Mind_the_Guitar/lib/terms_and_conditions/terms_and_conditions.md`

When you change those, mirror the changes into:

- `public/privacy.html`
- `public/terms.html`

…and bump the **Effective Date / Last Updated / Version** at the top of both
the markdown and the HTML.

## Deployment — first-time setup

The site is deployed via **Cloudflare Pages**, which auto-deploys every push
to the `main` branch on GitHub.

### 1. Push the repo to GitHub

```bash
cd /Users/michalgajek/StudioProjects/Mind_the_Guitar_Website
git init
git add .
git commit -m "Initial website: landing, privacy, terms, delete"
git branch -M main
# Create empty repo "mind-the-guitar-website" on github.com first.
git remote add origin git@github.com:<YOUR-GH-USERNAME>/mind-the-guitar-website.git
git push -u origin main
```

### 2. Add the domain to Cloudflare

1. Go to <https://dash.cloudflare.com> → **Add a Site** → enter `mindtheguitar.com` → Free plan.
2. Cloudflare gives you 2 nameservers (e.g. `xxx.ns.cloudflare.com`, `yyy.ns.cloudflare.com`).
3. Log into your domain registrar and replace the existing nameservers with these two.
4. Wait until Cloudflare shows the zone status as **Active** (usually 5 min – a few hours).

### 3. Create the Pages project

1. In Cloudflare dash → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Authorize Cloudflare on GitHub and pick `mind-the-guitar-website`.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `public`
4. Click **Save and Deploy**. First deploy takes ~30 s.

### 4. Attach the custom domain

1. Inside the Pages project → **Custom domains** → **Set up a custom domain**.
2. Add `mindtheguitar.com` (apex). Cloudflare wires DNS automatically.
3. Add `www.mindtheguitar.com` and configure it to **redirect to apex**
   (Cloudflare will offer the redirect option on the subdomain).
4. SSL certificate is provisioned automatically (Let's Encrypt / Google Trust).

### 5. Sanity check

Open in a private window:

- <https://mindtheguitar.com/> → 200
- <https://mindtheguitar.com/privacy> → 200
- <https://mindtheguitar.com/terms> → 200
- <https://mindtheguitar.com/delete> → 200
- <https://www.mindtheguitar.com/privacy> → 301 to apex

In DevTools → **Network** tab, reload `/privacy`. The request list must
contain ONLY same-origin requests (HTML + `/assets/styles.css` + favicon).
No external domains. If you see anything else, something leaked into the
build and it must be removed before publishing.

## Ongoing updates

```bash
# edit files in public/
git add public/<file>
git commit -m "Update: <what changed>"
git push
# Cloudflare Pages auto-deploys in ~30 s
```

## Linking from the app & stores

- **App Store Connect** → App Privacy → Privacy Policy URL
  → `https://mindtheguitar.com/privacy`
- **Google Play Console** → App content:
  - Privacy Policy URL → `https://mindtheguitar.com/privacy`
  - **Account deletion URL** → `https://mindtheguitar.com/delete`
- **In the Flutter app** (if any URL constants point to legal pages),
  update them to the canonical apex URLs above.

## License

Source code (HTML / CSS / config) — proprietary, all rights reserved.
The legal text in `privacy.html` and `terms.html` reflects the published
Privacy Notice and Terms of Use of the Mind the Guitar app.

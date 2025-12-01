# Source Code Print

A publication framework exploring affordances in publishing through interactive web design.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment (copy .env.example to .env and update with your Google Sheet ID)
cp .env.example .env

# Start dev server
npm run dev
```

## Commands

```bash
npm run dev              # Start local dev server at localhost:4321
npm run build            # Build for production
npm run preview          # Preview built site

npm run fetch            # Fetch data from Google Sheets
npm run fetch:images     # Download project images
npm run fetch:changelog  # Regenerate changelog from git + manual entries
```

## Project Structure

```
src/
├── components/         # Astro components
├── layouts/            # Page layouts
├── pages/              # Content pages
│   ├── affordances.md  # Landing page
│   ├── materiality.md, ownability.md, etc.
│   └── changelog.md
├── styles/             # Modular CSS
│   ├── global.css      # Main entry
│   ├── base.css        # Variables + base styles
│   ├── layout.css      # All components & utilities
│   ├── markdown.css    # Markdown content
│   ├── network.css     # Network visualization
│   └── affordances.css # Affordance nodes
└── data/               # Auto-generated from Google Sheets

public/screenshots/     # Downloaded images
```

## Tech Stack

- **Framework**: Astro v5
- **Styling**: Tailwind CSS v4
- **Data**: Google Sheets + opensheet.elk.sh
- **Visualization**: D3.js, Mermaid
- **Deployment**: Vercel

## Key Features

- **Affordances Framework** - 6 deep dives into publishing concepts
- **Google Sheets Integration** - Fetch Projects, Precedents, Tools data
- **Hybrid Changelog** - Combine manual entries with git commits
- **Modular CSS** - Clean separation of concerns
- **Responsive Design** - Mobile-first layout

## Environment

Create `.env` with:
```
PUBLIC_SHEET_ID=<your-sheet-id>
PUBLIC_SHEET_TABS=Databases,Precedents,Tools
```

See `.env.example` for reference.

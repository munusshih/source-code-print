# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## 📄 Google Sheets Integration

This project fetches data from multiple Google Sheets tabs using the public `opensheet.elk.sh` service. The codebase uses plain JavaScript (no TypeScript).

### 1. Make Your Google Sheet Public

Share the Google Sheet so that "Anyone with the link" can view.

### 2. Get the Spreadsheet ID

From the URL: `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit#...`

### 3. Configure Environment

Create a `.env` file in the project root:

```sh
PUBLIC_SHEET_ID=<SPREADSHEET_ID>
PUBLIC_SHEET_TABS="Databases,Precedents,Tools,Readings,PURGATORY"
```

See `.env.example` for reference.

### 4. Set Tab Names

Edit `src/config/sheets.ts` and update `SHEET_TABS` to match the exact tab names in the sheet.

### 5. Run Dev Server

```sh
npm install
npm run dev
```

Visit `http://localhost:4321/` to see all configured tabs rendered as tables. You can also navigate directly to `http://localhost:4321/<TabName>` using the dynamic route.

### 6. Data Shape

Each row is returned as an object where keys are the column headers. Empty cells become empty strings.

### 7. Error Handling

If a tab fails to load (e.g., wrong name) an error message is displayed instead of a table.

### 8. Security Note

Only use this approach for publicly shareable data. Private or sensitive data should NOT be exposed via a public sheet.

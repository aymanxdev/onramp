# Launch assets

Run `node scripts/launch-assets/render.mjs` from the repo root (plain `node`, not `pnpm dlx`, since this only needs the chromium already installed under `app/node_modules`). With no argument it writes to `<repo>/launch-assets/` (gitignored); pass a directory to write elsewhere.

It builds the app, serves it with `pnpm --dir app preview`, screenshots the running app, renders `templates/*.html` over those screenshots at exact pixel sizes, and stops the preview server when done.

Pass a second argument to re-render just one image by name, e.g. `node scripts/launch-assets/render.mjs launch-assets readme-banner`; this skips the app build and preview server entirely when that image needs no live screenshot.

Edit `templates/*.html` to change layout or copy; each file is a self-contained page using `{{FONT_*}}` and `{{SCREENSHOT}}` placeholders that `render.mjs` fills in before rendering, so a template can be previewed directly in a browser once those placeholders are replaced by hand.

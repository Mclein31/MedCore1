# Vite API configuration regression

Run `node apps/dashboard/validation/api-config/run.mjs` from the project root.

Builds the actual configuration module with Vite and imports its emitted code. Checks production same-origin proxy selection even with an explicit Worker URL, development backend selection, API suffix normalization, relative defaults and production mode. It writes no build files and sends no network requests. The original cast/optional `import.meta` access failed the explicit URL case; literal `import.meta.env` is required for Vite replacement.

# Guidizer

A lightweight GUID format converter that runs entirely in the browser. Paste any GUID/UUID and instantly see it in four .NET `Guid.ToString()` format specifiers (N, D, B, P) in both lowercase and uppercase. The app also detects the UUID version and variant per RFC 9562.

## Deployment

Guidizer is a static site with no build step, no backend, and no dependencies beyond a single vendored JS library (~1 KB). You can serve the files with any static file server.

## Tech

- [Van.js](https://vanjs.org/) for reactivity
- CSS custom properties for theming
- Web Crypto API for UUID generation

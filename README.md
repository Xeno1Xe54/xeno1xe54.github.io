# Field Notes Photo Timeline

A no-build, static photo timeline designed for GitHub Pages. You can drop a batch of photos into it, and it sorts them using their EXIF capture date (`DateTimeOriginal`) when available. If a photo has no usable embedded date, it falls back to the file's modified date.

## Publish it with GitHub Pages

1. Create a new GitHub repository—for example, `photo-timeline`.
2. Upload the **contents** of this folder (`index.html`, `styles.css`, `app.js`, and this README) to the repository root. Do not put them inside another folder.
3. In the repository, open **Settings** → **Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**. Choose `main` and `/ (root)`, then press **Save**.
5. Wait a minute or two; GitHub will show the public Pages address at the top of that screen.

You can also clone the repository locally, copy these files in, then commit and push them normally.

## How it works—and its privacy model

- Open the site, drop in photos, and the timeline is created entirely on that visitor's device.
- The site **does not upload, store, or publish the selected photos**. Refreshing clears them.
- The EXIF parsing helper loads from the jsDelivr CDN, but image files themselves remain local to the browser.
- The **Download timeline data** link produces a small JSON file with dates and filenames; it does not include images.

This makes the site safe to host publicly, but it is a *viewer*, not an online photo archive. Anyone opening the public GitHub Pages URL will choose their own local photos to view.

## Notes

- Most JPEGs and many TIFF/WebP photos contain readable EXIF dates. Screenshots, social-media downloads, and edited images often have had this data removed, so the file date is used instead.
- HEIC/HEIF files are accepted, but browser support for displaying them varies—Safari has the best support. Convert them to JPEG for the broadest compatibility.
- To make a truly shared timeline with photos already present, place optimized images in the repository and add a separate data file or gallery build step. GitHub Pages alone cannot accept and retain uploads from visitors.

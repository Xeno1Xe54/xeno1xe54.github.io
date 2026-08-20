# Repository-backed photo timeline

This is a durable GitHub Pages photo archive, not a temporary browser uploader. Put the original photo files in the repository's `photos/` folder, commit and push them, and the site will still show them when you return later.

The dark, compact top rail is an Artemis-style chronological strip: every little tile is a photo, grouped by its capture day. Clicking a tile or a gallery photo opens it larger.

## The everyday workflow

1. Copy or drag photos into `photos/`. You can create folders such as `photos/2026/04/` to keep things tidy.
2. Commit and push those changes to the `main` branch. GitHub Desktop is an easy way to do this: the new files appear in **Changes**, then choose **Commit to main** and **Push origin**.
3. GitHub Actions reads the image metadata, builds the timeline, and publishes the refreshed site automatically.

There is intentionally no “drop files onto the public website to save them” feature: a static GitHub Pages site has no permission to write files back to your repository. The repository folder is the saved source of truth.

## First-time setup

1. Create a new GitHub repository, for example `photo-timeline`.
2. Upload the **contents** of this folder into the repository root. Keep the `.github`, `photos`, and `scripts` folders; do not upload this enclosing `photo-timeline` folder itself.
3. In the repository, go to **Settings** → **Pages**. Under **Build and deployment** → **Source**, choose **GitHub Actions**.
4. Commit and push to `main`. The included `.github/workflows/deploy-pages.yml` workflow will deploy it.
5. Open the green deployment run under the repository’s **Actions** tab. Its deployment URL is your timeline site.

GitHub’s current guidance for this type of custom Pages workflow is [here](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Dates and captions

The build script uses the first usable source below, in order:

1. `DateTimeOriginal` EXIF capture date
2. `CreateDate` EXIF creation date
3. A manual entry in `timeline-overrides.json`
4. A `YYYY-MM-DD`, `YYYY_MM_DD`, or `YYYY.MM.DD` date in the filename
5. An **Undated** archive section

It deliberately does **not** use file modified time: Git does not preserve that date when it checks out a repository, so it would be misleading.

Use `timeline-overrides.json` for screenshots or edited images that lost their metadata. Its keys are paths *relative to* `photos/`:

```json
{
  "2026/04/untitled-screenshot.png": {
    "date": "2026-04-06",
    "caption": "First field test"
  },
  "scans/2024_07_11.jpg": "2024-07-11"
}
```

Change the public title and intro wording in `site-config.js`.

## Test it on your computer

You only need this for a local preview; GitHub Actions installs the metadata tool and builds automatically when you push.

```bash
npm install
npm run build
npx serve dist
```

Open the address printed by the last command. The generated `dist/` folder is temporary and is deliberately ignored by Git.

## Important photo and hosting limits

- If the repository is public, its original photo files are public too. This starter serves the originals, so remove GPS/private metadata before committing if that matters.
- JPEG, PNG, WebP, AVIF, and GIF work best. HEIC/HEIF metadata can be read, but many browsers cannot display those files; convert them to JPEG or WebP first.
- Keep folders shallow and organized by year/month rather than placing thousands of files in one directory.
- GitHub blocks ordinary Git files over 100 MiB. GitHub Pages also recommends keeping both source repositories and published sites within 1 GB, and has a soft 100 GB/month bandwidth limit. It is great for a modest personal archive, not a huge high-resolution library. See [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) and [GitHub’s large-file guidance](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

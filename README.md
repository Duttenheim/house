# The Linden House

A single scrolling page for selling a house. The page is plain HTML, CSS, and JavaScript. Photographs open in a lightbox, and sections ease in as you scroll.

The words, price, address, and photos currently on the page are a sample listing so the layout can be reviewed. Replace them with the property before publishing.

## Replace the listing

- Edit the copy in `public/index.html`. The enquiry address is the `mailto` link in the viewing section.
- Put photographs in `public/images/` and point the `src` attributes at them. To add a picture to the gallery, copy a `figure.shot` block. The lightbox picks those up automatically.
- The footer credits Unsplash for the sample photographs. Remove that line when the photos are yours.

## Local testing

Requires Node.js 18 or newer. There are no packages to install.

```bash
npm run dev
```

Opens at <http://127.0.0.1:3000>. Another port:

```powershell
$env:PORT = 3001; npm run dev
```

```bash
npm test
```

Checks that the page, stylesheet, script, hero image, and 404 page are served, and that files outside `public/` are not.

## Deployment

The production server is `server.js`, run with [Bun](https://bun.sh). [PM2](https://pm2.keymetrics.io/) keeps that process up.

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

PM2 listens on port 3000. Override it by editing `ecosystem.config.cjs`. If PM2 cannot find Bun, set `interpreter` to the full path of the `bun` executable.

`npm start` runs the same Bun server once, without PM2.

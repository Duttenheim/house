# The house

A single scrolling page for selling a house. The page is plain HTML, CSS, and JavaScript. Photographs open in a lightbox, and sections ease in as you scroll.

The page describes this house: an open ground floor, a laundry room, and an upper floor with a master bedroom, a children's room, and an office. Add the price, address, and any missing room photos in `public/index.html`.

## Replace the listing

- Edit the copy in `public/index.html`. The enquiry address is the `mailto` link in the viewing section.
- Put photographs in `public/images/` and point the `src` attributes at the `.jpg` names. A `photo.HEIC` file is converted to `photo.jpg` when the production server starts. To add a picture to the gallery, copy a `figure.shot` block. The lightbox picks those up automatically.

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

On startup, the server converts every HEIC photo in `public/images/` to a JPEG next to it. A JPEG is rewritten only when its HEIC file is newer. Install the converter once on the machine that runs the site:

```bash
pip install -r requirements.txt
npm install -g pm2
npm run deploy
```

`npm run deploy` copies this checkout to `/var/www/house` and reloads the PM2 process from there. The first run creates that folder, using `sudo` only if the directory cannot be created otherwise. Set `DEPLOY_DIR` to use another path.

PM2 listens on port 3000. Override it by editing `ecosystem.config.cjs`. If PM2 cannot find Bun, set `interpreter` to the full path of the `bun` executable.

`npm start` runs the same Bun server once, without PM2.

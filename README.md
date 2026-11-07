# The house

A single scrolling page for selling a house. The page is plain HTML, CSS, and JavaScript. Photographs open in a lightbox, and sections ease in as you scroll.

The page describes this house: an open ground floor, a laundry room, and an upper floor with a master bedroom, a children's room, and an office. Add the price, address, and any missing room photos in `public/index.html`.

## Replace the listing

- Edit the copy in `public/index.html`. The enquiry address is the `mailto` link in the viewing section.
- Put photographs in `public/images/` and point the `src` attributes at the `.jpg` names. A `photo.HEIC` file becomes `photo.jpg` when you run `python scripts/convert-heic.py`. To add a picture to the gallery, copy a `figure.shot` block. The lightbox picks those up automatically.
- Put a tour in `public/videos/` as a `.MOV`. `swift -suppress-warnings scripts/convert-tours.swift` converts it to an `.mp4` beside it and writes the first frame to `public/images/` with the same name. Point the tour’s `<video>` at those two files.

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

`npm run deploy` copies `public/` to `/var/www/house`. Nginx serves that directory, so `index.html` sits at the site root. The first run creates the folder, using `sudo` only if it cannot be created otherwise. Set `DEPLOY_DIR` to use another path.

Convert photos and tours before deploying. The copy nginx serves is exactly what is in `public/` at that moment. The first command lowercases `.png`, `.jpg`, and `.jpeg` extensions, which is what Linux looks up:

```bash
pip install -r requirements.txt
node scripts/lowercase-extensions.js
python scripts/convert-heic.py
swift -suppress-warnings scripts/convert-tours.swift
npm run deploy
```

`npm start` runs the Bun server once, on port 3000, and does those conversions on startup.

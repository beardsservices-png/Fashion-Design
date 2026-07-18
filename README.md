# ✦ Style Studio 3D — Fashion Design

A true-3D fashion **design** studio. The focus is the garment, not the model:
clothes are shown on a neutral **dress form** so all the attention goes to the
**fabric, cut, hems, and textures**. Spin the form around, choose a fabric,
color, print and construction details, and watch it render in real time with
realistic materials and studio lighting.

Designs are saved on the server's **persistent disk**, so they survive restarts
and are shared across every device that opens the site.

## What you can design

- **Garments:** Dress, Top, Skirt, Pants — each fully editable.
- **Fabric (the star):** Cotton, Linen, Denim, Silk, Satin, Leather, Wool,
  Velvet, Sequin, Tulle — each with its own realistic sheen, roughness, and a
  woven **surface texture** (denim twill, knit ribbing, leather grain, etc.).
- **Color + Finish:** any color, plus a matte → shiny finish slider.
- **Prints:** stripe, pinstripe, dots, gingham, plaid, chevron, houndstooth,
  floral, stars, camo, leopard — with two editable colors and adjustable scale.
- **Cut:** length, silhouette (pencil → circle), neckline, sleeves, pant fit.
- **Details:** pleats (soft/knife/box/accordion), hems (plain/rolled/scalloped/
  handkerchief/asymmetric), waistband, and trims — each with its own color.
- **Studio:** dress-form finish, backdrop, and lighting presets.
- Rotate (drag), zoom (scroll), and **click a part** to jump to its options.
- **Save** designs, reopen them, **Export** a PNG, and **Undo** (Ctrl/⌘-Z).

## Help built in

- **ⓘ info circles** next to every control explain what it does in plain English (tap/hover).
- **? Guide & examples** (top bar) opens a walkthrough of how designing works, a
  glossary, and several **example outfits** — each with a step-by-step recipe and a
  one-tap **Load this outfit** button so you can open a finished look and tinker.

## Install it like an app (PWA)

The studio is a Progressive Web App, so it can be installed to a phone or desktop
and launched from the home screen / dock — it even works offline (your saved
designs still need the server to sync across devices).

- **Desktop Chrome/Edge:** click the **⤓ Install app** button in the top bar (or the
  install icon in the address bar).
- **iPhone/iPad (Safari):** Share → **Add to Home Screen**.
- **Android (Chrome):** menu → **Install app** / **Add to Home Screen**.

## Run it locally

Requires Node 18+.

```bash
npm start          # then open http://localhost:3000
```

Saved designs are written to `./data` locally (git-ignored).

## Deploy on Railway (with persistent storage)

The app stores designs as files on disk, so it needs a **Volume** — Railway's
persistent storage — otherwise saves disappear on every redeploy.

1. Create a new Railway **project** and deploy this repo. Railway auto-detects
   Node and runs `npm start` (also configured in `railway.json`).
2. In the service, add a **Volume** and set its **mount path** to `/data`.
3. That's it. Railway automatically exposes the mount path in the environment
   variable **`RAILWAY_VOLUME_MOUNT_PATH`**, and the server reads that variable
   (falling back to `/data`) to decide where to store designs. No code change
   needed.

**So the two terms you were reaching for:** the storage is a **Volume**, and the
variable is **`RAILWAY_VOLUME_MOUNT_PATH`**.

### How storage is resolved (in `server.js`)

The server saves to the first writable location it finds:

1. `RAILWAY_VOLUME_MOUNT_PATH` (set by Railway when a Volume is attached)
2. `DATA_DIR` (optional manual override)
3. `/data`
4. `./data` (local development)

Each design is one JSON file under `<data dir>/designs/`. The API:

| Method | Path                | Purpose                    |
|--------|---------------------|----------------------------|
| GET    | `/api/designs`      | list saved designs         |
| GET    | `/api/designs/:id`  | load one design            |
| POST   | `/api/designs`      | create/update a design     |
| DELETE | `/api/designs/:id`  | delete a design            |
| GET    | `/healthz`          | health check (for Railway) |

If the server ever can't be reached, the studio automatically falls back to
saving in the browser so nothing is lost.

---

Made to be simple, fun, and genuinely useful for designing. Happy designing! 💗

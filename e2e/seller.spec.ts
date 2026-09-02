import { deflateSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";

/**
 * Seller CRUD, driven through the real UI.
 *
 * Runs against scripts/mock-supabase.mjs, which has NO ROW LEVEL
 * SECURITY. These specs verify that the forms, Server Actions, image
 * upload and cache revalidation work — they say nothing about
 * authorization. RLS is covered properly by `npm run verify:db`, which
 * runs the real policies against real Postgres.
 */

const MOCK_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

/**
 * Every CRUD test starts from the same fixtures. These specs create,
 * edit and delete listings, so without a reset they depend on execution
 * order and fail on a second run against leftover state.
 *
 * Only meaningful against the mock; a real Supabase has no such route
 * and the call is skipped.
 */
test.beforeEach(async ({ request }) => {
  if (process.env.E2E_RUN_SELLER) return;
  // Absolute: the `request` fixture is bound to the app's baseURL, so a
  // relative path would hit Next rather than the mock backend.
  await request.post(`${MOCK_URL}/__reset`).catch(() => {});
});

const EMAIL = process.env.E2E_SELLER_EMAIL ?? "prodavac@jadranko.rs";
const PASSWORD = process.env.E2E_SELLER_PASSWORD ?? "ProdavacLozinka2026!";

/** Minimal valid PNG, so the uploader gets a real decodable image. */
function pngFixture(): Buffer {
  const w = 64;
  const h = 48;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0;
    for (let x = 0; x < w; x++) {
      raw[p++] = 120;
      raw[p++] = 100;
      raw[p++] = 80;
    }
  }

  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buf: Buffer) => {
    let crc = 0xffffffff;
    for (const byte of buf) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function login(page: Page) {
  await page.goto("/prijava");
  await page.getByLabel(/e-mail/i).fill(EMAIL);
  await page.getByLabel(/lozinka/i).fill(PASSWORD);
  await page.getByRole("button", { name: /prijavi se/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function attachPhoto(page: Page, name = "masina.png") {
  await page.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: "image/png",
    buffer: pngFixture(),
  });
  // The uploader downscales to WebP on a canvas, then uploads. Wait for
  // the thumbnail to leave its "uploading" state.
  await expect(page.getByText(/naslovna/i).first()).toBeVisible({ timeout: 15_000 });
}

/* ------------------------------------------------------------------ */

test("seller can sign in and reach their listings", async ({ page }) => {
  await login(page);

  await page.getByRole("link", { name: /moji oglasi/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/oglasi/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // The seeded listings are present.
  await expect(page.getByRole("link", { name: /Bager guseničar/i }).first()).toBeVisible();
});

test("CREATE — a new listing is published and goes live publicly", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/oglasi/novi");

  const title = `Bušilica stubna test ${Date.now()}`;

  await page.getByLabel(/naziv oglasa/i).fill(title);
  await page
    .getByLabel(/^opis/i)
    .fill("Stubna bušilica u ispravnom stanju, trofazni motor, malo korišćena.");
  await page.getByLabel(/^stanje/i).selectOption("korisceno");
  await page.getByLabel(/kategorija/i).selectOption({ index: 1 });
  await page.getByLabel("Cena (RSD)").fill("145000");
  await page.getByLabel(/lokacija/i).fill("Zrenjanin");

  await attachPhoto(page);

  await page.getByRole("button", { name: /^objavi$/i }).click();

  // Redirects to the edit screen with a saved notice.
  await expect(page).toHaveURL(/\/dashboard\/oglasi\/[0-9a-f-]+\/izmena/, {
    timeout: 15_000,
  });
  await expect(page.getByText(/aktivan/i).first()).toBeVisible();

  // And it is genuinely on the public storefront.
  await page.goto(`/oglasi?q=${encodeURIComponent("Busilica stubna")}`);
  await expect(page.getByText(title)).toBeVisible();

  /**
   * The uploaded cover must actually RENDER, not merely be referenced.
   *
   * This assertion exists because the suite previously checked only
   * that the title appeared, and so missed a real bug: the mock served
   * every uploaded object as image/png while the uploader re-encodes to
   * WebP, and next/image rejected the mismatch with a 400 — covers came
   * out blank on the public page while every test stayed green.
   */
  const card = page.locator("article").filter({ hasText: title }).first();
  const imgSrc = await card.locator("img").first().getAttribute("src");
  expect(imgSrc, "the card should render an optimised image").toContain("/_next/image");

  const optimised = await page.request.get(imgSrc!);
  expect(optimised.status(), "next/image must accept the uploaded file").toBe(200);
  expect(optimised.headers()["content-type"]).toMatch(/^image\//);
  expect((await optimised.body()).length).toBeGreaterThan(100);
});

test("CREATE — publishing without a photo is rejected", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/oglasi/novi");

  await page.getByLabel(/naziv oglasa/i).fill("Oglas bez fotografije");
  await page
    .getByLabel(/^opis/i)
    .fill("Ovaj oglas namerno nema fotografiju, pa objava mora da bude odbijena.");
  await page.getByLabel(/^stanje/i).selectOption("novo");
  await page.getByLabel(/kategorija/i).selectOption({ index: 1 });
  await page.getByLabel(/lokacija/i).fill("Novi Sad");

  await page.getByRole("button", { name: /^objavi$/i }).click();

  // Stays on the form and names the missing photo.
  await expect(page).toHaveURL(/\/dashboard\/oglasi\/novi/);
  await expect(page.getByText(/fotografij/i).first()).toBeVisible();
});

test("CREATE — a draft saves and stays out of the public index", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/oglasi/novi");

  const title = `Nacrt test ${Date.now()}`;
  await page.getByLabel(/naziv oglasa/i).fill(title);
  await page.getByRole("button", { name: /sačuvaj kao nacrt/i }).click();

  await expect(page).toHaveURL(/\/izmena/, { timeout: 15_000 });
  await expect(page.getByText(/nacrt/i).first()).toBeVisible();

  // A draft must not be publicly searchable. Scoped to listing cards:
  // the page also echoes the search term in the active-filter chip, so a
  // bare getByText matches that and can never fail.
  await page.goto(`/oglasi?q=${encodeURIComponent(title)}`);
  await expect(page.locator("article").filter({ hasText: title })).toHaveCount(0);
});

test("UPDATE — editing the price is persisted and shown publicly", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/oglasi");

  await page.getByRole("link", { name: /Vijčani kompresor/i }).first().click();
  await expect(page).toHaveURL(/\/izmena/);

  await page.getByLabel("Cena (RSD)").fill("399000");
  await page.getByRole("button", { name: /sačuvaj izmene|^objavi$/i }).click();

  await expect(page.getByRole("status").or(page.getByRole("alert")).first()).toBeVisible({
    timeout: 15_000,
  });

  // Reload the edit form: the new value came back from the database.
  await page.reload();
  await expect(page.getByLabel("Cena (RSD)")).toHaveValue("399000");

  // And the public page shows the formatted Serbian price.
  await page.goto("/oglas/kompresor-atlas-copco-ga11-j1k2l3");
  await expect(page.getByText("399.000 din").first()).toBeVisible();
});

test("UPDATE — marking a listing sold removes it from search but keeps the page", async ({
  page,
}) => {
  await login(page);
  await page.goto("/dashboard/oglasi");

  await page.getByRole("link", { name: /Viljuškar Linde/i }).first().click();
  await expect(page).toHaveURL(/\/izmena/);

  await page.getByRole("button", { name: /označi kao prodato/i }).click();
  await expect(page.getByText(/prodato/i).first()).toBeVisible({ timeout: 15_000 });

  // Gone from browsing...
  await page.goto("/oglasi?q=Viljuskar");
  await expect(page.getByText(/Viljuškar Linde H25/)).toHaveCount(0);

  // ...but the page itself still resolves, with the sold treatment.
  const response = await page.goto("/oglas/viljuskar-linde-h25-dizel-g7h8i9");
  expect(response?.status()).toBe(200);
  await expect(page.getByText("Prodato").first()).toBeVisible();
});

test("DELETE — requires the exact title, then removes the listing", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/oglasi");

  await page.getByRole("link", { name: /Agregat Honda/i }).first().click();
  await expect(page).toHaveURL(/\/izmena/);

  await page.getByRole("button", { name: /^obriši$/i }).click();

  // A wrong confirmation must not delete anything.
  await page.getByLabel(/za potvrdu upišite naziv/i).fill("pogrešan naziv");
  await page.getByRole("button", { name: /obriši trajno/i }).click();
  await expect(page.getByText(/ne podudara/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/izmena/);

  // The exact title does.
  await page
    .getByLabel(/za potvrdu upišite naziv/i)
    .fill("Agregat Honda EX7 — ne pali, za delove");
  await page.getByRole("button", { name: /obriši trajno/i }).click();

  await expect(page).toHaveURL(/\/dashboard\/oglasi/, { timeout: 15_000 });
  await expect(page.getByRole("link", { name: /Agregat Honda/i })).toHaveCount(0);

  /**
   * And it goes away on the public site.
   *
   * NOT asserted as an immediate 404. The detail route is ISR-cached, so
   * revalidatePath marks the entry stale rather than purging it: the
   * first request after the delete still serves the cached copy while
   * regeneration runs, and the next one 404s. Measured on a production
   * build — 200, then 404, then 404.
   *
   * That is Next's stale-while-revalidate contract, not a defect, and
   * one extra stale hit on a deleted listing is harmless. Asserting an
   * instant 404 would encode an expectation the framework never makes,
   * and would pass only in dev, where nothing is cached.
   */
  await expect
    .poll(
      async () => (await page.request.get("/oglas/agregat-honda-ex7-za-delove-v4w5x6")).status(),
      { timeout: 15_000, message: "deleted listing should stop resolving" },
    )
    .toBe(404);
});

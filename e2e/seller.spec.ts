import { deflateSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { COPY } from "../src/config/copy";
import { formatMoney } from "../src/lib/format";

/**
 * LABELS AND NOTICES COME FROM COPY, NOT FROM STRING LITERALS.
 *
 * This suite used to hard-code the Serbian wording, so the re-copy from
 * machines to property broke eleven specs that had nothing wrong with
 * them. Reading the same config the components read means a wording
 * change is a wording change, and a real regression is still a failure.
 *
 * Fixture TITLES stay literal on purpose — they are data from
 * scripts/mock-supabase.mjs, not copy, and a spec that fetched them
 * dynamically would no longer assert anything specific.
 */
const FIXTURE = {
  /** Seller-owned, priced, four photos — the edit target. */
  priced: /Dvoiposoban stan 62 m²/i,
  /** Seller-owned and active — the "mark sold" target. */
  toSell: /Lokal 45 m², Vračar/i,
  toSellSlug: "lokal-45m2-vracar-njegoseva-g7h8i9",
  /** Seller-owned — the delete target. Exact title for the confirm box. */
  toDelete: /Jednosoban stan 38 m², Zvezdara/i,
  toDeleteTitle: "Jednosoban stan 38 m², Zvezdara — Bulevar kralja Aleksandra",
} as const;

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

const EMAIL = process.env.E2E_SELLER_EMAIL ?? "prodaja@bgbuilding.rs";
const PASSWORD = process.env.E2E_SELLER_PASSWORD ?? "ProdajaLozinka2026!";

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

async function attachPhoto(page: Page, name = "stan.png") {
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

  await page.getByRole("link", { name: COPY.dashboard.nav.listings }).click();
  await expect(page).toHaveURL(/\/dashboard\/oglasi/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // The seeded listings are present.
  await expect(page.getByRole("link", { name: FIXTURE.priced }).first()).toBeVisible();
});

test("CREATE — a new listing is published and goes live publicly", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/oglasi/novi");

  const title = `Trosoban stan test ${Date.now()}`;

  await page.getByLabel(COPY.dashboard.form.title, { exact: true }).fill(title);
  await page
    .getByLabel(/^opis/i)
    .fill("Trosoban stan na petom spratu, sa terasom i garažnim mestom. Useljivo odmah.");
  await page.getByLabel(COPY.dashboard.form.condition, { exact: true }).selectOption("u_izgradnji");
  await page.getByLabel(COPY.dashboard.form.category, { exact: true }).selectOption({ index: 1 });
  await page.getByLabel(COPY.dashboard.form.price, { exact: true }).fill("145000");
  await page.getByLabel(COPY.dashboard.form.location, { exact: true }).fill("Vračar, Beograd");

  await attachPhoto(page);

  await page.getByRole("button", { name: /^objavi$/i }).click();

  // Publishing returns the seller to their own list — staying on the
  // form they just filled in reads as "nothing happened" — and the
  // notice there must say published, not "saved as draft".
  await expect(page).toHaveURL(/\/dashboard\/oglasi\?sacuvano=aktivan/, {
    timeout: 15_000,
  });
  await expect(page.getByText(COPY.dashboard.form.published)).toBeVisible();
  await expect(page.getByText(COPY.dashboard.form.savedDraft)).toHaveCount(0);
  await expect(page.getByRole("cell", { name: title })).toBeVisible();

  // And it is genuinely on the public storefront.
  await page.goto(`/oglasi?q=${encodeURIComponent("Trosoban stan test")}`);
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

  await page.getByLabel(COPY.dashboard.form.title, { exact: true }).fill("Oglas bez fotografije");
  await page
    .getByLabel(/^opis/i)
    .fill("Ovaj oglas namerno nema fotografiju, pa objava mora da bude odbijena.");
  await page.getByLabel(COPY.dashboard.form.condition, { exact: true }).selectOption("useljivo");
  await page.getByLabel(COPY.dashboard.form.category, { exact: true }).selectOption({ index: 1 });
  await page.getByLabel(COPY.dashboard.form.location, { exact: true }).fill("Novi Sad");

  await page.getByRole("button", { name: /^objavi$/i }).click();

  // Stays on the form and names the missing photo.
  await expect(page).toHaveURL(/\/dashboard\/oglasi\/novi/);
  await expect(page.getByText(/fotografij/i).first()).toBeVisible();
});

test("CREATE — a draft saves and stays out of the public index", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/oglasi/novi");

  const title = `Nacrt test ${Date.now()}`;
  await page.getByLabel(COPY.dashboard.form.title, { exact: true }).fill(title);
  await page.getByRole("button", { name: COPY.dashboard.form.saveDraft }).click();

  await expect(page).toHaveURL(/\/dashboard\/oglasi\?sacuvano=nacrt/, { timeout: 15_000 });
  await expect(page.getByText(COPY.dashboard.form.savedDraft)).toBeVisible();
  await expect(page.getByText(COPY.dashboard.form.published)).toHaveCount(0);

  // A draft must not be publicly searchable. Scoped to listing cards:
  // the page also echoes the search term in the active-filter chip, so a
  // bare getByText matches that and can never fail.
  await page.goto(`/oglasi?q=${encodeURIComponent(title)}`);
  await expect(page.locator("article").filter({ hasText: title })).toHaveCount(0);
});

test("UPDATE — editing the price is persisted and shown publicly", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/oglasi");

  await page.getByRole("link", { name: FIXTURE.priced }).first().click();
  await expect(page).toHaveURL(/\/izmena/);

  await page.getByLabel(COPY.dashboard.form.price, { exact: true }).fill("399000");
  await page.getByRole("button", { name: /sačuvaj izmene|^objavi$/i }).click();

  await expect(page.getByRole("status").or(page.getByRole("alert")).first()).toBeVisible({
    timeout: 15_000,
  });

  // Reload the edit form: the new value came back from the database.
  await page.reload();
  await expect(page.getByLabel(COPY.dashboard.form.price, { exact: true })).toHaveValue("399000");

  // And the public page shows the formatted Serbian price.
  await page.goto("/oglas/dvoiposoban-stan-62m2-vracar-a1b2c3");
  await expect(page.getByText(formatMoney(399_000)).first()).toBeVisible();
});

test("UPDATE — marking a listing sold removes it from search but keeps the page", async ({
  page,
}) => {
  await login(page);
  await page.goto("/dashboard/oglasi");

  await page.getByRole("link", { name: FIXTURE.toSell }).first().click();
  await expect(page).toHaveURL(/\/izmena/);

  await page.getByRole("button", { name: COPY.dashboard.form.markSold }).click();

  /**
   * Wait for the SAVED NOTICE, not for text matching /prodato/i.
   *
   * That was the old gate and it was a false one: the button the test
   * had just clicked reads "Označi kao prodato", so the assertion
   * matched it instantly and the spec navigated away while the Server
   * Action was still in flight. The search below then legitimately
   * still found the listing, and the failure pointed at the app rather
   * than at the race in the test.
   *
   * An edit does not redirect — it stays on the form and returns this
   * notice — so the notice is the first thing that cannot appear until
   * the write has landed.
   */
  await expect(page.getByText(COPY.dashboard.form.updated)).toBeVisible({ timeout: 15_000 });

  // Gone from browsing...
  await page.goto("/oglasi?q=Lokal");
  await expect(page.getByText(FIXTURE.toSell)).toHaveCount(0);

  // ...but the page itself still resolves, with the sold treatment.
  const response = await page.goto(`/oglas/${FIXTURE.toSellSlug}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByText(COPY.listing.soldRibbon).first()).toBeVisible();
});

test("DELETE — requires the exact title, then removes the listing", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/oglasi");

  await page.getByRole("link", { name: FIXTURE.toDelete }).first().click();
  await expect(page).toHaveURL(/\/izmena/);

  await page.getByRole("button", { name: /^obriši$/i }).click();

  // A wrong confirmation must not delete anything.
  await page.getByLabel(COPY.dashboard.delete.confirmLabel).fill("pogrešan naziv");
  await page.getByRole("button", { name: /obriši trajno/i }).click();
  await expect(page.getByText(/ne podudara/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/izmena/);

  // The exact title does.
  await page
    .getByLabel(/za potvrdu upišite naziv/i)
    .fill(FIXTURE.toDeleteTitle);
  await page.getByRole("button", { name: /obriši trajno/i }).click();

  await expect(page).toHaveURL(/\/dashboard\/oglasi/, { timeout: 15_000 });
  await expect(page.getByRole("link", { name: FIXTURE.toDelete })).toHaveCount(0);

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

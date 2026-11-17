const EXPECTED_SLUGS = [
  "burns-park-driveway",
  "eberwhite-saturday",
  "kerrytown-garage",
  "old-west-semester",
  "packard-graduation",
  "south-main-carport",
  "stadium-lawn",
  "water-hill-summer",
]

const TIMEOUT_MS = 8000

function headers(anonKey, extra = {}) {
  return {
    apikey: anonKey,
    authorization: `Bearer ${anonKey}`,
    accept: "application/json",
    ...extra,
  }
}

async function request(env, path, init = {}) {
  const response = await fetch(new URL(path, env.url), {
    ...init,
    headers: headers(env.anonKey, init.headers),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const text = await response.text()
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }
  return { status: response.status, body }
}

function denied(result) {
  const code = result.body && typeof result.body === "object" ? result.body.code : ""
  return result.status === 401 || result.status === 403 || code === "42501"
}

export async function checkHostedCatalogRead(env) {
  const problems = []
  const published = await request(
    env,
    "/rest/v1/listings?select=slug,price_cents,available_from,available_until,status,listing_photos(path,sort_order)&status=eq.published&order=slug.asc",
  )
  if (published.status !== 200 || !Array.isArray(published.body)) {
    problems.push(`published read failed (${published.status})`)
    return { ok: false, problems, publishedCount: 0, photoCount: 0, draftVisible: null }
  }

  const slugs = published.body.map((row) => row.slug)
  if (slugs.join() !== EXPECTED_SLUGS.join()) {
    problems.push(`published slugs were ${slugs.join(",") || "(none)"}`)
  }
  let photoCount = 0
  for (const row of published.body) {
    if (!Number.isInteger(row.price_cents) || row.price_cents < 0) {
      problems.push(`${row.slug} has a non-integer price`)
    }
    if (!(row.available_from <= row.available_until)) {
      problems.push(`${row.slug} has an inverted availability window`)
    }
    if (row.status !== "published") problems.push(`${row.slug} was not published`)
    const photos = Array.isArray(row.listing_photos) ? row.listing_photos : []
    photoCount += photos.length
    if (photos.length < 1 || photos.some((photo) => !photo.path)) {
      problems.push(`${row.slug} is missing a photo`)
    }
  }

  const draft = await request(
    env,
    "/rest/v1/listings?select=slug&or=(slug.eq.hidden-sample-draft,status.eq.draft)",
  )
  const draftVisible = Array.isArray(draft.body) && draft.body.length > 0
  if (draft.status !== 200) problems.push(`draft read failed (${draft.status})`)
  if (draftVisible) problems.push("anonymous client can read a draft")

  return {
    ok: problems.length === 0,
    problems,
    publishedCount: published.body.length,
    photoCount,
    draftVisible,
  }
}

export async function checkAnonymousWriteDenied(env) {
  const write = await request(env, "/rest/v1/listings", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({
      slug: "anon-write-probe",
      title: "Anonymous write probe",
      summary: "This row should never be stored.",
      description: "Write probe.",
      category: "storage",
      space_type: "Garage",
      neighborhood: "Kerrytown",
      city: "Ann Arbor",
      state: "MI",
      price_cents: 1,
      price_unit: "month",
      capacity_label: "None",
      available_from: "2026-01-01",
      available_until: "2026-01-02",
      status: "published",
      sample_host_label: "Probe",
      sort_order: 1000,
      is_demo: true,
    }),
  })
  const writeDenied = denied(write)
  if (!writeDenied) {
    await request(env, "/rest/v1/listings?slug=eq.anon-write-probe", { method: "DELETE" })
  }
  return { writeDenied, status: write.status }
}

export async function checkHostedCatalog(env) {
  const read = await checkHostedCatalogRead(env)
  if (!read.ok) return { ...read, writeDenied: null }
  const write = await checkAnonymousWriteDenied(env)
  const problems = [...read.problems]
  if (!write.writeDenied) problems.push(`anonymous insert was not denied (${write.status})`)
  return { ...read, ok: problems.length === 0, problems, writeDenied: write.writeDenied }
}

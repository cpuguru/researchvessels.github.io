-- ResearchVessels.org: operator-maintained equipment, specs, claims and review queue.
-- Target: PostgreSQL 15+ (PostGIS not needed for these tables). API later: FastAPI or PostgREST.
-- Public read model = tables/views without personal data; personal data (claimant emails) lives only in
-- operator_account / vessel_claim, which are never exposed by the public API or the static export.

CREATE TYPE verification_t AS ENUM ('operator-verified', 'compiled');
CREATE TYPE equip_status_t AS ENUM ('installed', 'planned', 'removed');
CREATE TYPE vessel_role_t  AS ENUM ('marine_superintendent', 'technician', 'operator_admin', 'read_only');
CREATE TYPE claim_tier_t   AS ENUM ('domain', 'registry', 'admin');            -- 1, 2, 3
CREATE TYPE claim_state_t  AS ENUM ('pending', 'active', 'revoked', 'transferred', 'rejected');
CREATE TYPE review_state_t AS ENUM ('pending_review', 'approved', 'rejected', 'superseded');

-- Controlled vocabulary (mirrors data/equipment_vocab.json). L05 = SeaDataNet device categories.
CREATE TABLE equipment_category (
  key        text PRIMARY KEY,                         -- acoustics, ctd, winches, handling, labs, vehicles, underway, comms, other
  label_en   text NOT NULL,
  sort_order int  NOT NULL
);
CREATE TABLE category_l05 (
  category_key text REFERENCES equipment_category(key),
  l05_code     text NOT NULL,                          -- e.g. 157 multi-beam echosounders
  l05_label    text NOT NULL,
  PRIMARY KEY (category_key, l05_code)
);
CREATE TABLE l22_instrument (                          -- cached from vocab.nerc.ac.uk/collection/L22
  code       text PRIMARY KEY CHECK (code ~ '^TOOL[0-9]{4}$'),
  pref_label text NOT NULL,
  deprecated boolean NOT NULL DEFAULT false,
  fetched_at timestamptz NOT NULL
);

-- Provenance shared by every operator-editable value.
CREATE TABLE provenance (
  id            bigserial PRIMARY KEY,
  verification  verification_t NOT NULL,
  source        text CHECK (length(source) <= 300),
  source_url    text CHECK (source_url ~* '^https?://'),
  by_role       text CHECK (length(by_role) <= 80),     -- role label only, never a person's name
  by_account    bigint,                                  -- FK to operator_account (private); NULL for compiled data
  submission_id text,                                    -- FK to change_submission
  at            date NOT NULL
);

CREATE TABLE vessel_equipment (
  id               text PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9._-]{1,64}$'),
  vessel_id        text NOT NULL,                        -- FK to vessel(id), e.g. MV-0423
  category_key     text NOT NULL REFERENCES equipment_category(key),
  category_other   text CHECK (length(category_other) <= 60),
  name             text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  make             text CHECK (length(make) <= 80),
  model            text CHECK (length(model) <= 80),
  l22_code         text REFERENCES l22_instrument(code),
  l05_code         text,
  quantity         int  CHECK (quantity BETWEEN 1 AND 999),
  specs            text CHECK (length(specs) <= 300),
  measure_param    text,                                 -- swl, wire_length, wire_diameter, depth_rating, frequency, area, volume, power
  measure_value_si double precision CHECK (measure_value_si >= 0),
  measure_unit_si  text,                                 -- kg, m, Hz, m2, m3, W
  display_unit     text,
  status           equip_status_t NOT NULL DEFAULT 'installed',
  notes            jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {"en": "...", "fr": "..."}; keys are BCP 47 language codes
  notes_original_lang text CHECK (notes_original_lang ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$'),
  updated_at       date NOT NULL,
  updated_by_role  text,
  provenance_id    bigint NOT NULL REFERENCES provenance(id),
  CHECK (category_key <> 'other' OR category_other IS NOT NULL),
  CHECK (jsonb_typeof(notes) = 'object')
);
CREATE INDEX ON vessel_equipment (vessel_id, category_key);

-- Extended specs, one row per field, values in SI.
CREATE TABLE vessel_spec (
  vessel_id     text NOT NULL,
  field         text NOT NULL,                          -- length, beam, draft, gross_tonnage, berths_science, crew, endurance, range, speed_cruise, homeport
  value_si      double precision CHECK (value_si >= 0),
  value_text    text CHECK (length(value_text) <= 120),
  display_unit  text,
  provenance_id bigint NOT NULL REFERENCES provenance(id),
  PRIMARY KEY (vessel_id, field),
  CHECK ((value_si IS NULL) <> (value_text IS NULL))
);
CREATE TABLE vessel_contact (                           -- role mailboxes only; published
  id            bigserial PRIMARY KEY,
  vessel_id     text NOT NULL,
  role          text NOT NULL,                          -- marine_operations, scheduling, science_support, general
  email         text CHECK (length(email) <= 254),
  url           text CHECK (url ~* '^https?://'),
  provenance_id bigint NOT NULL REFERENCES provenance(id),
  CHECK (email IS NOT NULL OR url IS NOT NULL)
);
CREATE TABLE vessel_verification (
  vessel_id              text PRIMARY KEY,
  last_operator_verified date,                          -- shown on the public page
  next_reminder_due      date                           -- maintenance bot proposes a reminder after this
);

-- Operator registries used for tier-2 cross-checks (UNOLS, EUROFLEETS/ERVO, POGO, IOC/IODE, national lists).
CREATE TABLE operator_registry_entry (
  id            bigserial PRIMARY KEY,
  registry      text NOT NULL,                          -- 'UNOLS', 'ERVO', 'POGO', 'IODE', 'national:IE', ...
  operator_name text NOT NULL,
  email_domains text[] NOT NULL DEFAULT '{}',
  vessel_ids    text[] NOT NULL DEFAULT '{}',
  source_url    text,
  checked_at    date NOT NULL
);

-- PRIVATE: accounts and claims. Never exported to the static site or the public API.
CREATE TABLE operator_account (
  id            bigserial PRIMARY KEY,
  email         text NOT NULL UNIQUE CHECK (length(email) <= 254),
  email_domain  text GENERATED ALWAYS AS (lower(split_part(email, '@', 2))) STORED,
  auth_method   text NOT NULL DEFAULT 'magic_link',     -- magic_link | oidc:<institution>
  created_at    timestamptz NOT NULL DEFAULT now(),
  disabled_at   timestamptz
);
CREATE TABLE vessel_claim (                             -- many claimants per vessel
  id            bigserial PRIMARY KEY,
  vessel_id     text NOT NULL,
  account_id    bigint NOT NULL REFERENCES operator_account(id),
  role          vessel_role_t NOT NULL,
  organisation  text NOT NULL,
  tier          claim_tier_t NOT NULL DEFAULT 'domain',
  registry_match bigint REFERENCES operator_registry_entry(id),
  state         claim_state_t NOT NULL DEFAULT 'pending',
  approved_by   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  UNIQUE (vessel_id, account_id)
);
-- Ownership / operator change (e.g. Celtic Voyager -> Moses Appaqaq, 2023): closes old claims, opens the vessel to the new operator.
CREATE TABLE vessel_transfer (
  id                bigserial PRIMARY KEY,
  vessel_id         text NOT NULL,
  effective         text NOT NULL CHECK (effective ~ '^\d{4}(-\d{2}){0,2}$'),
  from_operator     text NOT NULL,
  to_operator       text NOT NULL,
  note              text,
  source_url        text CHECK (source_url ~* '^https?://'),
  requested_by      bigint REFERENCES operator_account(id),
  approved_by       text,
  state             review_state_t NOT NULL DEFAULT 'pending_review',
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Review queue: every change waits here for the editor.
CREATE TABLE change_submission (
  submission_id text PRIMARY KEY CHECK (submission_id ~ '^sub-[0-9]{8}-[0-9a-f]{12}$'),
  vessel_id     text NOT NULL,
  account_id    bigint REFERENCES operator_account(id),  -- NULL for anonymous/emailed prototype submissions
  payload       jsonb NOT NULL,                          -- rv-equipment-change/1
  claim_tier    claim_tier_t,
  state         review_state_t NOT NULL DEFAULT 'pending_review',
  report_md     text,                                    -- output of apply_equipment_change.py
  received_at   timestamptz NOT NULL DEFAULT now(),
  decided_at    timestamptz,
  decided_by    text
);
-- Append-only audit trail (public extract shows role + date + field, never the account).
CREATE TABLE audit_log (
  id            bigserial PRIMARY KEY,
  at            timestamptz NOT NULL DEFAULT now(),
  vessel_id     text NOT NULL,
  submission_id text REFERENCES change_submission(submission_id),
  actor_role    text,
  actor_account bigint REFERENCES operator_account(id),
  action        text NOT NULL,                           -- item_added, item_changed, item_removed, spec_changed, contact_changed, verified, claim_*, transfer_*
  target        text,
  before        jsonb,
  after         jsonb
);
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;

-- Public read view used by the API and the static export (no personal data).
CREATE VIEW public_vessel_equipment AS
SELECT e.vessel_id, e.id, e.category_key, e.category_other, e.name, e.make, e.model, e.l22_code, e.l05_code, e.quantity, e.specs,
       e.measure_param, e.measure_value_si, e.measure_unit_si, e.display_unit, e.status, e.notes, e.notes_original_lang,
       e.updated_at, e.updated_by_role, p.verification, p.source, p.source_url, p.at AS verified_at
FROM vessel_equipment e JOIN provenance p ON p.id = e.provenance_id;

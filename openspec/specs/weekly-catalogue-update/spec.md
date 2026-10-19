# weekly-catalogue-update Specification

## Purpose
A weekly job that reads a fixed list of official Claude sources, finds new items, drafts catalogue and changelog entries, and opens one pull request for the owner to check and merge.

## Requirements

### Requirement: Weekly schedule and manual run
The `weekly-update` workflow SHALL run every Monday at 07:00 UK time and on manual dispatch, only against `main`. It SHALL NOT run on `pull_request` or `push` events.

#### Scenario: Scheduled run
- **WHEN** it is Monday 07:00 UK time
- **THEN** the workflow runs once against the head of `main`

#### Scenario: Pull request from a fork
- **WHEN** anyone opens or updates a pull request, including from a fork
- **THEN** the workflow does not run and its secrets are not exposed

### Requirement: Fixed list of official sources
The job SHALL read its sources only from `pipeline/sources.yaml`. Each source SHALL name an id, a URL on an allowed official host and a parser. The initial list SHALL include the Claude support release notes, claude.dev, anthropic.com/news and the Claude Code changelog.

#### Scenario: Source on a disallowed host
- **WHEN** `pipeline/sources.yaml` lists a URL whose host is not on the allowed host list
- **THEN** validation fails locally and in CI before the workflow can use it

### Requirement: Detect only new items
The job SHALL split each source into dated items, each with a stable key, a title, a date and an item URL. It SHALL compare them with that source's committed snapshot in `pipeline/snapshots/`. An item SHALL count as new only if its key is absent from the snapshot on `main`.

#### Scenario: Nothing new
- **WHEN** no source has items missing from its snapshot
- **THEN** the job opens no pull request, edits no open one, and finishes successfully

#### Scenario: Earlier weekly PR not yet merged
- **WHEN** new items exist and a `[Weekly update]` pull request from a previous week is still open
- **THEN** the job rebuilds that same branch from `main`, includes every item still missing from the snapshots on `main`, and updates the existing pull request instead of opening another

### Requirement: Capped AI drafting
For each new item the job SHALL draft one `features` entry and one `changelog` entry, using the adapter function `draftCatalogueEntry`. It SHALL make at most 20 model calls per run. Items beyond the cap, or items the model fails to draft, SHALL get a plain stub entry instead.

#### Scenario: Cap reached
- **WHEN** a run has 25 new items
- **THEN** the first 20 are drafted with the model, the remaining 5 get stub entries, and the pull request body says so

#### Scenario: No AI credentials configured
- **WHEN** the AI secrets are missing
- **THEN** every new item gets a stub entry and the pull request is still opened

### Requirement: Dates and links come from the source
Entry dates (`shippedOn`, changelog `date`) and links (`officialUrl`, changelog `url`) SHALL be copied from the source item, never from model output.

#### Scenario: Model returns a different link
- **WHEN** the model output contains a URL or a date
- **THEN** the drafted entry uses the source item's URL and date, and ignores the model's

### Requirement: Model output is limited to wording
Model output SHALL only fill wording fields (`name`, `plainWords`, `whatItIs`, `whoItIsFor`, `forChips`, `bullets`, `tryPrompt`, `pitfalls`), a `surface` guess and `introduces` ids. A guess or id that does not match an existing catalogue id SHALL be dropped.

#### Scenario: Model invents a surface
- **WHEN** the model's surface guess is not an existing surface id
- **THEN** the entry gets no surface and an `# OWNER: choose surface` comment

### Requirement: Owner-confirmed facts are flagged
`plans` SHALL default to the plans of the guessed surface, with a `# OWNER: confirm plans` comment above it. Every drafted entry SHALL carry a `# OWNER: confirm availability` comment.

#### Scenario: Plans defaulted
- **WHEN** an entry is drafted for a feature on the Cowork surface
- **THEN** its `plans` equal the Cowork surface plans, with a `# OWNER: confirm plans` comment above them

### Requirement: Untrusted source text
Fetched page text SHALL be treated as untrusted data. Model output SHALL be validated against a strict schema, with length limits on every field, before use. It SHALL be written through a YAML serialiser, never by string concatenation, and SHALL NOT contain em or en dashes.

#### Scenario: Prompt injection in a release note
- **WHEN** a source item contains instructions aimed at the model
- **THEN** any output that fails the schema or limits is discarded and the item gets a stub entry

### Requirement: Self-validation before publishing
Before pushing its branch, the job SHALL run catalogue validation, the data build, the no-dashes check and the unit tests. If any of them fails, it SHALL drop the model drafts, retry with stub entries only, and report the failure in the pull request body. It SHALL then trigger the `ci` workflow on its branch.

#### Scenario: Draft breaks validation
- **WHEN** a drafted entry makes catalogue validation fail
- **THEN** the job replaces the drafts with stubs, passes validation, opens the pull request, and states which item failed and why

### Requirement: One clearly named pull request
The job SHALL open or update exactly one pull request. It SHALL be titled `[Weekly update] YYYY-MM-DD: N new items`, where the date is the run date in UK time and N is the number of new items. It SHALL be assigned to the owner and labelled `catalogue`. The body SHALL list every item with its source, its link and the facts the owner must confirm, plus any items that may affect existing routes.

#### Scenario: Title format
- **WHEN** the run on 19 October 2026 finds 4 new items
- **THEN** the pull request title is `[Weekly update] 2026-10-19: 4 new items`

#### Scenario: Merging publishes
- **WHEN** the owner merges the pull request
- **THEN** the snapshots on `main` include the merged items, the next run does not propose them again, and Cloudflare deploys the updated catalogue

### Requirement: Quiet failure handling
A source that cannot be fetched or parsed SHALL NOT fail the workflow. It SHALL be listed in the pull request body when there is one. Only a source that has failed on two consecutive runs SHALL open or update a single issue titled `[Weekly update] source problem`. The workflow run itself SHALL finish successfully unless the job's own code crashes.

#### Scenario: One source down for one week
- **WHEN** claude.dev times out on one run
- **THEN** the other sources are processed, the run succeeds, and no issue is opened

#### Scenario: Source down two weeks running
- **WHEN** the same source fails on two consecutive runs
- **THEN** the single `[Weekly update] source problem` issue is opened, or updated if it already exists

## MODIFIED Requirements

### Requirement: Capped AI drafting
For each new item from a `release-notes` source the job SHALL draft one `features` entry and one `changelog` entry, using the adapter function `draftCatalogueEntry`. Items from `news`, `blog` and `changelog` sources SHALL get a changelog entry only, with no model call and no `features` entry. The job SHALL make at most 20 model calls per run. Release-note items beyond the cap, or that the model fails to draft, SHALL get a plain stub entry instead.

#### Scenario: Cap reached
- **WHEN** a run has 25 new release-note items
- **THEN** the first 20 are drafted with the model, the remaining 5 get stub entries, and the pull request body says so

#### Scenario: No AI credentials configured
- **WHEN** the AI secrets are missing
- **THEN** every new release-note item gets a stub entry and the pull request is still opened

#### Scenario: Company news post
- **WHEN** a new item comes from the `anthropic-news` source
- **THEN** it gets a changelog entry with the source title, date and link, no `features` entry is written, and no model call is made for it

#### Scenario: Blog post
- **WHEN** a new item comes from the `claude-dev` blog source
- **THEN** it gets a changelog entry only, and no model call is made for it

## ADDED Requirements

### Requirement: News lines flagged for review
The weekly pull request body SHALL mark every changelog line that came from a `news` source, so the owner can delete lines that are not about Claude before merging.

#### Scenario: Off-topic news post
- **WHEN** a run includes a news post about an office opening
- **THEN** its row in the pull request says it is a news changelog line to delete if it is not about Claude

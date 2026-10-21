# GitHub Project Template: TDK Landscape Delivery

A GitHub Projects template for planning work on a TDK landscape. You build it once in the browser (no tokens or scripts), mark it as a template, and it then appears under **Recommended templates** whenever someone in the `flisk-sh` organization creates a new project.

The repository side is already in place:

- [`.github/ISSUE_TEMPLATE/`](../.github/ISSUE_TEMPLATE): issue forms (resource change, new resource, bug) that ask for the same Stack and Resource the project tracks.
- [`.github/project-template/readme.md`](../.github/project-template/readme.md): the README to paste into the project.

## 1. Create the project

1. Go to [github.com/orgs/flisk-sh/projects](https://github.com/orgs/flisk-sh/projects) and choose **New project**, then **Table**.
2. Name it **TDK Landscape Delivery (template)**.
3. Open **⋯ → Settings**.
   - Short description: *Plan and ship a TDK Project-Stack-Resource landscape: one item per resource change, tracked by stack, phase, priority, and sprint.*
   - README: paste the contents of [`readme.md`](../.github/project-template/readme.md).

## 2. Fields

In **Settings → Custom fields**, edit the built-in **Status** field, then add the rest with **+ New field**.

| Field | Type | Options |
| --- | --- | --- |
| Status | Single select (built in) | Backlog, Ready, In progress, In review, Done |
| Stack | Single select | guest, kitchen, operations, platform |
| Resource | Single select | reservation-api, reservation-app, kitchen-api, kitchen-worker, menu-api, floor-app, new resource, cross-cutting |
| Phase | Single select | Pre-Alpha, Alpha, Beta, Out of Scope (the phases in [`.tdk/project.json`](../.tdk/project.json)) |
| Priority | Single select | P0, P1, P2 |
| Size | Single select | XS, S, M, L, XL |
| Estimate | Number | |
| Target date | Date | |
| Sprint | Iteration | 2-week duration |

## 3. Views

1. Rename *View 1* to **Board**. Switch the layout to Board, with Status as the column field.
2. Add a view **By stack**. Layout: Table. Group by: Stack. Show Resource, Priority, Size, and Sprint.
3. Add a view **Roadmap**. Layout: Roadmap. Dates: Target date. Group by: Phase.

## 4. Workflows

In **⋯ → Workflows**, turn on *Item closed → Done* and *Pull request merged → Done*. Leave *Auto-add* off on the template, because each project made from it points auto-add at its own repository.

## 5. Sample items (optional)

Draft items are copied into every project made from the template, so a few examples show new teams how to write resource-scoped work. Add these with **+ Add item** at the bottom of the table:

| Title | Status | Stack | Resource | Phase | Priority | Size |
| --- | --- | --- | --- | --- | --- | --- |
| Bring the landscape up locally with `tdk up` | Ready | platform | cross-cutting | Pre-Alpha | P0 | S |
| reservation-api: persist reservations and waitlist | Backlog | guest | reservation-api | Pre-Alpha | P1 | M |
| reservation-app: host stand table-hold screen | Backlog | guest | reservation-app | Alpha | P1 | M |
| kitchen-worker: course-fire signal when tickets age | Backlog | kitchen | kitchen-worker | Alpha | P1 | S |
| menu-api: 86 an item and propagate to floor-app | Backlog | operations | menu-api | Alpha | P2 | S |
| New resource: payments-api in a new `billing` stack | Backlog | platform | new resource | Beta | P2 | L |

## 6. Make it a template

1. In the project, open **⋯ → Settings** and choose **Make template**.
2. An organization owner opens [organization settings → Projects](https://github.com/organizations/flisk-sh/settings/projects), checks that **Enable Projects for the organization** is on, and under **Recommended templates** adds **TDK Landscape Delivery (template)**.

## Labels (optional)

The issue forms apply `bug`, `enhancement`, and `new-resource`. GitHub creates `bug` and `enhancement` by default. Add `new-resource` under **Issues → Labels**, and optionally add `stack:guest`, `stack:kitchen`, `stack:operations`, and `stack:platform`.

## Using the template

Choose *New project → Recommended → TDK Landscape Delivery*, or open the template and choose **Use this template**. The copy gets the fields, views, draft items, and workflows. Auto-add is the one exception. Then:

1. Replace the `Resource` options with the `appName` values from your own `services/*/*/service.json`.
2. Link your repository in *Settings → Linked repositories*.
3. Turn on *Auto-add to project* for that repository.

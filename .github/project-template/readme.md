## TDK Landscape Delivery

This project tracks work on a TDK **Project-Stack-Resource** landscape. It ships with [tdk-restaurant-example](https://github.com/flisk-sh/tdk-restaurant-example) as its reference repository.

Every item is one change to one resource. `Stack` and `Resource` tell you where to run it (`tdk up <stack>`). `Phase` matches the phases in `.flisk/project.json`.

### Fields

| Field | Use |
| --- | --- |
| Status | Backlog → Ready → In progress → In review → Done |
| Stack | `guest`, `kitchen`, `operations`, or `platform` |
| Resource | The `appName` from the resource's `service.json` |
| Phase | Pre-Alpha, Alpha, Beta, Out of Scope |
| Priority / Size / Estimate | Triage and capacity planning |
| Target date / Sprint | Roadmap and two-week iterations |

### Views

- **Board**: grouped by Status. Use this in standup.
- **By stack**: a table grouped by Stack. Each stack owner triages their own group.
- **Roadmap**: a roadmap on Target date, grouped by Phase.

### Using this template for your own landscape

1. Choose **Use this template** (or pick it from *New project → Recommended*).
2. Change the `Resource` options to match the `appName` values in your `services/*/*/service.json`.
3. Link your repository under *Settings → Manage access / Linked repositories*.
4. Delete the sample draft items, or convert them into issues.

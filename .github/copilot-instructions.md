## Pull Request Description

When generating a PR description, always fill every section of the
`.github/PULL_REQUEST_TEMPLATE.md` template. Rules:

- Summary: one or two sentences explaining what the PR does and why.
- Type of Change: check all boxes that apply based on the diff.
- Scope of Change: list every file touched, grouped by layer (controller, service, schema, module, spec).
- API Contract: extract method + path from the diff; set OperationId from the controller decorator.
- Test Evidence: count passing tests from spec files in the diff; list file paths.
- Status Code Matrix: only include rows for status codes that are reachable in the implementation.
- Out of Scope: list anything the issue mentions that was NOT implemented.
- get `#[ISSUE_NUMBER]` from the branch name, not from the issue title or description, to avoid errors if the issue number is mentioned elsewhere in the text.

# QuestOS legal operator

Legal operator: **not supplied**. Do not substitute the QuestOS product brand as legal identity.

Run this once the owner supplies the exact public legal person/business name, from PowerShell:

```powershell
$env:LEGAL_OPERATOR_NAME = Read-Host 'Exact legal operator name'
bun scripts/legal-operator.mjs
Remove-Item Env:LEGAL_OPERATOR_NAME
```

The command validates a nonempty single-line name, updates the shared public identity JSON
consumed by Privacy Policy, Terms and account deletion, this compliance identity record,
`play-console-values.json`, a separate operator line in the English listing description,
and its copy-ready Markdown version.
It never changes the QuestOS title or privately verified Play developer/payment identity.
All compliance packs refer to this canonical record instead of independently maintained names.

Review the diff, run required checks, deploy the existing Worker, then commit/push the public changes.
The legal pages use the existing Android HTTPS runtime; no AAB rebuild is required.
Enter the same exact legal identity in Console's developer verification/payment fields where required.
Jurisdiction, address, tax/bank details and public developer display name are separate facts.

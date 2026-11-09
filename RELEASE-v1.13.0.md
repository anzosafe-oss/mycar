# MyCar v1.13.0

Move Settings, About and Sign out into a responsive header dropdown. Keep Home,
Vehicles, Add and History in the main navigation. Preserve the borderless shell
and full-width vehicle form from v1.12.1.

Administrators get a separate Access requests page, using the existing invitation
and account activity endpoint. Check administrator status on the server before
showing its menu entry or loading the list. Share concurrent role checks, discard
stale results when the user changes, and clear cached authorization on sign out.
The server allowlist and all invitation approval checks remain unchanged.

Restore Settings, About and Access requests after refresh. Existing invitation
notification links now open the Access requests page directly. Unauthorized
visitors see a restricted-access message and no account data.

Validation: 5 client authorization tests and 12 existing server invitation tests
pass. Mobile browser QA at 390px used an isolated mock backend and fictitious data:
admin/member menus, direct unauthorized route, account list, approval confirmation
and cancellation, Settings and sign out. No live invitations were sent during QA.
JavaScript syntax and production asset-version checks pass. No database or Edge
Function changes are required.

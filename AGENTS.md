<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep legacy workspace storage behind the per-workspace cloud bridge rather than origin-wide localStorage, so company tabs cannot read each other's data.
- Persist pending writes under both user and company IDs, and serialize atomic cloud batches, so connection failures and navigation do not discard accepted edits.
- Use the security-invoker sync_company_data RPC for cloud batches; database authorization and row policies remain the authority for company access.
- Keep password recovery in a public dedicated route using the existing auth SDK and validate recovery context before password updates; ordinary sessions are not recovery authorization.
- Never apply incompatible access-policy changes to a backend shared with production before isolated testing and explicit rollout approval; a preview-only UI change does not isolate database effects.
- Company removal is soft archival through an owner-authorized database RPC; subscription messages and sensitive operations are saved atomically with an audit event to retain financial data.

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

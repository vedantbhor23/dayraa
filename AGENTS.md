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

Dayraa uses one private `life_items` table for the first personal-content types; shared content will need separate permission-aware data paths because ownership must never transfer.
Dayraa's authenticated workspace lives under a pathless protected route, while the public account screen lives at `/` and `/auth`, because private content must not render before account validation.
- Entry access = owner OR `visibility='public'` (owner profile viewable) OR `visibility='shared'` + `item_shares` grant; workspace lists filter `owner_id` explicitly — why: RLS now returns others' visible rows too.
- Profile visibility, discoverability and entry visibility are independent settings; people lookups go through `search_people`/`my_connections` definer functions — why: never expose non-public profile rows.

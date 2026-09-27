# AGENTS
- Couple linking goes through security-definer RPCs (create_couple, preview_invite, join_couple, leave_couple); tables have no client write policies — keeps the 2-member / 1-couple rules atomic and server-enforced.
- Private data visibility uses public.is_partner()/my_couple_id() in RLS — avoids recursive policies.
- Avatars live in a private bucket under `<uid>/…`, read via signed URLs — only owner and partner can see them.
- Signed-in screens live under the pathless `_app` layout (client-only auth gate + bottom nav).

# Deploy the telemt MTProxy on Fly.io

**Can this run on Vercel? No.** A Telegram MTProxy is a long-running daemon that
holds **raw TCP / MTProto** connections on a public port. Vercel is HTTP-only
serverless — no raw-TCP ingress, ~30-minute function cap, no always-on process —
so it cannot host the proxy. (Same for Netlify / Cloudflare Pages.) **Fly.io can**,
because it gives you a raw TCP service on a **dedicated IPv4**.

## Scope & honesty
- This branch deploys the **proxy only** (telemt). The Next.js **console**,
  **Postgres**, and **stats** are not included here — keep those on your VPS, or
  they'd each need their own Fly app. The proxy is the part you actually need
  reachable by clients.
- It's close to "connect repo + set env vars," but **not 100% zero-CLI**: Fly
  requires you to **allocate a dedicated IPv4** (one command/dashboard action,
  ~$2/mo) for raw TCP, and you set secrets via `fly secrets` or the dashboard.
- **Verify with one deploy** before trusting it — I can't test Fly from here.

## One-time setup
1. Install flyctl (`curl -L https://fly.io/install.sh | sh`) and `fly auth login`,
   **or** use the Fly dashboard (https://fly.io/dashboard) for the equivalent steps.
2. From the repo root on this `fly` branch, create the app **without deploying**:
   ```bash
   fly launch --no-deploy --copy-config --name <your-app-name> --region fra
   ```
   (Edit `app`/`primary_region` in `fly.toml` if you prefer.)
3. Set your secrets (these are the "env vars" you add):
   ```bash
   fly secrets set \
     TELEMT_SECRET=$(openssl rand -hex 16) \
     TLS_DOMAIN=cloudflare.com
   #   AD_TAG=<32-hex from @MTProxybot>      # optional, add later for campaigns
   #   USE_MIDDLE_PROXY=true                  # default true (needed for ad-tag)
   ```
   Save the `TELEMT_SECRET` value — you need it for the connect link and for
   registering with @MTProxybot.
4. **Allocate a dedicated IPv4 (required for raw TCP):**
   ```bash
   fly ips allocate-v4        # note the IP it prints; ~$2/mo
   ```
   A shared IPv4 will NOT work for a raw-TCP proxy.
5. Deploy:
   ```bash
   fly deploy
   ```

## Get your connect link
The FakeTLS link is `ee` + your 32-hex secret + hex(TLS_DOMAIN):
```bash
SECRET=<your TELEMT_SECRET>
DOMAIN_HEX=$(printf '%s' cloudflare.com | od -An -tx1 | tr -d ' \n')
echo "tg://proxy?server=<your-dedicated-ipv4>&port=443&secret=ee${SECRET}${DOMAIN_HEX}"
```
Add that link in Telegram and confirm it connects.

## Enable a sponsored channel (campaigns)
1. @MTProxybot → `/newproxy` → send `<dedicated-ipv4>:443` → send the **32-hex**
   `TELEMT_SECRET` (not the `ee…` link secret) → copy the **tag** it returns.
2. `fly secrets set AD_TAG=<that-tag>` then `fly deploy` (keeps `USE_MIDDLE_PROXY=true`).
3. @MTProxybot → `/myproxies` → your proxy → **Set promotion** → a **public**
   channel link (you must be its admin). Wait ~1h; it won't show to accounts
   already subscribed.

## GitHub auto-deploy (optional, closest to "just connect the repo")
Add a `FLY_API_TOKEN` repo secret (`fly tokens create deploy`) and a GitHub
Action that runs `flyctl deploy --remote-only` on push to this branch. Then a
push deploys it. (The dedicated-IPv4 allocation in step 4 is still a one-time
manual action.)

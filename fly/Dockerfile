# Fly.io image for the telemt Telegram MTProxy.
# The official ghcr.io/telemt/telemt image is distroless (no shell), so we copy
# its static binary onto a slim base and add an entrypoint that renders the
# config from env vars / Fly secrets at boot. Telegram clients connect with raw
# MTProto over TCP, which is why this runs on Fly (raw TCP + dedicated IPv4) and
# NOT on Vercel (HTTP-only serverless).
FROM ghcr.io/telemt/telemt:latest AS telemt

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Bring the telemt binary (and any bundled assets) over. It's a static build,
# so it runs on this glibc base without extra libraries.
COPY --from=telemt /app /app
WORKDIR /app

COPY fly/entrypoint.sh /entrypoint.sh
COPY fly/config.toml.tmpl /config.toml.tmpl
RUN chmod +x /entrypoint.sh

# Telegram proxy port; Fly maps the public 443 to this.
EXPOSE 443

ENTRYPOINT ["/entrypoint.sh"]

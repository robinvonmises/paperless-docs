FROM nginx:1.27-alpine

# Betrieb über Umgebungsvariablen (siehe README):
#   PAPERLESS_UPSTREAM  gesetzt -> feste Paperless-Instanz, /api/ wird weitergeleitet
#                       leer    -> Paperless-Adresse wird bei der Anmeldung angegeben
#   PAPERLESS_HOST, PAPERLESS_PUBLIC_URL, DOCS_NAME, DOCS_AREAS, DOCS_ALLOWED_SERVERS (optional)

COPY nginx/proxy.conf.template nginx/direct.conf.template /etc/docs/
COPY docker/15-docs.envsh /docker-entrypoint.d/15-docs.envsh
COPY web/ /usr/share/nginx/html/
RUN chmod +x /docker-entrypoint.d/15-docs.envsh

EXPOSE 80

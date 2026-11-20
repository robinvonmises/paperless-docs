FROM nginx:1.27-alpine

# Wohin /api weitergeleitet wird. Standard: die öffentliche Paperless-Adresse.
# Alternativ im selben Compose-Netz: http://webserver:8000 (dann PAPERLESS_HOST passend setzen).
ENV PAPERLESS_UPSTREAM=https://paperless.vonometzinski.de \
    PAPERLESS_HOST=paperless.vonometzinski.de

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY web/ /usr/share/nginx/html/

EXPOSE 80

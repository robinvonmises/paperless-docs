# Docs – eine aufgeräumte Oberfläche für Paperless-ngx

Eine schlanke Web-App im hellen Apple-Stil, die auf eine bestehende
[Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx)-Instanz zugreift.
Für Handy und Desktop, als App auf den Home-Bildschirm legbar.

Paperless bleibt das System dahinter: OCR, Workflows, Consume-Ordner, Mail und
Berechtigungen laufen unverändert weiter. Die App ist nur eine andere Oberfläche
für das, was man täglich macht.

## Funktionen

- **Übersicht** – Begrüßung, Suche, Posteingang-Hinweis, Bereiche (Tags) als Kacheln, zuletzt hinzugefügt
- **Suche** – Volltextsuche mit markierten Treffern, Filter nach Dokumenttyp
- **Dokument** – Vorschau, Details, Tags, Notizen, Original öffnen/herunterladen, Bearbeiten
- **Posteingang** – ein Dokument nach dem anderen, Vorschläge von Paperless vorausgefüllt, „Übernehmen“ entfernt den Posteingangs-Tag
- **Hochladen / Scannen** – Drag & Drop am Desktop, Kamera am Handy, Verarbeitungsstatus live
- **Bereiche** – Listen je Tag, Korrespondent oder Dokumenttyp

## Wie es funktioniert

Ein kleiner nginx-Container liefert die App aus und leitet alles unter `/api/`
an Paperless weiter. Dadurch braucht es weder CORS noch einen fest
eingebauten API-Token: Man meldet sich mit seinem Paperless-Benutzer an und
sieht genau das, was dieser Benutzer in Paperless sehen darf.

Der Login holt über `/api/token/` den persönlichen API-Token des Benutzers und
speichert ihn im Browser (bei „Angemeldet bleiben“ dauerhaft, sonst nur für die
Sitzung).

## Installation (Docker Compose)

Das Image wird bei jedem Push auf `main` automatisch gebaut und in der GitHub
Container Registry abgelegt: `ghcr.io/robinvonmises/paperless-alternative-frontend:latest`
(amd64 und arm64).

In den Paperless-Stack einfügen:

```yaml
  archiv:
    image: ghcr.io/robinvonmises/paperless-alternative-frontend:latest
    restart: unless-stopped
    ports:
      - "8090:80"
    environment:
      PAPERLESS_UPSTREAM: https://paperless.vonometzinski.de
      PAPERLESS_HOST: paperless.vonometzinski.de
```

Dann im Reverse Proxy (z. B. Nginx Proxy Manager) einen neuen Host anlegen,
z. B. `archiv.example.de` → `<docker-host>:8090`, mit SSL.

| Variable | Bedeutung | Standard |
|---|---|---|
| `PAPERLESS_UPSTREAM` | Wohin `/api/` weitergeleitet wird. Öffentliche URL oder intern `http://webserver:8000` | `https://paperless.vonometzinski.de` |
| `PAPERLESS_HOST` | Host-Header für Paperless (muss in `PAPERLESS_ALLOWED_HOSTS` bzw. `PAPERLESS_URL` erlaubt sein) | `paperless.vonometzinski.de` |

> Das Paket in der GitHub Container Registry ist anfangs privat. Entweder unter
> *GitHub → Packages → paperless-alternative-frontend → Package settings* auf
> „Public“ stellen, oder auf dem Server einmal `docker login ghcr.io` mit einem
> Token (Scope `read:packages`) ausführen.

## Anpassen

`web/config.js` legt den App-Namen, den Link zur klassischen Paperless-Oberfläche
und die Bereiche fest (Tag-Name exakt wie in Paperless plus Farbe). Ohne
Neubau des Images lässt sich die Datei auch per Volume überschreiben:

```yaml
    volumes:
      - ./archiv-config.js:/usr/share/nginx/html/config.js:ro
```

## Sicherheit

- Strenge Content-Security-Policy: nur eigene Skripte und Styles, keine Inline-Skripte, keine externen Quellen.
- Treffer-Ausschnitte aus der Volltextsuche und alle Texte aus Paperless werden escaped dargestellt.
- Cookies werden an Paperless weder gesendet noch von dort übernommen; die App nutzt ausschließlich den Token.
- Der Token liegt im Browser-Speicher. Abmelden löscht ihn dort; widerrufen lässt er sich in Paperless unter *Profil → API-Auth-Token neu erzeugen*.

## Entwicklung

Kein Build-Schritt: `web/` enthält reines HTML, CSS und JavaScript. Zum lokalen
Testen reicht der Container:

```bash
docker build -t archiv .
docker run --rm -p 8090:80 -e PAPERLESS_UPSTREAM=https://paperless.example.de -e PAPERLESS_HOST=paperless.example.de archiv
```

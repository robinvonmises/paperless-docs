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

Docs ist eine reine Browser-App: HTML, CSS und JavaScript, ohne eigene Datenbank
und ohne Server-Logik. Auf dem Server wird nichts gespeichert. Alles, was die App
sich merkt (Anmelde-Token, Paperless-Adresse, Merkliste, Ansicht, Design), liegt
im Browser des jeweiligen Geräts.

Der Login holt über `/api/token/` den persönlichen API-Token des Benutzers. Man
sieht genau das, was dieser Benutzer in Paperless sehen darf.

Es gibt zwei Betriebsarten, gewählt über `PAPERLESS_UPSTREAM`:

| | Feste Instanz | Adresse bei der Anmeldung |
|---|---|---|
| Einstellung | `PAPERLESS_UPSTREAM` gesetzt | `PAPERLESS_UPSTREAM` leer |
| Weg der Daten | Browser → Docs-Container → Paperless | Browser → Paperless direkt |
| CORS in Paperless | nicht nötig | nötig (siehe unten) |
| Gedacht für | die eigene Instanz | eine Docs-Installation für mehrere Paperless-Instanzen |

## Installation (Docker Compose)

Das Image wird bei jedem Push auf `main` automatisch gebaut und in der GitHub
Container Registry abgelegt: `ghcr.io/robinvonmises/paperless-docs:latest`
(amd64 und arm64).

### Feste Instanz

```yaml
  docs:
    image: ghcr.io/robinvonmises/paperless-docs:latest
    restart: unless-stopped
    ports:
      - "8090:80"
    environment:
      PAPERLESS_UPSTREAM: https://paperless.example.com
      # optional:
      # DOCS_AREAS: "Haus:#A2845E,Bank:#FF9500,Steuer:#FF3B30"
```

Statt der öffentlichen Adresse geht im selben Compose-Netz auch
`PAPERLESS_UPSTREAM: http://webserver:8000` plus `PAPERLESS_HOST: paperless.example.com`
und `PAPERLESS_PUBLIC_URL: https://paperless.example.com`.

### Adresse bei der Anmeldung

```yaml
  docs:
    image: ghcr.io/robinvonmises/paperless-docs:latest
    restart: unless-stopped
    ports:
      - "8090:80"
```

Auf der Anmeldeseite erscheint dann zusätzlich das Feld **Paperless-Adresse**.
Jede Paperless-Instanz, die Docs nutzen soll, muss die Adresse von Docs für
Anfragen aus dem Browser freigeben (CORS), in deren Paperless-Konfiguration:

```
PAPERLESS_CORS_ALLOWED_HOSTS=https://docs.example.com
```

Fehlt die Freigabe, zeigt die Anmeldeseite genau diese Zeile mit der richtigen
Adresse an. Paperless muss per HTTPS erreichbar sein, wenn Docs per HTTPS läuft.

Weil die App rein statisch ist, kann sie in dieser Betriebsart auch ganz ohne
eigenen Server laufen: Der Ordner `web/` lässt sich auf jedem Webserver ausliefern.

### GitHub Pages

Dieses Repository veröffentlicht `web/` bei jedem Push automatisch auf GitHub Pages:
**https://robinvonmises.github.io/paperless-docs/**

Für einen eigenen Fork: *Settings → Pages → Build and deployment → Source:
GitHub Actions* wählen. Die Paperless-Instanz braucht dann
`PAPERLESS_CORS_ALLOWED_HOSTS=https://<benutzer>.github.io`.

Dann im Reverse Proxy (z. B. Nginx Proxy Manager) einen Host anlegen,
z. B. `docs.example.com` → `<docker-host>:8090`, mit SSL.

### Umgebungsvariablen

| Variable | Bedeutung |
|---|---|
| `PAPERLESS_UPSTREAM` | Paperless, an das `/api/` weitergeleitet wird. Leer = Adresse bei der Anmeldung |
| `PAPERLESS_HOST` | Host-Header für Paperless. Standard: der Host aus `PAPERLESS_UPSTREAM` |
| `PAPERLESS_PUBLIC_URL` | Link „Klassische Paperless-Oberfläche“. Standard: `PAPERLESS_UPSTREAM`, wenn HTTPS |
| `DOCS_NAME` | App-Name (Standard „Docs“) |
| `DOCS_AREAS` | Bereiche auf der Übersicht: `Tag:#Farbe,Tag:#Farbe`. Leer = die acht häufigsten Tags |
| `DOCS_ALLOWED_SERVERS` | Nur bei Adresse-bei-Anmeldung: erlaubte Paperless-Adressen (Leerzeichen-getrennt). Leer = alle |

Bereiche und Farben kann jeder außerdem in der App unter *Einstellungen* ändern;
das gilt dann für diesen Browser.

## Sicherheit

- Strenge Content-Security-Policy: nur eigene Skripte und Styles, keine Inline-Skripte, keine externen Quellen.
- Treffer-Ausschnitte aus der Volltextsuche und alle Texte aus Paperless werden escaped dargestellt.
- Cookies werden an Paperless weder gesendet noch von dort übernommen; die App nutzt ausschließlich den Token.
- Bei „Adresse bei der Anmeldung“ verlassen Zugangsdaten und Dokumente den Browser nur in Richtung der angegebenen Paperless-Instanz. Wer eine fremde Docs-Installation nutzt, vertraut trotzdem deren Betreiber, denn er liefert das JavaScript aus. Im Zweifel selbst hosten oder `DOCS_ALLOWED_SERVERS` setzen.
- Der Token liegt im Browser-Speicher. Abmelden löscht ihn dort; widerrufen lässt er sich in Paperless unter *Profil → API-Auth-Token neu erzeugen*.

## Entwicklung

Kein Build-Schritt: `web/` enthält reines HTML, CSS und JavaScript. Zum lokalen
Testen reicht der Container:

```bash
docker build -t docs .
docker run --rm -p 8090:80 -e PAPERLESS_UPSTREAM=https://paperless.example.de docs   # feste Instanz
docker run --rm -p 8090:80 docs                                                   # Adresse bei der Anmeldung
```

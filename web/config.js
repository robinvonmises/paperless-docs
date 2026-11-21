// Optionale Anpassungen. Im Docker-Container geht das bequemer über Umgebungsvariablen
// (DOCS_NAME, DOCS_AREAS, PAPERLESS_PUBLIC_URL), siehe README.
window.ARCHIV_CONFIG = {
  appName: 'Docs',
  // Link zur normalen Paperless-Oberfläche (im Modus mit Adresseingabe automatisch die angegebene Instanz)
  classicUrl: '',
  // Bereiche auf der Übersicht: Tag-Name exakt wie in Paperless plus Farbe.
  // Leer = automatisch die acht häufigsten Tags. Jeder kann das in der App unter Einstellungen ändern.
  areas: []
};

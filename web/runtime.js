// Wird im Docker-Container beim Start überschrieben (docker/15-docs.envsh).
// Ohne Container (reine statische Auslieferung) gibt man die Paperless-Adresse bei der Anmeldung an.
window.DOCS_RUNTIME = window.DOCS_RUNTIME || { mode: 'direct' };

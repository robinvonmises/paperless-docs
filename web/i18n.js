/* Docs – Sprache
 * Die App ist auf Deutsch geschrieben. Ist Englisch aktiv, übersetzt diese Datei alle Texte,
 * die die App anzeigt (Textknoten sowie placeholder, aria-label, title, alt), direkt beim Einfügen.
 * Unbekannte Texte – z. B. Dokumenttitel oder Tag-Namen – bleiben unverändert.
 */
(function () {
  'use strict';

  let pref = 'auto';
  try { pref = (JSON.parse(localStorage.getItem('archiv.prefs') || '{}').lang) || 'auto'; } catch (e) { /* egal */ }
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  const lang = pref === 'de' || pref === 'en' ? pref : (/^de\b/i.test(nav) ? 'de' : 'en');
  const locale = lang === 'de' ? 'de-DE' : (/^en\b/i.test(nav) ? nav : 'en-GB');
  document.documentElement.lang = lang;

  const EN = {
    // Navigation & allgemein
    'Übersicht': 'Overview', 'Posteingang': 'Inbox', 'Eingang': 'Inbox', 'Alle Dokumente': 'All documents',
    'Volltextsuche': 'Full-text search', 'Durchstöbern': 'Browse', 'Hochladen': 'Upload', 'Scannen': 'Scan',
    'Dokumente': 'Documents', 'Suche': 'Search', 'Einstellungen': 'Settings', 'Merkliste': 'Favourites',
    'Bereiche': 'Areas', 'Anpassen': 'Customise', 'Schnellsuche': 'Quick search', 'Abmelden': 'Sign out',
    'Klassische Paperless-Oberfläche': 'Classic Paperless interface', 'Klassische Oberfläche': 'Classic interface',
    'Navigation': 'Navigation', 'Tabs': 'Tabs', 'Lädt': 'Loading', 'Schließen': 'Close', 'Dialog': 'Dialog',
    'Abbrechen': 'Cancel', 'Sichern': 'Save', 'Löschen': 'Delete', 'Bearbeiten': 'Edit', 'Zurück': 'Back',
    'Fertig': 'Done', 'Alle': 'All', 'Keine': 'None', 'Ändern': 'Change', 'Öffnen': 'Open', 'öffnen': 'open',
    'wählen': 'select', 'Erneut versuchen': 'Try again', 'Das hat nicht geklappt.': 'Something went wrong.',
    'Nicht angemeldet': 'Not signed in', 'Angemeldet': 'Signed in', 'Hinzufügen': 'Add', 'Merken': 'Save',
    'Anwenden': 'Apply', 'Zurücksetzen': 'Reset', 'entfernen': 'remove', 'Gespeichert': 'Saved',
    'Übernommen': 'Done', 'Erledigt': 'Done', 'Fehler': 'Error',

    // Anmeldung
    'Mit deinem Paperless-Konto anmelden': 'Sign in with your Paperless account', 'Paperless-Adresse': 'Paperless address',
    'Benutzername': 'Username', 'Passwort': 'Password', 'Angemeldet bleiben': 'Stay signed in', 'Anmelden': 'Sign in',
    'Benutzername oder Passwort falsch.': 'Wrong username or password.',
    'Paperless ist gerade nicht erreichbar.': 'Paperless is not reachable right now.',
    'Bitte die Adresse deiner Paperless-Instanz angeben.': 'Please enter the address of your Paperless instance.',
    'Das ist keine gültige Adresse.': 'That is not a valid address.',
    'Diese App läuft über HTTPS und darf deshalb keine HTTP-Adresse ansprechen. Bitte die HTTPS-Adresse deiner Paperless-Instanz verwenden.':
      'This app runs on HTTPS and therefore cannot connect to an HTTP address. Please use the HTTPS address of your Paperless instance.',
    'Keine Verbindung zu': 'Could not connect to',
    '. Stimmt die Adresse? Dann muss deine Paperless-Instanz diese App noch zulassen:': '. Is the address correct? Then your Paperless instance still has to allow this app:',
    'Dein Browser verbindet sich direkt mit deiner Paperless-Instanz. Zugangsdaten und Dokumente gehen nur dorthin – diese Seite speichert nichts.':
      'Your browser connects directly to your Paperless instance. Your login and documents only go there – this page stores nothing.',

    // Übersicht
    'Neu diesen Monat': 'New this month', 'Im Posteingang': 'In inbox', 'Jetzt sortieren': 'Sort now',
    'Vorschläge prüfen und mit einem Klick übernehmen.': 'Review suggestions and accept them with one click.',
    'Alle Tags': 'All tags', 'Zuletzt angesehen': 'Recently viewed', 'Korrespondenten': 'Correspondents',
    'Zuletzt hinzugefügt': 'Recently added', 'Alle anzeigen': 'Show all', 'Keine Dokumente.': 'No documents.',
    'Volltextsuche nach': 'Search full text for',

    // Browser
    'Tag': 'Tag', 'Korrespondent': 'Correspondent', 'Dokumenttyp': 'Document type', 'Ablage': 'Storage path',
    'Archiv': 'Archive', 'Gefiltert': 'Filtered', 'Volltext': 'Full text', 'Dokument': 'Document',
    'Auf die Merkliste': 'Add to favourites', 'Mehrere auswählen': 'Select multiple',
    'In dieser Liste suchen': 'Search this list', 'In dieser Liste suchen …': 'Search this list …',
    'Volltext: Titel, Inhalt, Korrespondent …': 'Full text: title, content, correspondent …',
    'Suche leeren': 'Clear search', 'Sortierung': 'Sort', 'Ansicht': 'View', 'Filter': 'Filter',
    'Relevanz': 'Relevance', 'Neueste zuerst': 'Newest first', 'Älteste zuerst': 'Oldest first',
    'Titel A–Z': 'Title A–Z', 'Titel Z–A': 'Title Z–A', 'Korrespondent A–Z': 'Correspondent A–Z',
    'Zuletzt geändert': 'Recently modified', 'Liste': 'List', 'Kacheln': 'Tiles', 'Zeitleiste': 'Timeline', 'Tabelle': 'Table',
    'Alle Filter entfernen': 'Remove all filters', 'Filter entfernen': 'Remove filters', 'Nichts gefunden': 'Nothing found',
    'Nichts gefunden.': 'Nothing found.', 'Versuch es mit weniger Filtern oder einem anderen Suchbegriff.': 'Try fewer filters or a different search term.',
    'Hier liegen noch keine Dokumente.': 'There are no documents here yet.', 'Laden fehlgeschlagen': 'Loading failed',
    'Weitere laden': 'Load more', 'Titel': 'Title', 'Typ': 'Type', 'Datum': 'Date', 'Tags': 'Tags', 'Hinzugefügt': 'Added',
    'Durchsucht Titel und den erkannten Text aller Dokumente. Ergebnisse erscheinen beim Tippen.':
      'Searches the titles and recognised text of all documents. Results appear as you type.',
    'Auswahl': 'Selection', 'Tag +': 'Add tag', 'Tag −': 'Remove tag', 'Von': 'From', 'Laden': 'Download',
    'Tag hinzufügen': 'Add tag', 'Tag entfernen': 'Remove tag', 'Dokumenttyp setzen': 'Set document type',
    'Ohne Typ': 'No type', 'Korrespondent setzen': 'Set correspondent', 'Ohne Korrespondent': 'No correspondent',
    'Dokumenttyp gesetzt': 'Document type set', 'Korrespondent gesetzt': 'Correspondent set', 'ZIP wird erstellt …': 'Creating ZIP …',
    'Dokumente löschen?': 'Delete documents?', 'Suchen': 'Search', 'Suchen …': 'Search …',
    'Tags (alle müssen passen)': 'Tags (all must match)', 'Jahr': 'Year', 'Nur Dokumente im Posteingang': 'Only documents in the inbox',
    'Nur Posteingang': 'Inbox only', 'Tag suchen …': 'Search tags …', 'Tags filtern': 'Filter tags', 'Ohne Datum': 'No date',
    'Erscheint auf der Übersicht und in der Seitenleiste – mit allen Filtern, Sortierung und Ansicht.':
      'Appears on the overview and in the sidebar – with all filters, sorting and view.',
    'Name': 'Name', 'Auf der Merkliste': 'Added to favourites', 'Von der Merkliste entfernt': 'Removed from favourites',

    // Dokument
    'Vorschau': 'Preview', 'Details': 'Details', 'Original öffnen': 'Open original', 'Herunterladen': 'Download',
    'Link kopieren': 'Copy link', 'Link kopiert': 'Link copied', 'Vorheriges Dokument': 'Previous document', 'Nächstes Dokument': 'Next document',
    'Keine Vorschau verfügbar.': 'No preview available.', 'Ganzes Dokument öffnen': 'Open full document',
    'Seiten': 'Pages', 'ASN': 'ASN', 'Archivnummer (ASN)': 'Archive serial number (ASN)',
    'Dieses Dokument ist noch nicht bestätigt.': 'This document has not been confirmed yet.', 'Als erledigt markieren': 'Mark as done',
    'Notizen': 'Notes', 'Neue Notiz': 'New note', 'Notiz hinzufügen': 'Add a note', 'Notiz speichern': 'Save note',
    'Notiz gespeichert': 'Note saved', 'Notiz konnte nicht gespeichert werden': 'Note could not be saved',
    'Ähnliche Dokumente': 'Similar documents', 'Dokument löschen?': 'Delete document?', 'In den Papierkorb verschoben': 'Moved to trash',
    'Löschen fehlgeschlagen': 'Delete failed', 'Tags gespeichert': 'Tags saved', 'Speichern fehlgeschlagen': 'Saving failed',
    'Öffnen fehlgeschlagen': 'Could not open',

    // Posteingang
    'Vorschlag – bitte prüfen': 'Suggestion – please review', 'Übernehmen': 'Accept', 'Später': 'Later', 'Als Liste': 'As list',
    'Datumsvorschläge': 'Date suggestions', 'Tags – ✦ = vorgeschlagen': 'Tags – ✦ = suggested',
    'Alles erledigt': 'All done', 'Für jetzt erledigt': 'Done for now', 'Keine neuen Dokumente.': 'No new documents.',
    'Übersprungene ansehen': 'Review skipped', 'Zur Übersicht': 'Go to overview',

    // Durchstöbern
    'Typen': 'Types', 'Ablagen': 'Storage paths', 'Art': 'Kind', 'Filtern': 'Filter', 'Filtern …': 'Filter …',
    'Nach Anzahl': 'By count', 'Nach Name': 'By name',

    // Einstellungen
    'Darstellung': 'Appearance', 'Design': 'Theme', 'Hell': 'Light', 'Dunkel': 'Dark', 'Automatisch': 'Automatic',
    'Sprache': 'Language', 'Standardansicht': 'Default view', 'Standardansicht für Listen': 'Default view for lists',
    'Bereiche auf der Übersicht': 'Areas on the overview', 'Standard wiederherstellen': 'Restore default',
    'Standard wiederhergestellt': 'Default restored',
    'Einschalten, was als Kachel auf der Übersicht und in der Seitenleiste erscheint. Farbpunkt antippen, um die Farbe zu wechseln.':
      'Turn on what appears as a tile on the overview and in the sidebar. Tap the colour dot to change the colour.',
    'Tastenkürzel': 'Keyboard shortcuts', 'Schnellsuche (auch Strg+K)': 'Quick search (also Ctrl+K)', 'Suchfeld der Seite': 'Search field of the page',
    'Vorheriges / nächstes Dokument': 'Previous / next document', 'Dokument bearbeiten': 'Edit document', 'Filter öffnen': 'Open filters',
    'Im Posteingang überspringen': 'Skip in inbox', 'Zurück / Auswahl beenden': 'Back / end selection', 'Diese Übersicht': 'This overview',
    'Posteingang: später': 'Inbox: later', 'Konto': 'Account',

    // Hochladen
    'Neues Dokument': 'New document', 'Dateien hierher ziehen': 'Drop files here', 'Foto aufnehmen': 'Take photo', 'Dateien wählen': 'Choose files',
    'PDF, Bilder oder Office-Dokumente – Paperless erkennt den Text automatisch und legt sie in den Posteingang.':
      'PDFs, images or office documents – Paperless recognises the text automatically and puts them in the inbox.',
    'Wird hochgeladen …': 'Uploading …', 'Wird verarbeitet …': 'Processing …', 'Hochladen fehlgeschlagen': 'Upload failed',
    'Fertig – ansehen': 'Done – view', 'Schon vorhanden (Duplikat)': 'Already exists (duplicate)', 'Verarbeitung fehlgeschlagen': 'Processing failed',
    'Läuft noch – später im Posteingang nachsehen': 'Still running – check the inbox later',

    // Schnellsuche
    'Dokument, Tag, Korrespondent, Befehl …': 'Document, tag, correspondent, command …', 'Befehle': 'Commands',
    'Hell/Dunkel umschalten': 'Toggle light/dark'
  };

  const docs = (n) => (+n === 1 ? '1 document' : `${n} documents`);
  const RX = [
    [/^(\d+) Dokumente?$/, (m, n) => docs(n)],
    [/^(\d+) Dokumente? (?:wird|werden) in den Papierkorb von Paperless verschoben\.$/, (m, n) => `${docs(n)} will be moved to the Paperless trash.`],
    [/^„(.*)“ wird in den Papierkorb von Paperless verschoben\.$/, (m, t) => `“${t}” will be moved to the Paperless trash.`],
    [/^(\d+) Dokumente? gelöscht$/, (m, n) => `${docs(n)} deleted`],
    [/^(\d+) ausgewählt$/, (m, n) => `${n} selected`],
    [/^(\d+) von (\d+)$/, (m, a, b) => `${a} of ${b}`],
    [/^(\d+) \/ (\d+)$/, (m) => m],
    [/^Guten Morgen(.*)$/, (m, r) => `Good morning${r}`],
    [/^Guten Tag(.*)$/, (m, r) => `Good afternoon${r}`],
    [/^Guten Abend(.*)$/, (m, r) => `Good evening${r}`],
    [/^Volltextsuche in (\d+) Dokumenten$/, (m, n) => `Search the full text of ${docs(n)}`],
    [/^(\d+) neues? Dokumente? im Posteingang$/, (m, n) => (+n === 1 ? '1 new document in the inbox' : `${n} new documents in the inbox`)],
    [/^Tag „(.*)“ zu (\d+) Dokumenten hinzugefügt$/, (m, t, n) => `Added tag “${t}” to ${docs(n)}`],
    [/^Tag „(.*)“ entfernt$/, (m, t) => `Removed tag “${t}”`],
    [/^Volltextsuche nach „(.*)“$/, (m, q) => `Full-text search for “${q}”`],
    [/^Noch (\d+) Dokumente? übersprungen\.$/, (m, n) => `${docs(n)} still skipped.`],
    [/^Angemeldet als (.*)$/, (m, r) => `Signed in as ${r.replace(' bei ', ' at ')}`],
    [/^Jahr (\d{4})$/, (m, y) => `Year ${y}`],
    [/^Von: (.*)$/, (m, r) => `From: ${r}`],
    [/^Typ: (.*)$/, (m, r) => `Type: ${r}`],
    [/^Ablage: (.*)$/, (m, r) => `Storage path: ${r}`],
    [/^Farbe für (.*) wechseln$/, (m, r) => `Change colour for ${r}`],
    [/^Vorschau von (.*)$/, (m, r) => `Preview of ${r}`],
    [/^(.*) anzeigen$/, (m, r) => `Show ${r}`],
    [/^Aktion fehlgeschlagen: (.*)$/, (m, r) => `Action failed: ${r}`],
    [/^Speichern fehlgeschlagen: (.*)$/, (m, r) => `Saving failed: ${r}`],
    [/^Anmeldung fehlgeschlagen \((\d+)\)\.$/, (m, n) => `Sign-in failed (${n}).`],
    [/^Fehler (\d+)(.*)$/, (m, n, r) => `Error ${n}${r}`],
    [/^(\d+)\s+Dokumente$/, (m, n) => docs(n)],
    [/^(.+) ([↑↓])$/, (m, t, a) => `${tr(t)} ${a}`]
  ];

  function tr(str) {
    if (lang === 'de' || str == null) return str;
    const k = String(str).trim();
    if (!k) return str;
    let v = Object.prototype.hasOwnProperty.call(EN, k) ? EN[k] : undefined;
    if (v === undefined) {
      for (const [re, f] of RX) { const m = k.match(re); if (m) { v = f(...m); break; } }
    }
    return v === undefined || v === k ? str : String(str).replace(k, v);
  }

  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  function translateNode(node) {
    if (node.nodeType === 3) {
      const p = node.parentNode;
      if (!p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName)) return;
      const t = tr(node.nodeValue);
      if (t !== node.nodeValue) node.nodeValue = t;
      return;
    }
    if (node.nodeType !== 1) return;
    ATTRS.forEach((a) => {
      if (node.hasAttribute(a)) { const v = node.getAttribute(a); const t = tr(v); if (t !== v) node.setAttribute(a, t); }
    });
    const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n = w.nextNode();
    while (n) { if (n.nodeType === 3) translateNode(n); else ATTRS.forEach((a) => { if (n.hasAttribute(a)) { const v = n.getAttribute(a); const t = tr(v); if (t !== v) n.setAttribute(a, t); } }); n = w.nextNode(); }
  }

  if (lang !== 'de') {
    const mo = new MutationObserver((list) => {
      list.forEach((m) => {
        if (m.type === 'childList') m.addedNodes.forEach(translateNode);
        else if (m.type === 'characterData') translateNode(m.target);
        else if (m.type === 'attributes') {
          const v = m.target.getAttribute(m.attributeName);
          const t = tr(v);
          if (t !== v) m.target.setAttribute(m.attributeName, t);
        }
      });
    });
    const start = () => { translateNode(document.body); mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS }); };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }

  window.DOCS_I18N = { lang, locale, pref, t: tr };
})();

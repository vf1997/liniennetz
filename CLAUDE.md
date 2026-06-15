# Anweisungen für Claude Code

Du hilfst einer Person bei der Stadt.Land.Netz GmbH, beim **Hackathon** eine eigene
kleine Web-App zu bauen. Die Person ist möglicherweise **keine Entwicklerin / kein
Entwickler**. Verhalte dich entsprechend.

## Wichtigste Regel: Sprich verständlich

- Erkläre auf Deutsch, in einfachen Worten, ohne unnötigen Fachjargon.
- Wenn du einen Fachbegriff benutzt, erklär ihn kurz in einem Halbsatz.
- Geh davon aus, dass die Person Code nicht selbst liest. **Beschreibe, was du tust und warum**, in normalen Sätzen.
- Frag nach, wenn eine Idee unklar ist — aber überfrachte nicht mit Rückfragen. Eine Frage pro Schritt reicht.
- Triff vernünftige Standard-Entscheidungen selbst, statt die Person mit technischen Optionen zu überfordern.

## Der Tech-Stack (nicht wechseln)

Dieses Projekt benutzt einen festen, bewusst einfach gehaltenen Stack. **Bleib dabei**,
auch wenn die Person etwas anderes erwähnt — schlag keinen Technologiewechsel vor:

- **SvelteKit** (Svelte 5, mit der neuen `$props()`/`$state()`/`$derived()` Runes-Syntax) — Framework für die Web-App
- **Drizzle ORM** — für den Datenbank-Zugriff
- **SQLite** über `@libsql/client` — die Datenbank ist eine lokale Datei (`local.db`)
- **Plain CSS** in `<style>`-Blöcken der Svelte-Komponenten — kein Tailwind, keine UI-Bibliothek installieren

Installiere keine zusätzlichen großen Frameworks (kein React, kein Tailwind, kein
Prisma, keine Auth-Bibliothek), außer die Person bittet ausdrücklich und mehrfach darum.
Halte die Anzahl der Abhängigkeiten klein.

## Wie die Datenbank funktioniert (wichtig!)

- Die Datenbank ist **eine Datei** namens `local.db` im Projektordner. Es gibt **keinen
  Datenbank-Server**. Die Person braucht keinen Account, kein Internet, keine Zugangsdaten.
- Tabellen werden in `src/lib/server/db/schema.js` definiert.
- **Nach jeder Änderung am Schema** musst du `npm run db:push` ausführen, damit die
  echte Datenbank-Datei angepasst wird. Sag der Person kurz Bescheid, dass du das tust.
- `npm run db:push` ist für diesen Hackathon sicher und zerstörungsfrei genug. Wenn
  Drizzle bei einer Änderung warnt, dass Daten verloren gehen könnten: Es sind Test-Daten,
  das ist okay — erkläre es kurz und fahr fort.
- Datenbank-Zugriffe (lesen/schreiben) passieren **nur auf dem Server**: in Dateien, die
  auf `.server.js` enden (z. B. `+page.server.js`), oder in `src/lib/server/`.
  Niemals direkt im `<script>`-Block einer `.svelte`-Seite auf die DB zugreifen.

## Architektur-Muster (an diesem Beispiel orientieren)

Die Startseite (`src/routes/+page.svelte` + `src/routes/+page.server.js`) zeigt das
vollständige Muster: Daten in `load()` aus der DB holen, mit `actions` über Formulare
schreiben, mit `use:enhance` ohne Seiten-Neuladen absenden. **Bau neue Funktionen nach
genau diesem Muster.**

- Neue Seiten = neuer Ordner unter `src/routes/` mit `+page.svelte`.
- Daten laden = `load()` in einer `+page.server.js`.
- Daten speichern/ändern = `actions` in einer `+page.server.js`, per `<form method="POST">`.
- Gemeinsame Server-Logik = Datei unter `src/lib/server/`.

## Qualität & Sicherheit

- Schreib Code, der **läuft**. Nach größeren Änderungen kurz gegenchecken, dass der
  Dev-Server (`npm run dev`) ohne Fehler startet und die Seite lädt.
- Validiere Formular-Eingaben minimal (z. B. leere Werte abfangen), aber bau keine
  aufwändige Fehlerbehandlung — es ist ein Prototyp.
- Wenn etwas kaputtgeht, erklär ruhig, was passiert ist, und reparier es. Kein Drama.
- Lösche keine Dateien außerhalb dieses Projektordners. Führe keine Befehle aus, die
  über das Projekt hinausgreifen (kein `sudo`, keine globalen Installationen, keine
  Änderungen an Systemeinstellungen).

## Was dieses Projekt NICHT braucht

Damit du niemanden mit Komplexität überforderst, ausdrücklich **nicht** nötig und
**nicht** vorschlagen:

- Kein Login / keine Benutzerverwaltung (außer ausdrücklich gewünscht)
- Kein Deployment, kein Hosting, kein Docker
- Kein Git-Workflow, keine Branches, kein GitHub (die Arbeit bleibt lokal)
- Keine Tests-Suite, kein CI
- Kein externer Datenbank-Server, keine Cloud-DB

## Ziel des Tages

Die Person soll am Ende **eine eigene, laufende Web-App** haben, auf die sie stolz ist,
und das gute Gefühl: „So einfach kann das sein." Optimiere für schnelle, sichtbare
Ergebnisse und Erfolgserlebnisse — nicht für technische Perfektion.

# 🚀 Hackathon-Anleitung — von Null zur eigenen App

Willkommen! Am Ende dieser Anleitung läuft auf deinem Mac eine eigene Web-App, die du
mit **Claude Code** weiterbaust — egal, wie viel Technik-Erfahrung du hast. Du musst
**keinen Code schreiben**. Du beschreibst Claude in normaler Sprache, was du willst.

Plane für die Einrichtung **ca. 20 Minuten**. Danach geht's ans Bauen.

> **Wichtig:** Alle Schritte sind für **macOS**. Folge ihnen einfach der Reihe nach.
> Wenn etwas klemmt, frag eine Kollegin / einen Kollegen aus dem Dev-Team — dafür sind
> sie heute da.

---

## Schritt 1: Claude Code installieren

1. Geh auf **[claude.com/download](https://claude.com/download)** und lade die
   **Claude-Desktop-App für Mac** herunter.
2. Öffne die heruntergeladene Datei und zieh Claude in deinen **Programme**-Ordner.
3. Starte die App und **melde dich mit deinem Claude-Account an** (die Zugangsdaten hast
   du vom Orga-Team bekommen).

Das war's mit der Installation — die App bringt alles Nötige mit.

---

## Schritt 2: Das Projekt entpacken

1. Du hast eine Datei namens **`hackathon-template.zip`** bekommen (per Link oder USB-Stick).
2. Lege auf dem Schreibtisch einen Ordner für dich an, z. B. **`Hackathon`**.
3. Zieh die ZIP-Datei in diesen Ordner und **doppelklick** sie — sie entpackt sich zu
   einem Ordner namens `hackathon-template`.
4. **Benenne den Ordner um** in deinen Vornamen, z. B. `lisa` oder `tom`. So weißt du
   immer, dass es *dein* Projekt ist. (Mehr ist nicht nötig — dein Projekt liegt nur auf
   deinem Rechner und kann niemand anderem etwas kaputtmachen.)

---

## Schritt 3: Das Projekt in Claude Code öffnen

1. Öffne die **Claude-Desktop-App**.
2. Wähle **„Open Project"** (oder „Ordner öffnen") und navigiere zu deinem Ordner
   (z. B. `Schreibtisch → Hackathon → lisa`).
3. Claude sieht jetzt dein Projekt. In der Datei `CLAUDE.md` stehen bereits alle Regeln,
   damit Claude weiß, wie es dir helfen soll — darum musst du dich nicht kümmern.

---

## Schritt 4: App das erste Mal starten

Jetzt bringen wir die App zum Laufen. **Du musst dafür nichts selbst tippen** — gib
Claude einfach diese Nachricht (kopier sie 1:1):

> **„Bitte richte das Projekt ein und starte die App. Mache `npm install`, dann
> `npm run db:push`, dann `npm run db:seed`, und starte danach den Entwicklungsserver
> mit `npm run dev`. Sag mir, welche Adresse ich im Browser öffnen soll."**

Claude erledigt das und nennt dir am Ende eine Adresse wie **`http://localhost:5173`**.

4. Öffne diese Adresse in deinem Browser (Safari oder Chrome).
5. 🎉 Du solltest eine Seite **„Es funktioniert."** mit einer kleinen Aufgabenliste sehen.
   Trag oben etwas ein und lade die Seite neu — es bleibt gespeichert. Das ist deine
   eigene Datenbank, die gerade arbeitet.

**Glückwunsch — ab hier baust du dein eigenes Ding.**

---

## Schritt 5: Deine eigene Idee bauen

Erzähl Claude einfach, was du bauen willst. Sprich in ganzen Sätzen, so wie du es einer
Person erklären würdest. Beispiele:

> „Ich möchte eine Seite, auf der ich Fahrten erfassen kann: mit Datum, Fahrer und Ziel.
> Sie sollen in der Datenbank gespeichert werden und ich will sie als Liste sehen."

> „Bau mir einen kleinen Stundenrechner: Ich gebe Start- und Endzeit ein, und er rechnet
> die Dauer aus."

> „Mach mir eine Pinnwand, auf der ich Notizen anheften und wieder löschen kann."

**Tipps für gute Ergebnisse:**

- **Klein anfangen.** Erst eine Funktion zum Laufen bringen, dann die nächste. Nicht alles
  auf einmal verlangen.
- **Etwas ansehen, dann anpassen.** Lass dir die Seite im Browser anzeigen und sag dann:
  „Mach die Überschrift größer" oder „Die Liste soll nach Datum sortiert sein."
- **Bei Fehlern einfach Bescheid sagen.** Wenn etwas nicht klappt, schreib Claude:
  „Auf der Seite steht ein Fehler: [Text einfügen]. Kannst du das reparieren?"
- **Du kannst nichts dauerhaft kaputtmachen.** Es ist nur dein lokaler Ordner. Im
  Notfall: ZIP nochmal neu entpacken und von vorn.

---

## Häufige Fragen

**Muss ich den Server immer neu starten?**
Nein. Solange `npm run dev` läuft, siehst du Änderungen sofort im Browser (Seite ggf.
neu laden). Wenn du den Server aus Versehen beendet hast, sag Claude einfach
„Starte die App nochmal."

**Wo sind meine Daten?**
In einer Datei `local.db` in deinem Ordner. Nur auf deinem Rechner. Niemand sonst sieht sie.

**Ich habe die Datenbank durcheinandergebracht — was tun?**
Sag Claude: „Lösche die Datenbank-Datei und richte sie neu ein." Dann ist sie wieder leer
und sauber.

**Wie zeige ich am Ende mein Ergebnis?**
Deine App läuft im Browser auf deinem Bildschirm — perfekt zum Vorführen per Beamer oder
Bildschirmteilen. Du musst nichts „hochladen" oder „deployen".

---

## Spickzettel: die wichtigsten Befehle

Du musst die nicht auswendig können — Claude führt sie für dich aus. Nur zur Orientierung:

| Was es tut | Befehl |
|---|---|
| App starten | `npm run dev` |
| Datenbank an Schema anpassen | `npm run db:push` |
| Beispieldaten einfügen | `npm run db:seed` |
| Datenbank im Browser ansehen | `npm run db:studio` |

Viel Spaß — und trau dich, Claude einfach loszuschicken. 🛠️

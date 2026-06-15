/**
 * Gibt die aktuell eingeloggte Person an ALLE Seiten weiter,
 * damit z. B. die Kopfzeile überall den Namen und Avatar zeigen kann.
 */
export function load({ locals }) {
	return { user: locals.user };
}

/** Read-only projection of the existing professional log, within accessible dossiers. */
export function recenteProGebeurtenissen(log, dossierIds) {
    return log.filter((l) => dossierIds.includes(l.dossier)).sort((a, b) => b.moment.localeCompare(a.moment)).slice(0, 3);
}

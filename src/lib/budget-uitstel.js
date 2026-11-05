export function uitstelMoment(keuze, nu = new Date()) {
    const moment = new Date(nu);
    moment.setHours(20, 0, 0, 0);
    if (keuze === "morgen")
        moment.setDate(moment.getDate() + 1);
    if (keuze === "drie-dagen")
        moment.setDate(moment.getDate() + 3);
    return moment > nu ? moment.toISOString() : undefined;
}
export function geldigUitstelMoment(moment, nu = new Date()) {
    return Number.isFinite(new Date(moment).getTime()) && new Date(moment) > nu;
}
export function toonUitstelMoment(moment) {
    return new Date(moment).toLocaleString("nl-NL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) + " uur";
}

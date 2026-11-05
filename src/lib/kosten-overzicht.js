/** Alleen presentatie: dezelfde bronitems, maximaal drie tot de ouder de rest opent. */
export function zichtbareKostenActies(items, alles = false) {
    return alles ? items : items.slice(0, 3);
}

// Onthoudt dat de gebruiker vanuit het overzicht op Home kwam, zodat één tik terugbrengt.
let vanOverzicht = false;
let heropen = false;
export const markeerVanOverzicht = () => { vanOverzicht = true; };
export const isVanOverzicht = () => vanOverzicht;
export const wisTerug = () => { vanOverzicht = false; };
export const vraagHeropen = () => { vanOverzicht = false; heropen = true; };
export function neemHeropen() { const h = heropen; heropen = false; return h; }

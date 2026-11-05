/**
 * App vergrendelen via de beveiliging van het apparaat (WebAuthn platform-authenticator:
 * Face ID, Touch ID, vingerafdruk of pincode). Het besturingssysteem doet de controle;
 * de app bewaart alleen de credential-id, nooit biometrische gegevens.
 */
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const vanB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const willekeurig = () => crypto.getRandomValues(new Uint8Array(32));
export async function apparaatOndersteunt() {
    if (typeof window === "undefined" || !window.PublicKeyCredential)
        return false;
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    catch {
        return false;
    }
}
export async function registreerSlot() {
    const cred = (await navigator.credentials.create({
        publicKey: {
            challenge: willekeurig(),
            rp: { name: "Ouderschap & Co", id: location.hostname },
            user: { id: willekeurig(), name: "app-slot", displayName: "Ouderschap & Co vergrendeling" },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
            authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
            timeout: 60000,
        },
    }));
    if (!cred)
        throw new Error("Geen bevestiging ontvangen.");
    return b64(cred.rawId);
}
export async function ontgrendel(id) {
    try {
        const r = await navigator.credentials.get({
            publicKey: {
                challenge: willekeurig(),
                allowCredentials: [{ type: "public-key", id: vanB64(id) }],
                userVerification: "required",
                timeout: 60000,
            },
        });
        return !!r;
    }
    catch {
        return false;
    }
}

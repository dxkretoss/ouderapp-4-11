import { useTranslation } from "react-i18next";
import { QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, useRouterState, HeadContent, Scripts, } from "@tanstack/react-router";
import { useEffect } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { themaScript } from "../lib/voorkeuren-store";
import { AppSlot } from "../components/AppSlot";
import { Toaster } from "../components/ui/sonner";
import { SpoedScherm } from "../components/SpoedScherm";
function NotFoundComponent() {
    const { t } = useTranslation();
    return (<div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-extrabold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("notFoundPage.title", "Pagina niet gevonden")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Deze pagina bestaat niet of is verplaatst.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Naar home
          </Link>
        </div>
      </div>
    </div>);
}
function ErrorComponent({ error, reset }) {
    console.error(error);
    const router = useRouter();
    useEffect(() => {
        reportLovableError(error, { boundary: "tanstack_root_error_component" });
    }, [error]);
    return (<div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Deze pagina laadde niet
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Er ging iets mis. Probeer het opnieuw of ga terug naar home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => {
            router.invalidate();
            reset();
        }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Opnieuw proberen
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            Naar home
          </a>
        </div>
      </div>
    </div>);
}
export const Route = createRootRouteWithContext()({
    head: () => ({
        meta: [
            { charSet: "utf-8" },
            { name: "viewport", content: "width=device-width, initial-scale=1" },
            { title: "Ouderschap & Co — De app die ouders verbindt" },
            {
                name: "description",
                content: "Alles rondom co-ouderschap op één rustige plek: agenda, verdeling van de week, berichten, kosten en documenten.",
            },
            { property: "og:title", content: "Ouderschap & Co — De app die ouders verbindt" },
            {
                property: "og:description",
                content: "Alles rondom co-ouderschap op één rustige plek: agenda, verdeling van de week, berichten, kosten en documenten.",
            },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary_large_image" },
        ],
        links: [
            { rel: "stylesheet", href: appCss },
            { rel: "preconnect", href: "https://fonts.googleapis.com" },
            { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
            {
                rel: "stylesheet",
                href: "https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700&family=Nunito:wght@600;700;800&display=swap",
            },
            { rel: "icon", href: "/favicon.png", type: "image/png" },
        ],
    }),
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
});
function RootShell({ children }) {
    return <>{children}</>;
}
function RootComponent() {
    const { queryClient } = Route.useRouteContext();
    const hash = useRouterState({ select: (s) => s.location.hash });
    // Vanuit zoeken: het gevonden item in beeld brengen en kort laten oplichten.
    useEffect(() => {
        if (!hash || !hash.startsWith("item-"))
            return;
        let poging = 0;
        let t = 0;
        const zoek = () => {
            const el = document.getElementById(hash);
            if (!el) {
                if (poging++ < 20)
                    t = window.setTimeout(zoek, 100);
                return;
            }
            el.scrollIntoView({ block: "center" });
            el.classList.add("zoekdoel-aan");
            window.setTimeout(() => el.classList.remove("zoekdoel-aan"), 2500);
        };
        t = window.setTimeout(zoek, 100);
        return () => window.clearTimeout(t);
    }, [hash]);
    return (<QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <AppSlot />
      <SpoedScherm />
      <Toaster position="top-center"/>
    </QueryClientProvider>);
}

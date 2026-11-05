import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AppSlot } from "@/components/AppSlot";
import { SpoedScherm } from "@/components/SpoedScherm";

// Import all route components cleanly
import { Route as RootRoute } from "./routes/__root";
import { Route as IndexRoute } from "./routes/index";
import { Route as WelkomRoute } from "./routes/welkom";
import { Route as AgendaRoute } from "./routes/agenda";
import { Route as BerichtenRoute } from "./routes/berichten";
import { Route as KostenRoute } from "./routes/kosten";
import { Route as MeerRoute } from "./routes/meer";
import { Route as AbonnementRoute } from "./routes/abonnement";
import { Route as ActiviteitenRoute } from "./routes/activiteiten";
import { Route as AfsprakenVeiligheidRoute } from "./routes/afspraken-veiligheid";
import { Route as AfsprakenRoute } from "./routes/afspraken";
import { Route as BegeleiderGesprekRoute } from "./routes/begeleider-gesprek";
import { Route as BeslissingenRoute } from "./routes/beslissingen";
import { Route as BoodschappenRoute } from "./routes/boodschappen";
import { Route as ContactRoute } from "./routes/contact";
import { Route as DocumentenRoute } from "./routes/documenten";
import { Route as ExporterenRoute } from "./routes/exporteren";
import { Route as ExtraOndersteuningRoute } from "./routes/extra-ondersteuning";
import { Route as GesprekkenRoute } from "./routes/gesprekken";
import { Route as GezagRoute } from "./routes/gezag";
import { Route as HalenBrengenRoute } from "./routes/halen-brengen";
import { Route as InstellingenRoute } from "./routes/instellingen";
import { Route as JuridischRoute } from "./routes/juridisch";
import { Route as JuridischeHulpRoute } from "./routes/juridische-hulp";
import { Route as KinderenIndexRoute } from "./routes/kinderen.index";
import { Route as KinderenKindIdRoute } from "./routes/kinderen.$kindId";
import { Route as KringKindIdRoute } from "./routes/kring.$kindId";
import { Route as MomentjesRoute } from "./routes/momentjes";
import { Route as OndersteuningRoute } from "./routes/ondersteuning";
import { Route as OverdrachtRoute } from "./routes/overdracht";
import { Route as PlanningRoute } from "./routes/planning";
import { Route as PrivacyRoute } from "./routes/privacy";
import { Route as ProfessionalsRoute } from "./routes/professionals";
import { Route as RondleidingRoute } from "./routes/rondleiding";
import { Route as SamenRegelenRoute } from "./routes/samen-regelen";
import { Route as SoloRoute } from "./routes/solo";
import { Route as SpullenRoute } from "./routes/spullen";
import { Route as TakenRoute } from "./routes/taken";
import { Route as TijdlijnRoute } from "./routes/tijdlijn";
import { Route as UitnodigingRoute } from "./routes/uitnodiging";
import { Route as VakantieIdRoute } from "./routes/vakantie.$id";
import { Route as VeranderdRoute } from "./routes/veranderd";
import { Route as VerhaalRoute } from "./routes/verhaal";
import { Route as VerzorgerRoute } from "./routes/verzorger";
import { Route as WisselRoute } from "./routes/wissel";
import { Route as ZorgregelingRoute } from "./routes/zorgregeling";

const queryClient = new QueryClient();
window.__queryClient = queryClient;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppSlot />
        <SpoedScherm />
        <Toaster position="top-center" />
        <Routes>
          <Route path="/" element={<IndexRoute.component />} />
          <Route path="/welkom" element={<WelkomRoute.component />} />
          <Route path="/agenda" element={<AgendaRoute.component />} />
          <Route path="/berichten" element={<BerichtenRoute.component />} />
          <Route path="/kosten" element={<KostenRoute.component />} />
          <Route path="/meer" element={<MeerRoute.component />} />
          <Route path="/abonnement" element={<AbonnementRoute.component />} />
          <Route path="/activiteiten" element={<ActiviteitenRoute.component />} />
          <Route path="/afspraken-veiligheid" element={<AfsprakenVeiligheidRoute.component />} />
          <Route path="/afspraken" element={<AfsprakenRoute.component />} />
          <Route path="/begeleider-gesprek" element={<BegeleiderGesprekRoute.component />} />
          <Route path="/beslissingen" element={<BeslissingenRoute.component />} />
          <Route path="/boodschappen" element={<BoodschappenRoute.component />} />
          <Route path="/contact" element={<ContactRoute.component />} />
          <Route path="/documenten" element={<DocumentenRoute.component />} />
          <Route path="/exporteren" element={<ExporterenRoute.component />} />
          <Route path="/extra-ondersteuning" element={<ExtraOndersteuningRoute.component />} />
          <Route path="/gesprekken" element={<GesprekkenRoute.component />} />
          <Route path="/gezag" element={<GezagRoute.component />} />
          <Route path="/halen-brengen" element={<HalenBrengenRoute.component />} />
          <Route path="/instellingen" element={<InstellingenRoute.component />} />
          <Route path="/juridisch" element={<JuridischRoute.component />} />
          <Route path="/juridische-hulp" element={<JuridischeHulpRoute.component />} />
          <Route path="/kinderen" element={<KinderenIndexRoute.component />} />
          <Route path="/kinderen/:kindId" element={<KinderenKindIdRoute.component />} />
          <Route path="/kring/:kindId" element={<KringKindIdRoute.component />} />
          <Route path="/momentjes" element={<MomentjesRoute.component />} />
          <Route path="/ondersteuning" element={<OndersteuningRoute.component />} />
          <Route path="/overdracht" element={<OverdrachtRoute.component />} />
          <Route path="/planning" element={<PlanningRoute.component />} />
          <Route path="/privacy" element={<PrivacyRoute.component />} />
          <Route path="/professionals" element={<ProfessionalsRoute.component />} />
          <Route path="/rondleiding" element={<RondleidingRoute.component />} />
          <Route path="/samen-regelen" element={<SamenRegelenRoute.component />} />
          <Route path="/solo" element={<SoloRoute.component />} />
          <Route path="/spullen" element={<SpullenRoute.component />} />
          <Route path="/taken" element={<TakenRoute.component />} />
          <Route path="/tijdlijn" element={<TijdlijnRoute.component />} />
          <Route path="/uitnodiging" element={<UitnodigingRoute.component />} />
          <Route path="/vakantie/:id" element={<VakantieIdRoute.component />} />
          <Route path="/veranderd" element={<VeranderdRoute.component />} />
          <Route path="/verhaal" element={<VerhaalRoute.component />} />
          <Route path="/verzorger" element={<VerzorgerRoute.component />} />
          <Route path="/wissel" element={<WisselRoute.component />} />
          <Route path="/zorgregeling" element={<ZorgregelingRoute.component />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

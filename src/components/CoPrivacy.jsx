/** Uitleg zonder toegang te verlenen, gegevens te lezen of AI aan te roepen. */
export function CoPrivacy() {
    return <details className="mt-4 border-y border-border py-2 text-sm">
    <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Co & je privacy</summary>
    <div className="space-y-2 pb-3 text-ink-soft">
      <p>Co gebruikt AI. Wat je aan Co schrijft wordt voor het antwoord naar de AI-dienst gestuurd. Co is geen therapeut of mediator en vervangt geen professionele hulp.</p>
      <p>Gesprekken met Co worden niet automatisch met de andere ouder of een professional gedeeld. Co verstuurt geen ouderbericht, wijzigt geen afspraak en deelt geen overzicht zonder jouw bevestiging.</p>
      <p>In het gesprekvenster blijft je gesprek alleen tijdens die sessie beschikbaar. Bij ‘Even je verhaal kwijt’ kun je zelf kiezen om het op dit apparaat te bewaren en weer te verwijderen.</p>
      <p>De verwerking en bewaartermijnen bij de AI-dienst moeten nog worden gecontroleerd. Gebruik voorlopig alleen fictieve gegevens, geen echte gevoelige gezinsinformatie. Er worden geen Co-gebruiksstatistieken met professionals gedeeld.</p>
    </div>
  </details>;
}

// Built-in default content for the static pages (about / privacy / disclaimer), five languages.
// A non-empty body saved in adminos (Firestore pages/{id}) overrides these defaults.
export const DEFAULT_PAGES = {
  about: {
    title: { en: "About", it: "Chi siamo", es: "Acerca de", fr: "À propos", de: "Über uns" },
    body: {
      en: `Discover the Land of Jesus is a multimedia journey through the Holy Land — more than 200 photographs of the holy places, with explanatory texts, Bible references and guide videos in five languages.

The project was originally created in 1999/2000 and published as a CD-ROM. In 2026 it was restored and rebuilt as a modern web app by CLICK SOLUTIONS (clicksolutionspro.com), with the help of AI.

The photographs were purchased at the time from a Spanish priest who lived at the Church of the Holy Sepulchre in Jerusalem.`,
      it: `Discover the Land of Jesus è un viaggio multimediale in Terra Santa: oltre 200 fotografie dei luoghi santi, con testi esplicativi, riferimenti biblici e video guida in cinque lingue.

Il progetto è nato nel 1999/2000 ed è stato pubblicato come CD-ROM. Nel 2026 è stato restaurato e ricostruito come moderna applicazione web da CLICK SOLUTIONS (clicksolutionspro.com), con l'aiuto dell'intelligenza artificiale.

Le fotografie furono acquistate all'epoca da un sacerdote spagnolo che viveva presso la Basilica del Santo Sepolcro a Gerusalemme.`,
      es: `Discover the Land of Jesus es un viaje multimedia por Tierra Santa: más de 200 fotografías de los lugares santos, con textos explicativos, referencias bíblicas y vídeos guía en cinco idiomas.

El proyecto se creó originalmente en 1999/2000 y se publicó como CD-ROM. En 2026 fue restaurado y reconstruido como aplicación web moderna por CLICK SOLUTIONS (clicksolutionspro.com), con la ayuda de la inteligencia artificial.

Las fotografías fueron compradas en su día a un sacerdote español que vivía en la Basílica del Santo Sepulcro de Jerusalén.`,
      fr: `Discover the Land of Jesus est un voyage multimédia en Terre Sainte : plus de 200 photographies des lieux saints, avec des textes explicatifs, des références bibliques et des vidéos guides en cinq langues.

Le projet a été créé en 1999/2000 et publié sous forme de CD-ROM. En 2026, il a été restauré et reconstruit en application web moderne par CLICK SOLUTIONS (clicksolutionspro.com), avec l'aide de l'intelligence artificielle.

Les photographies avaient été achetées à l'époque à un prêtre espagnol qui vivait à la basilique du Saint-Sépulcre à Jérusalem.`,
      de: `Discover the Land of Jesus ist eine multimediale Reise durch das Heilige Land — über 200 Fotografien der heiligen Stätten, mit erklärenden Texten, Bibelstellen und Video-Führungen in fünf Sprachen.

Das Projekt entstand ursprünglich 1999/2000 und wurde als CD-ROM veröffentlicht. Im Jahr 2026 wurde es von CLICK SOLUTIONS (clicksolutionspro.com) mit Hilfe von KI restauriert und als moderne Web-App neu aufgebaut.

Die Fotografien wurden damals von einem spanischen Priester erworben, der an der Grabeskirche in Jerusalem lebte.`,
    },
  },
  privacy: {
    title: { en: "Privacy Policy", it: "Informativa sulla privacy", es: "Política de privacidad", fr: "Politique de confidentialité", de: "Datenschutzerklärung" },
    body: {
      en: `This site does not collect personal information: there is no registration, no user accounts and no advertising tracking. The content is delivered through Google Firebase, which may process standard technical data (such as IP addresses) strictly to serve the site.

Please note: this project was restored in 2026 from the original 1999/2000 CD-ROM with the help of AI, and mistakes may occur. The photographs were purchased at the time from a Spanish priest who lived at the Church of the Holy Sepulchre in Jerusalem.`,
      it: `Questo sito non raccoglie informazioni personali: non c'è registrazione, non ci sono account utente né tracciamento pubblicitario. I contenuti sono distribuiti tramite Google Firebase, che può trattare dati tecnici standard (come gli indirizzi IP) al solo scopo di erogare il sito.

Nota: questo progetto è stato restaurato nel 2026 dal CD-ROM originale del 1999/2000 con l'aiuto dell'intelligenza artificiale e possono esserci errori. Le fotografie furono acquistate all'epoca da un sacerdote spagnolo che viveva presso la Basilica del Santo Sepolcro a Gerusalemme.`,
      es: `Este sitio no recopila información personal: no hay registro, ni cuentas de usuario, ni seguimiento publicitario. El contenido se sirve a través de Google Firebase, que puede procesar datos técnicos estándar (como direcciones IP) únicamente para servir el sitio.

Ten en cuenta: este proyecto fue restaurado en 2026 a partir del CD-ROM original de 1999/2000 con ayuda de la inteligencia artificial, por lo que puede haber errores. Las fotografías fueron compradas en su día a un sacerdote español que vivía en la Basílica del Santo Sepulcro de Jerusalén.`,
      fr: `Ce site ne collecte aucune information personnelle : pas d'inscription, pas de compte utilisateur, pas de suivi publicitaire. Le contenu est diffusé via Google Firebase, qui peut traiter des données techniques standard (comme les adresses IP) uniquement pour servir le site.

À noter : ce projet a été restauré en 2026 à partir du CD-ROM original de 1999/2000 avec l'aide de l'intelligence artificielle ; des erreurs sont donc possibles. Les photographies avaient été achetées à l'époque à un prêtre espagnol qui vivait à la basilique du Saint-Sépulcre à Jérusalem.`,
      de: `Diese Website sammelt keine personenbezogenen Daten: keine Registrierung, keine Benutzerkonten, kein Werbe-Tracking. Die Inhalte werden über Google Firebase ausgeliefert, das übliche technische Daten (etwa IP-Adressen) ausschließlich zum Betrieb der Website verarbeiten kann.

Bitte beachten: Dieses Projekt wurde 2026 mit Hilfe von KI aus der Original-CD-ROM von 1999/2000 wiederhergestellt — Fehler sind möglich. Die Fotografien wurden damals von einem spanischen Priester erworben, der an der Grabeskirche in Jerusalem lebte.`,
    },
  },
  disclaimer: {
    title: { en: "Disclaimer", it: "Avvertenze", es: "Aviso legal", fr: "Avertissement", de: "Haftungsausschluss" },
    body: {
      en: `The Bible passages shown in this app are taken from public-domain translations that are as close as possible to the commonly accepted text of the New Testament. They are offered to explain and tell the story of each place — not as an official or scholarly edition.

The descriptions of the places reflect tradition and the state of knowledge at the time the project was created (1999/2000). The restoration was done with the help of AI, and inaccuracies may occur.`,
      it: `I brani biblici mostrati in questa app provengono da traduzioni di pubblico dominio, il più possibile vicine al testo comunemente accettato del Nuovo Testamento. Sono proposti per spiegare e raccontare la storia di ogni luogo — non come edizione ufficiale o accademica.

Le descrizioni dei luoghi riflettono la tradizione e le conoscenze dell'epoca in cui il progetto fu creato (1999/2000). Il restauro è stato realizzato con l'aiuto dell'intelligenza artificiale e possono esserci imprecisioni.`,
      es: `Los pasajes bíblicos que se muestran en esta aplicación proceden de traducciones de dominio público, lo más cercanas posible al texto comúnmente aceptado del Nuevo Testamento. Se ofrecen para explicar y contar la historia de cada lugar, no como una edición oficial o académica.

Las descripciones de los lugares reflejan la tradición y el conocimiento de la época en que se creó el proyecto (1999/2000). La restauración se realizó con ayuda de la inteligencia artificial y puede haber imprecisiones.`,
      fr: `Les passages bibliques présentés dans cette application proviennent de traductions du domaine public, aussi proches que possible du texte communément accepté du Nouveau Testament. Ils sont proposés pour expliquer et raconter l'histoire de chaque lieu — non comme une édition officielle ou savante.

Les descriptions des lieux reflètent la tradition et l'état des connaissances à l'époque de la création du projet (1999/2000). La restauration a été réalisée avec l'aide de l'intelligence artificielle ; des imprécisions sont possibles.`,
      de: `Die in dieser App gezeigten Bibelstellen stammen aus gemeinfreien Übersetzungen, die dem allgemein anerkannten Text des Neuen Testaments möglichst nahe kommen. Sie dienen dazu, die Geschichte jedes Ortes zu erklären und zu erzählen — sie sind keine offizielle oder wissenschaftliche Ausgabe.

Die Ortsbeschreibungen geben die Überlieferung und den Wissensstand zur Entstehungszeit des Projekts (1999/2000) wieder. Die Wiederherstellung erfolgte mit Hilfe von KI; Ungenauigkeiten sind möglich.`,
    },
  },
};

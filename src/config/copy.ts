/**
 * COPY — every user-facing Serbian string in the application.
 *
 * HARD RULE: no component may contain a literal Serbian sentence.
 * Components import from here. That is what makes a niche change a
 * config edit instead of a find-and-replace across the codebase.
 *
 * Copy is written for BG Building: a Belgrade developer and general
 * contractor selling units in buildings it puts up itself. The voice is
 * that of the builder, not a broker — "mi gradimo", never "prodavac".
 *
 * Anything still waiting on the client is marked `TODO(BG Building)`
 * rather than filled with a plausible invention. Fabricated company
 * figures and legal text are the two things on a site like this that a
 * visitor can actually check.
 */

import { SITE } from "./site";

export const COPY = {
  /* ---------------------------------------------------------------- */
  /* Global / shared                                                   */
  /* ---------------------------------------------------------------- */
  common: {
    brand: SITE.name,
    skipToContent: "Pređi na sadržaj",
    loading: "Učitavanje…",
    save: "Sačuvaj",
    cancel: "Otkaži",
    close: "Zatvori",
    delete: "Obriši",
    edit: "Izmeni",
    back: "Nazad",
    next: "Sledeća",
    previous: "Prethodna",
    search: "Pretraga",
    yes: "Da",
    no: "Ne",
    required: "obavezno",
    optional: "opciono",
    copy: "Kopiraj",
    copied: "Kopirano",
    seeAll: "Pogledaj sve",
    from: "od",
    to: "do",
  },

  /* ---------------------------------------------------------------- */
  /* Header / footer                                                   */
  /* ---------------------------------------------------------------- */
  nav: {
    menu: "Meni",
    openMenu: "Otvori meni",
    closeMenu: "Zatvori meni",
    login: "Prijava",
    dashboard: "Moj nalog",
    logout: "Odjavi se",
    /** Completes the logo's aria-label: "BG Building — početna". */
    homeAria: "početna",
    searchPlaceholder: "Pretražite ponudu…",
  },

  footer: {
    tagline: SITE.tagline,
    rightsReserved: "Sva prava zadržana.",
    pib: "PIB",
    maticniBroj: "Matični broj",
    builtNote:
      "Prodaja se vodi direktno kod investitora. Podaci o jedinicama važe do promene u ponudi.",
  },

  /* ---------------------------------------------------------------- */
  /* Homepage                                                          */
  /* ---------------------------------------------------------------- */
  home: {
    heroEyebrow: "Investitor i izvođač",
    // Two strings so the second half can carry the signal ink.
    heroTitle: "Stanovi u novogradnji —",
    heroTitleAccent: "direktno od investitora",
    heroSubtitle:
      "Gradimo u Beogradu, od temelja do primopredaje ključeva. Pogledajte šta je trenutno u ponudi i javite se nama — bez agencije i bez provizije.",
    heroSearchLabel: "Pretražite ponudu",
    heroCta: "Pogledaj ponudu",

    // Small tracked label sitting above each large section heading.
    categoriesTag: "Šta gradimo",
    categoriesTitle: "Tipovi nekretnina",
    categoriesSubtitle: "Stanovi, lokali i poslovni prostor u našim objektima.",

    latestTag: "Novo u ponudi",
    latestTitle: "Najnovije jedinice",
    latestSubtitle: "Poslednje objavljeno iz naših objekata.",
    latestCta: "Cela ponuda",

    trustTag: "Zašto od investitora",

    ctaTag: "Zainteresovani ste?",

    // The data plate beside the hero headline — live figures set in mono.
    plateTitle: "Ponuda u brojkama",
    plateListings: "Jedinica u ponudi",
    plateCategories: "Tipova nekretnina",
    plateCurrency: "Valuta",
    plateCommission: "Provizija",
    plateCommissionValue: "0 %",

    trust: [
      {
        title: "Gradimo ono što prodajemo",
        body: "Nismo agencija. Svaka jedinica u ponudi je iz objekta koji sami vodimo — od dozvole i temelja do tehničkog prijema.",
      },
      {
        title: "Bez agencijske provizije",
        body: "Kupujete direktno od investitora, pa nema posrednika ni provizije. Cena koju vidite je cena o kojoj razgovaramo.",
      },
      {
        title: "Uvid u svakoj fazi",
        body: "Obilazak gradilišta, projektna dokumentacija i dinamika radova dostupni su vam i pre nego što je objekat završen.",
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Listing index / filters                                           */
  /* ---------------------------------------------------------------- */
  listings: {
    title: "Ponuda nekretnina",
    subtitle: "Sve trenutno dostupne jedinice iz naših objekata.",
    resultsPrefix: "Pronađeno",
    filters: "Filteri",
    showFilters: "Prikaži filtere",
    hideFilters: "Sakrij filtere",
    clearFilters: "Obriši filtere",
    applyFilters: "Primeni",
    category: "Tip nekretnine",
    allCategories: "Svi tipovi",
    // The URL parameter stays `stanje` — only the label moved on.
    condition: "Faza",
    price: "Cena",
    priceFrom: "Cena od",
    priceTo: "Cena do",
    location: "Lokacija",
    locationPlaceholder: "npr. Vračar",
    sort: "Sortiranje",
    searchPlaceholder: "Pretražite po lokaciji, ulici ili opisu…",
    searchSubmit: "Pretraži",
    activeFilters: "Aktivni filteri",
    removeFilter: "Ukloni filter",
    page: "Strana",
  },

  /* ---------------------------------------------------------------- */
  /* Listing detail                                                    */
  /* ---------------------------------------------------------------- */
  listing: {
    negotiable: "Cena po dogovoru",
    priceOnRequest: "Po dogovoru",
    soldRibbon: "Prodato",
    soldNotice: "Ova jedinica je prodata i više nije u ponudi.",
    publishedOn: "Objavljeno",
    updatedOn: "Ažurirano",
    views: "pregleda",
    descriptionTitle: "Opis",
    detailsTitle: "Specifikacija",
    conditionLabel: "Faza",
    categoryLabel: "Tip nekretnine",
    locationLabel: "Lokacija",
    referenceLabel: "Šifra jedinice",
    relatedTitle: "Slične nekretnine",

    /* Attribute rows — the spec sheet under "Specifikacija". Keys mirror
       ListingAttributes in src/types/domain.ts. */
    attrKvadratura: "Kvadratura",
    attrBrojSoba: "Struktura",
    attrSprat: "Sprat",
    attrBrojKupatila: "Kupatila",
    attrGrejanje: "Grejanje",
    attrOrijentacija: "Orijentacija",
    attrTerasa: "Terasa",
    attrLift: "Lift",
    attrGaraznoMesto: "Garažno mesto",
    attrUknjizen: "Uknjiženost",
    attrRokUseljenja: "Rok useljenja",
    attrEnergetskiRazred: "Energetski razred",
    pricePerSquare: "Cena po m²",
    squareMetreSuffix: "m²",
    roomsSuffix: "sobe",
    share: "Podeli",
    shareCopied: "Link je kopiran",
    galleryPrevious: "Prethodna slika",
    galleryNext: "Sledeća slika",
    galleryOpen: "Uvećaj sliku",
    galleryCounter: "Slika",
    noImage: "Bez fotografije",
    breadcrumbHome: "Početna",
    breadcrumbListings: "Ponuda",
  },

  /* ---------------------------------------------------------------- */
  /* Contact panel + inquiry form                                      */
  /* ---------------------------------------------------------------- */
  contact: {
    title: "Kontakt",
    seller: "Prodaja",
    revealPhone: "Prikaži broj telefona",
    callNow: "Pozovi",
    sendEmail: "Pošalji e-mail",
    viber: "Viber",
    whatsapp: "WhatsApp",
    emailSubjectPrefix: "Upit za nekretninu:",

    inquiryTitle: "Zakažite obilazak",
    inquirySubtitle:
      "Pišite nam i javljamo se sa detaljima, planom stana i terminom za obilazak.",
    name: "Ime i prezime",
    namePlaceholder: "Petar Petrović",
    phone: "Telefon",
    phonePlaceholder: "064 123 4567",
    email: "E-mail",
    emailPlaceholder: "petar@primer.rs",
    message: "Poruka",
    messagePlaceholder:
      "Poštovani, zanima me da li je stan još uvek dostupan i kada je moguć obilazak…",
    submit: "Pošalji upit",
    submitting: "Slanje…",
    successTitle: "Upit je poslat",
    successBody: "Primili smo vašu poruku i javljamo vam se u najkraćem roku.",
    consent: "Slanjem upita prihvatate našu politiku privatnosti.",
  },

  /* ---------------------------------------------------------------- */
  /* Inquiry notification e-mail (src/lib/email.ts)                    */
  /* ---------------------------------------------------------------- */
  email: {
    /** Prefixed to the listing title: "Novi upit: Dvosoban stan, Vračar". */
    subjectPrefix: "Novi upit:",
    greeting: "Poštovani",
    intro: "Stigao vam je novi upit za nekretninu",
    heading: "Novi upit za nekretninu",
    rowName: "Ime",
    rowPhone: "Telefon",
    rowEmail: "E-mail",
    messageTitle: "Poruka:",
    linkLabel: "Nekretnina:",
    cta: "Otvori nekretninu",
  },

  /* ---------------------------------------------------------------- */
  /* Empty / error / loading states                                    */
  /* ---------------------------------------------------------------- */
  states: {
    emptyListingsTitle: "Trenutno nema jedinica u ponudi",
    emptyListingsBody: "Nove jedinice pojaviće se ovde čim krene prodaja u sledećem objektu.",

    noResultsTitle: "Nema rezultata za vašu pretragu",
    noResultsBody: "Pokušajte sa drugom lokacijom ili uklonite neke filtere.",

    errorEyebrow: "Greška",
    errorTitle: "Došlo je do greške",
    errorBody: "Pokušajte ponovo. Ako se problem ponovi, javite nam se.",
    errorRetry: "Pokušaj ponovo",
    /** Prefixes the Next.js error digest — a support reference, not prose. */
    errorRef: "Ref:",

    notFoundTitle: "Stranica nije pronađena",
    notFoundBody: "Tražena stranica ne postoji ili je uklonjena.",
    notFoundCta: "Nazad na početnu",

    listingNotFoundTitle: "Nekretnina nije pronađena",
    listingNotFoundBody: "Ova jedinica je prodata ili više nije u ponudi.",
    listingNotFoundCta: "Pogledaj celu ponudu",
  },

  /* ---------------------------------------------------------------- */
  /* Auth                                                              */
  /* ---------------------------------------------------------------- */
  auth: {
    loginTitle: "Prijava",
    loginSubtitle: "Pristup je dozvoljen samo internim korisnicima.",
    email: "E-mail adresa",
    password: "Lozinka",
    submit: "Prijavi se",
    submitting: "Prijavljivanje…",
    invalidCredentials: "Pogrešna e-mail adresa ili lozinka.",
    inactiveAccount: "Vaš nalog je deaktiviran. Obratite se administratoru.",
    genericError: "Prijava nije uspela. Pokušajte ponovo.",
    noSignupNote: "Nemate nalog? Naloge kreira administrator — javite se internim putem.",

    changePasswordTitle: "Postavite novu lozinku",
    changePasswordSubtitle:
      "Prijavili ste se privremenom lozinkom. Postavite novu da biste nastavili.",
    newPassword: "Nova lozinka",
    confirmPassword: "Potvrdite lozinku",
    passwordMismatch: "Lozinke se ne podudaraju.",
    passwordTooShort: "Lozinka mora imati najmanje 10 karaktera.",
    changePasswordSubmit: "Sačuvaj lozinku",
    changePasswordSuccess: "Lozinka je promenjena.",
  },

  /* ---------------------------------------------------------------- */
  /* Dashboard                                                         */
  /* ---------------------------------------------------------------- */
  dashboard: {
    title: "Kontrolna tabla",
    welcome: "Dobrodošli",
    nav: {
      overview: "Pregled",
      listings: "Moje nekretnine",
      revenue: "Prihod",
      inquiries: "Upiti",
      settings: "Podešavanja",
      users: "Korisnici",
      categories: "Kategorije",
      adminSection: "Administracija",
    },

    stats: {
      total: "Ukupno jedinica",
      active: "Aktivni",
      drafts: "Nacrti",
      sold: "Prodato",
      unreadInquiries: "Novi upiti",
    },

    revenue: {
      title: "Prihod od prodaje",
      titleAll: "Prihod od prodaje",
      subtitleOwn: "Zbir cena vaših jedinica označenih kao prodate.",
      subtitleAll: "Zbir cena svih jedinica označenih kao prodate, po prodavcima.",

      internalOnly: "Interni podatak",
      internalNote: "Ova stranica je vidljiva samo prijavljenim internim korisnicima.",

      // Overview plate.
      allSellers: "svi prodavci",
      soldSuffix: "označeno kao prodato",
      openReport: "Detaljan pregled",

      totalLabel: "Ukupan prihod",
      countLabel: "Prodatih jedinica",
      averageLabel: "Prosečna prodaja",
      bestLabel: "Najveća prodaja",
      thisMonth: "Ovaj mesec",
      previousMonth: "Prošli mesec",
      thisYear: "Ova godina",

      chartTitle: "Prihod po mesecima",
      chartHint: "Poslednjih 12 meseci.",
      chartTableCaption: "Prihod po mesecima, poslednjih 12 meseci",

      sellersTitle: "Po prodavcu",
      categoriesTitle: "Po kategoriji",
      recentTitle: "Poslednje prodaje",

      colSeller: "Prodavac",
      colCategory: "Kategorija",
      colMonth: "Mesec",
      colSales: "Prodaja",
      colRevenue: "Prihod",
      colShare: "Udeo",
      colListing: "Oglas",
      colPrice: "Cena",
      colSoldAt: "Prodato",

      // Sales with no price ("Po dogovoru") are counted but cannot be
      // summed — saying so keeps the total honest.
      unpricedNote: "bez iskazane cene („Po dogovoru”) — ulazi u broj prodaja, ne u zbir.",
      basisNote:
        "Iznosi se čitaju iz trenutne cene jedinice. Jedinica vraćena u prodaju izlazi iz obračuna.",

      empty: "Još nema evidentiranih prodaja.",
      emptyBody: "Kada jedinicu označite kao prodatu, iznos će se pojaviti ovde.",
      emptyCta: "Pogledaj nekretnine",
    },

    listings: {
      title: "Moje nekretnine",
      titleAdmin: "Sve nekretnine",
      create: "Nova nekretnina",
      empty: "Još nemate nijednu objavljenu nekretninu.",
      emptyCta: "Dodajte prvu nekretninu",
      tabs: {
        all: "Svi",
        nacrt: "Nacrti",
        aktivan: "Aktivni",
        prodato: "Prodato",
      },
      colImage: "Slika",
      colTitle: "Naziv",
      colStatus: "Status",
      colPrice: "Cena",
      colSeller: "Prodavac",
      colViews: "Pregledi",
      colUpdated: "Ažurirano",
      colActions: "Akcije",
      view: "Pogledaj",
      viewDisabled: "Nacrt nije javno vidljiv",
    },

    form: {
      createTitle: "Nova nekretnina",
      editTitle: "Izmena nekretnine",
      sectionBasics: "Osnovni podaci",
      sectionAttributes: "Specifikacija",
      sectionImages: "Fotografije",
      sectionContact: "Kontakt podaci",
      sectionStatus: "Status objave",

      title: "Naziv",
      titlePlaceholder: "npr. Dvoiposoban stan 62 m², Vračar",
      titleHint:
        "Struktura, kvadratura i lokacija u nazivu daju najbolje rezultate u pretrazi.",
      description: "Opis",
      descriptionPlaceholder:
        "Opišite raspored, orijentaciju, standard opreme, okruženje i rok useljenja…",
      condition: "Faza",
      conditionPlaceholder: "Izaberite fazu",
      category: "Tip nekretnine",
      categoryPlaceholder: "Izaberite tip",
      price: "Cena (EUR)",
      pricePlaceholder: "npr. 242000",
      priceHint: "Ostavite prazno za „Po dogovoru”.",
      negotiable: "Cena je podložna dogovoru",
      location: "Lokacija",
      locationPlaceholder: "npr. Vračar, Beograd",

      /* Attribute fields — see ListingAttributes in src/types/domain.ts. */
      attrKvadratura: "Kvadratura (m²)",
      attrKvadraturaPlaceholder: "npr. 62",
      attrBrojSoba: "Broj soba",
      attrBrojSobaPlaceholder: "npr. 2.5",
      attrSprat: "Sprat",
      attrSpratPlaceholder: "npr. 4/8",
      attrBrojKupatila: "Broj kupatila",
      attrGrejanje: "Grejanje",
      attrGrejanjePlaceholder: "Izaberite grejanje",
      attrOrijentacija: "Orijentacija",
      attrOrijentacijaPlaceholder: "npr. jugoistok",
      attrTerasa: "Terasa (m²)",
      attrLift: "Zgrada ima lift",
      attrGaraznoMesto: "Uz jedinicu ide garažno mesto",
      attrUknjizen: "Jedinica je uknjižena",
      attrRokUseljenja: "Rok useljenja",
      attrRokUseljenjaPlaceholder: "npr. Q3 2026",
      attrEnergetskiRazred: "Energetski razred",
      attrEnergetskiRazredPlaceholder: "npr. B",
      attributesHint:
        "Sve je opciono, ali kvadratura i broj soba se prikazuju u pretrazi i u Google rezultatima — popunite ih kad god možete.",
      contactName: "Ime za kontakt",
      contactPhone: "Telefon",
      contactEmail: "E-mail",
      contactHint: "Unesite bar jedan način kontakta.",

      images: "Fotografije",
      imagesHint: "Do 10 fotografija, najviše 5 MB po slici. Prva slika je naslovna.",
      imagesDrop: "Prevucite fotografije ovde ili kliknite da izaberete",
      imagesAdd: "Dodaj fotografije",
      imageSetCover: "Postavi kao naslovnu",
      imageCover: "Naslovna",
      imageRemove: "Ukloni sliku",
      imageMoveUp: "Pomeri levo",
      imageMoveDown: "Pomeri desno",
      imageUploading: "Otpremanje…",
      imageFailed: "Otpremanje nije uspelo",
      imageRetry: "Pokušaj ponovo",

      saveDraft: "Sačuvaj kao nacrt",
      publish: "Objavi",
      update: "Sačuvaj izmene",
      unpublish: "Vrati u nacrt",
      markSold: "Označi kao prodato",
      markActive: "Vrati u prodaju",

      savedDraft: "Nekretnina je sačuvana kao nacrt.",
      published: "Nekretnina je objavljena.",
      updated: "Izmene su sačuvane.",
    },

    delete: {
      title: "Brisanje nekretnine",
      body: "Ova radnja je nepovratna. Oglas, sve fotografije i primljeni upiti biće trajno obrisani.",
      confirmLabel: "Za potvrdu upišite naziv nekretnine:",
      confirm: "Obriši trajno",
      mismatch: "Uneti naziv se ne podudara.",
      success: "Oglas je obrisan.",
    },

    inquiries: {
      title: "Primljeni upiti",
      empty: "Još nemate primljenih upita.",
      emptyBody: "Upiti sa vaših nekretnina pojaviće se ovde.",
      unread: "Novo",
      markRead: "Označi kao pročitano",
      forListing: "Oglas",
      received: "Primljeno",
      reply: "Odgovori",
    },

    settings: {
      title: "Podešavanja naloga",
      profileSection: "Podaci o profilu",
      passwordSection: "Lozinka",
      fullName: "Ime i prezime",
      phone: "Telefon",
      location: "Lokacija",
      profileHint: "Ovi podaci se koriste kao podrazumevani kontakt na novim nekretninama.",
      saved: "Podaci su sačuvani.",
    },

    users: {
      title: "Korisnici",
      create: "Novi nalog",
      empty: "Nema kreiranih naloga.",
      colName: "Ime",
      colEmail: "E-mail",
      colRole: "Uloga",
      colStatus: "Status",
      colCreated: "Kreiran",
      active: "Aktivan",
      inactive: "Deaktiviran",
      deactivate: "Deaktiviraj",
      activate: "Aktiviraj",
      changeRole: "Promeni ulogu",
      createTitle: "Kreiranje internog naloga",
      createBody: "Nalog se kreira odmah. Privremenu lozinku prosledite korisniku lično.",
      tempPasswordTitle: "Nalog je kreiran",
      tempPasswordBody:
        "Privremena lozinka se prikazuje samo jednom. Kopirajte je i prosledite korisniku.",
      tempPasswordLabel: "Privremena lozinka",
      selfEditBlocked: "Ne možete menjati sopstvenu ulogu ili status.",
    },

    categories: {
      title: "Kategorije",
      create: "Nova kategorija",
      empty: "Nema definisanih kategorija.",
      colName: "Naziv",
      colSlug: "URL oznaka",
      colCount: "Broj jedinica",
      colOrder: "Redosled",
      colStatus: "Status",
      name: "Naziv",
      slug: "URL oznaka",
      description: "Opis",
      sortOrder: "Redosled",
      isActive: "Aktivna",
      inUseError: "Tip se ne može obrisati jer sadrži nekretnine. Deaktivirajte ga umesto toga.",
      saved: "Kategorija je sačuvana.",
    },
  },

  /* ---------------------------------------------------------------- */
  /* Validation messages (mirrored by zod schemas)                     */
  /* ---------------------------------------------------------------- */
  validation: {
    required: "Ovo polje je obavezno.",
    titleLength: "Naziv mora imati između 5 i 120 karaktera.",
    descriptionLength: "Opis mora imati između 20 i 5000 karaktera.",
    descriptionTooLong: "Opis može imati najviše 5000 karaktera.",
    invalidPrice: "Unesite ispravnu cenu u evrima.",
    invalidNumber: "Unesite ispravan broj.",
    priceTooHigh: "Cena je prevelika.",
    invalidCondition: "Izaberite stanje.",
    invalidCategory: "Izaberite kategoriju.",
    locationLength: "Lokacija mora imati između 2 i 80 karaktera.",
    contactRequired: "Unesite telefon ili e-mail adresu.",
    invalidPhone: "Unesite ispravan broj telefona (npr. 064 123 4567).",
    invalidEmail: "Unesite ispravnu e-mail adresu.",
    imagesRequired: "Dodajte bar jednu fotografiju pre objave.",
    tooManyImages: "Možete dodati najviše 10 fotografija.",
    imageTooLarge: "Slika je prevelika (maksimum 5 MB).",
    imageWrongType: "Dozvoljene su samo JPG, PNG i WebP slike.",
    // iPhone fotografije su najčešće HEIC iako im ime završava na .JPG,
    // pa poruka mora da objasni i šta korisnik konkretno treba da uradi.
    imageHeic:
      "Ova fotografija je u HEIC formatu (iPhone), iako se zove .JPG — pregledači ne mogu da je otvore. " +
      "Na iPhone-u: Podešavanja → Kamera → Formati → „Najkompatibilnije“, pa je ponovo slikajte ili izvezite kao JPEG.",
    messageLength: "Poruka mora imati između 10 i 2000 karaktera.",
    rateLimited: "Poslali ste previše upita. Pokušajte ponovo za sat vremena.",
    genericError: "Došlo je do greške. Pokušajte ponovo.",
    unauthorized: "Nemate dozvolu za ovu radnju.",
  },

  /* ---------------------------------------------------------------- */
  /* Static pages — MOCK content until real copy is supplied           */
  /* ---------------------------------------------------------------- */
  pages: {
    about: {
      title: "O nama",
      lead: "BG Building je beogradski investitor i izvođač. Gradimo stambene objekte i prodajemo stanove u njima bez posrednika.",
      body: [
        "BG Building nije agencija. Objekat koji gradimo vodimo od pribavljanja dozvole i pripreme lokacije, preko grube gradnje i instalacija, do tehničkog prijema i primopredaje ključeva. Kada kupujete kod nas, razgovarate sa firmom koja je taj stan i sagradila — a ne sa posrednikom koji ga je preuzeo u ponudu.",
        "Gradimo u Beogradu, u naseljima sa gotovom infrastrukturom: tamo gde već postoje škola, prevoz i pijaca, a ne na periferiji koja se tek priprema. Objekti su manji i srednji, po pravilu do desetak spratova, sa podzemnom garažom i sopstvenim priključcima.",
        "Kupovina je moguća u svakoj fazi. U ranoj fazi cena kvadrata je najniža, a izbor etaže i orijentacije najveći; kod useljivih stanova plaćate više, ali ulazite odmah i vidite tačno ono što kupujete. Šta god da izaberete, dinamika plaćanja se prati uz dinamiku radova i definiše se ugovorom kod javnog beležnika.",
        "Obilazak gradilišta je moguć i pre nego što je objekat završen, uz najavu i zaštitnu opremu. Na uvid dajemo građevinsku dozvolu, projekat stana sa merama i specifikaciju radova i materijala — da biste znali šta je uračunato u cenu, a šta nije.",
        "Posle primopredaje ostajemo dostupni. Za radove i ugrađenu opremu važi garantni rok predviđen zakonom, a prijave se rešavaju direktno kod nas, bez posrednika.",
      ],
      // TODO(BG Building): brojke (godina osnivanja, broj objekata, broj
      // predatih stanova) tek kad ih klijent potvrdi — izmišljene brojke
      // na "O nama" su najlakše proverljiva laž na sajtu.
    },
    contact: {
      title: "Kontakt",
      lead: "Za ponudu, obilazak objekta i uslove plaćanja.",
      infoTitle: "Podaci",
      addressLabel: "Adresa",
      note: "Za konkretnu jedinicu iz ponude najbrže je da pošaljete upit sa njene stranice — poruka stiže direktno prodaji, zajedno sa podacima o toj nekretnini.",
      // Prikazuje se dok su telefon i e-mail još `null` u SITE.contact.
      pending:
        "Telefon i e-mail objavljujemo uskoro. Do tada nam pišite preko forme sa stranice nekretnine i javljamo se u najkraćem roku.",
    },
    faq: {
      title: "Česta pitanja",
      items: [
        {
          q: "Da li se plaća agencijska provizija?",
          a: "Ne. BG Building je investitor i prodaje sopstvene stanove, pa nema posrednika ni provizije. Cena iskazana u ponudi je cena o kojoj se pregovara.",
        },
        {
          q: "Može li se kupiti stan dok je objekat još u izgradnji?",
          a: "Može. U fazi izgradnje cena kvadrata je niža, a izbor etaže, strukture i orijentacije najveći. Plaćanje se ugovara u ratama koje prate dinamiku radova.",
        },
        {
          q: "Da li su stanovi uknjiženi?",
          a: "Objekti se grade sa građevinskom dozvolom i uknjižba se sprovodi po tehničkom prijemu. Kod useljivih stanova status uknjižbe naveden je u specifikaciji same jedinice.",
        },
        {
          q: "Šta je uračunato u cenu stana?",
          a: "Stan se predaje u standardu koji je opisan u specifikaciji radova za taj objekat — po pravilu obrađeni zidovi, podovi, stolarija, kupatilo sa sanitarijama i instalacije do priključaka. Kuhinjski elementi i nameštaj nisu uračunati.",
        },
        {
          q: "Može li se stan kupiti na kredit?",
          a: "Može. Objekti su podobni za stambeni kredit, a potrebnu dokumentaciju za banku pripremamo mi. Uslove i visinu učešća određuje banka, ne mi.",
        },
        {
          q: "Da li je moguć obilazak pre kupovine?",
          a: "Jeste. Useljive stanove obilazite u dogovorenom terminu, a objekte u izgradnji uz prethodnu najavu i zaštitnu opremu, u skladu sa pravilima na gradilištu.",
        },
        {
          q: "Koliki je rok useljenja?",
          a: "Rok je naveden uz svaku jedinicu i definiše se ugovorom. Za useljive stanove primopredaja je moguća odmah po overi ugovora i izmirenju obaveza.",
        },
        {
          q: "Postoji li garancija na izvedene radove?",
          a: "Postoji. Za objekat i izvedene radove važe garantni rokovi predviđeni zakonom, a reklamacije se prijavljuju direktno nama.",
        },
        {
          q: "Da li se garažno mesto kupuje odvojeno?",
          a: "Po pravilu da. Garažna i parking mesta vode se kao zasebne jedinice i mogu se kupiti uz stan ili nezavisno, dok ih ima.",
        },
        {
          q: "U kojim delovima Beograda gradite?",
          a: "Gradimo u gradskim opštinama sa gotovom infrastrukturom. Trenutne lokacije vidite u ponudi — svaka jedinica nosi tačnu adresu i opštinu.",
        },
      ],
    },
    terms: {
      title: "Uslovi korišćenja",
      // TODO(BG Building): tekst mora pregledati pravnik pre puštanja u
      // produkciju. Za razliku od ranije verzije, ovde smo MI prodavac,
      // pa ograda "ne učestvujemo u transakciji" više ne stoji.
      updated: "Poslednja izmena",
      body: [
        "Korišćenjem ovog sajta prihvatate uslove navedene u nastavku. Sajt služi za prikaz nekretnina iz ponude privrednog društva BG Building i za uspostavljanje kontakta sa prodajom.",
        "Podaci uz svaku nekretninu — kvadratura, struktura, sprat, faza radova, rok useljenja i cena — informativnog su karaktera i podložni su promeni. Merodavni su podaci iz projektne dokumentacije i iz ugovora overenog kod javnog beležnika.",
        "Prikaz nekretnine na ovom sajtu ne predstavlja obavezujuću ponudu u smislu zakona i ne stvara obavezu zaključenja ugovora. Dostupnost jedinice potvrđuje se tek u direktnom kontaktu sa prodajom.",
        "Fotografije, 3D prikazi i idejna rešenja služe za ilustraciju. Konačan izgled može odstupati u okviru odstupanja dozvoljenih projektom i ugovorom.",
        "Sadržaj sajta, uključujući tekstove, fotografije i projektne prikaze, predstavlja našu intelektualnu svojinu i ne sme se preuzimati bez pisane saglasnosti.",
        "Zadržavamo pravo izmene ponude, cena i ovih uslova bez prethodne najave.",
      ],
    },
    privacy: {
      title: "Politika privatnosti",
      // TODO(BG Building): uskladiti sa Zakonom o zaštiti podataka o
      // ličnosti i dopuniti podacima o rukovaocu kada stignu.
      updated: "Poslednja izmena",
      body: [
        "Prikupljamo samo podatke neophodne da bismo odgovorili na vaš upit i vodili prodaju.",
        "Kada pošaljete upit preko forme, čuvamo vaše ime, telefon, e-mail adresu i tekst poruke. Te podatke koristimo isključivo da vas kontaktiramo povodom nekretnine za koju ste se raspitali.",
        "Radi zaštite od zloupotrebe forme čuvamo i nepovratni kriptografski otisak vaše IP adrese. Sama IP adresa se ne čuva.",
        "Podatke ne prodajemo i ne prosleđujemo trećim licima, osim kada je to neophodno radi izvršenja ugovora (na primer javnom beležniku ili banci) ili kada to nalaže zakon.",
        "Imate pravo na uvid, ispravku i brisanje svojih podataka, kao i na povlačenje saglasnosti. Zahtev nam možete uputiti preko kontakt podataka sa stranice Kontakt.",
      ],
    },
  },
} as const;

export type Copy = typeof COPY;

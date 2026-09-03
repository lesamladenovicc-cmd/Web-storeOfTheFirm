/**
 * COPY — every user-facing Serbian string in the application.
 *
 * HARD RULE: no component may contain a literal Serbian sentence.
 * Components import from here. That is what makes a niche change a
 * config edit instead of a find-and-replace across the codebase.
 *
 * Placeholder marketing copy is intentional and flagged with `// MOCK`.
 * Replace those blocks once real copy is supplied.
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
    searchPlaceholder: "Pretražite oglase…",
  },

  footer: {
    tagline: SITE.tagline,
    rightsReserved: "Sva prava zadržana.",
    pib: "PIB",
    maticniBroj: "Matični broj",
    builtNote: "Oglasi se objavljuju interno. Kupovina se dogovara direktno sa prodavcem.",
  },

  /* ---------------------------------------------------------------- */
  /* Homepage                                                          */
  /* ---------------------------------------------------------------- */
  home: {
    // MOCK — replace with real positioning copy.
    heroEyebrow: "Interna ponuda",
    heroTitle: "Mašine, alati i oprema — bez posrednika",
    heroSubtitle:
      "Pregledajte aktuelnu ponudu i javite se prodavcu direktno. Bez provizije, bez čekanja, bez registracije.",
    heroSearchLabel: "Pretražite ponudu",
    heroCta: "Pogledaj sve oglase",

    categoriesTitle: "Kategorije",
    categoriesSubtitle: "Pronađite ono što vam treba.",

    latestTitle: "Najnoviji oglasi",
    latestSubtitle: "Sveže objavljeno u ponudi.",
    latestCta: "Svi oglasi",

    // MOCK — trust strip.
    trust: [
      {
        title: "Provereni prodavci",
        body: "Oglase objavljuju isključivo interni, odobreni prodavci. Bez anonimnih naloga.",
      },
      {
        title: "Direktan kontakt",
        body: "Pozovite ili pošaljite upit prodavcu. Bez posrednika i bez dodatnih troškova.",
      },
      {
        title: "Jasna cena",
        body: "Cena je uvek iskazana u dinarima. Ono što vidite je ono o čemu se dogovarate.",
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Listing index / filters                                           */
  /* ---------------------------------------------------------------- */
  listings: {
    title: "Svi oglasi",
    subtitle: "Kompletna aktuelna ponuda.",
    resultsPrefix: "Pronađeno",
    filters: "Filteri",
    showFilters: "Prikaži filtere",
    hideFilters: "Sakrij filtere",
    clearFilters: "Obriši filtere",
    applyFilters: "Primeni",
    category: "Kategorija",
    allCategories: "Sve kategorije",
    condition: "Stanje",
    price: "Cena",
    priceFrom: "Cena od",
    priceTo: "Cena do",
    location: "Lokacija",
    locationPlaceholder: "npr. Novi Sad",
    sort: "Sortiranje",
    searchPlaceholder: "Pretražite po nazivu ili opisu…",
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
    soldNotice: "Ovaj oglas je označen kao prodat i više nije u ponudi.",
    publishedOn: "Objavljeno",
    updatedOn: "Ažurirano",
    views: "pregleda",
    descriptionTitle: "Opis",
    detailsTitle: "Detalji",
    conditionLabel: "Stanje",
    categoryLabel: "Kategorija",
    locationLabel: "Lokacija",
    referenceLabel: "Šifra oglasa",
    relatedTitle: "Slični oglasi",
    share: "Podeli",
    shareCopied: "Link je kopiran",
    galleryPrevious: "Prethodna slika",
    galleryNext: "Sledeća slika",
    galleryOpen: "Uvećaj sliku",
    galleryCounter: "Slika",
    noImage: "Bez fotografije",
    breadcrumbHome: "Početna",
    breadcrumbListings: "Oglasi",
  },

  /* ---------------------------------------------------------------- */
  /* Contact panel + inquiry form                                      */
  /* ---------------------------------------------------------------- */
  contact: {
    title: "Kontakt",
    seller: "Prodavac",
    revealPhone: "Prikaži broj telefona",
    callNow: "Pozovi",
    sendEmail: "Pošalji e-mail",
    viber: "Viber",
    whatsapp: "WhatsApp",
    emailSubjectPrefix: "Upit za oglas:",

    inquiryTitle: "Pošaljite upit",
    inquirySubtitle: "Prodavac dobija vašu poruku i javlja vam se direktno.",
    name: "Ime i prezime",
    namePlaceholder: "Petar Petrović",
    phone: "Telefon",
    phonePlaceholder: "064 123 4567",
    email: "E-mail",
    emailPlaceholder: "petar@primer.rs",
    message: "Poruka",
    messagePlaceholder: "Poštovani, zanima me da li je mašina još uvek dostupna…",
    submit: "Pošalji upit",
    submitting: "Slanje…",
    successTitle: "Upit je poslat",
    successBody: "Prodavac je obavešten i javiće vam se u najkraćem roku.",
    consent: "Slanjem upita prihvatate našu politiku privatnosti.",
  },

  /* ---------------------------------------------------------------- */
  /* Empty / error / loading states                                    */
  /* ---------------------------------------------------------------- */
  states: {
    emptyListingsTitle: "Trenutno nema objavljenih oglasa",
    emptyListingsBody: "Nova ponuda će se pojaviti ovde čim bude objavljena.",

    noResultsTitle: "Nema rezultata za vašu pretragu",
    noResultsBody: "Pokušajte sa drugim pojmom ili uklonite neke filtere.",

    errorTitle: "Došlo je do greške",
    errorBody: "Pokušajte ponovo. Ako se problem ponovi, javite nam se.",
    errorRetry: "Pokušaj ponovo",

    notFoundTitle: "Stranica nije pronađena",
    notFoundBody: "Tražena stranica ne postoji ili je uklonjena.",
    notFoundCta: "Nazad na početnu",

    listingNotFoundTitle: "Oglas nije pronađen",
    listingNotFoundBody: "Ovaj oglas je uklonjen ili više nije aktivan.",
    listingNotFoundCta: "Pogledaj sve oglase",
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
      listings: "Moji oglasi",
      inquiries: "Upiti",
      settings: "Podešavanja",
      users: "Korisnici",
      categories: "Kategorije",
      adminSection: "Administracija",
    },

    stats: {
      total: "Ukupno oglasa",
      active: "Aktivni",
      drafts: "Nacrti",
      sold: "Prodato",
      unreadInquiries: "Novi upiti",
    },

    listings: {
      title: "Moji oglasi",
      titleAdmin: "Svi oglasi",
      create: "Novi oglas",
      empty: "Još nemate nijedan oglas.",
      emptyCta: "Kreirajte prvi oglas",
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
      createTitle: "Novi oglas",
      editTitle: "Izmena oglasa",
      sectionBasics: "Osnovni podaci",
      sectionImages: "Fotografije",
      sectionContact: "Kontakt podaci",
      sectionStatus: "Status objave",

      title: "Naziv oglasa",
      titlePlaceholder: "npr. Bager guseničar 2018, 4200 radnih sati",
      titleHint: "Kratak i jasan naziv daje najbolje rezultate u pretrazi.",
      description: "Opis",
      descriptionPlaceholder:
        "Opišite stanje, godište, radne sate, servisnu istoriju i razlog prodaje…",
      condition: "Stanje",
      conditionPlaceholder: "Izaberite stanje",
      category: "Kategorija",
      categoryPlaceholder: "Izaberite kategoriju",
      price: "Cena (RSD)",
      pricePlaceholder: "npr. 1950000",
      priceHint: "Ostavite prazno za „Po dogovoru”.",
      negotiable: "Cena je podložna dogovoru",
      location: "Lokacija",
      locationPlaceholder: "npr. Novi Sad",
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

      savedDraft: "Oglas je sačuvan kao nacrt.",
      published: "Oglas je objavljen.",
      updated: "Izmene su sačuvane.",
    },

    delete: {
      title: "Brisanje oglasa",
      body: "Ova radnja je nepovratna. Oglas, sve fotografije i primljeni upiti biće trajno obrisani.",
      confirmLabel: "Za potvrdu upišite naziv oglasa:",
      confirm: "Obriši trajno",
      mismatch: "Uneti naziv se ne podudara.",
      success: "Oglas je obrisan.",
    },

    inquiries: {
      title: "Primljeni upiti",
      empty: "Još nemate primljenih upita.",
      emptyBody: "Upiti sa vaših oglasa pojaviće se ovde.",
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
      profileHint: "Ovi podaci se koriste kao podrazumevani kontakt na novim oglasima.",
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
      colCount: "Broj oglasa",
      colOrder: "Redosled",
      colStatus: "Status",
      name: "Naziv",
      slug: "URL oznaka",
      description: "Opis",
      sortOrder: "Redosled",
      isActive: "Aktivna",
      inUseError: "Kategorija se ne može obrisati jer sadrži oglase. Deaktivirajte je umesto toga.",
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
    invalidPrice: "Unesite ispravnu cenu u dinarima.",
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
      lead: "Interna platforma za oglašavanje mašina, alata i opreme.",
      // MOCK
      body: [
        "Ova platforma služi za objavljivanje ponude naših internih prodavaca. Svaki oglas objavljuje odobreni saradnik koji stoji iza tačnosti podataka i dostupnosti artikla.",
        "Ne naplaćujemo proviziju i ne posredujemo u prodaji. Kada pronađete nešto što vam odgovara, kontaktirate prodavca direktno — telefonom, e-mailom ili preko forme za upit.",
        "Ponuda se menja svakodnevno. Ako trenutno ne vidite ono što tražite, pozovite nas i proverićemo da li nešto stiže uskoro.",
      ],
    },
    contact: {
      title: "Kontakt",
      lead: "Za opšta pitanja o platformi ili saradnju.",
      infoTitle: "Podaci",
      note: "Za pitanja o konkretnom oglasu, kontaktirajte prodavca direktno sa stranice tog oglasa.",
    },
    terms: {
      title: "Uslovi korišćenja",
      // MOCK — replace with reviewed legal text.
      updated: "Poslednja izmena",
      body: [
        "Korišćenjem ove platforme prihvatate uslove navedene u nastavku. Platforma služi isključivo za prikaz oglasa i povezivanje kupca sa prodavcem.",
        "Platforma ne obavlja prodaju, ne naplaćuje proviziju i ne učestvuje u transakciji. Sve dogovore, plaćanje i primopredaju kupac i prodavac obavljaju direktno i na sopstvenu odgovornost.",
        "Podaci u oglasima (stanje, godište, cena, dostupnost) su odgovornost prodavca koji je oglas objavio. Trudimo se da ponuda bude ažurna, ali ne garantujemo tačnost svakog podatka u svakom trenutku.",
        "Zadržavamo pravo da uklonimo oglas ili nalog koji krši ove uslove, bez prethodne najave.",
      ],
    },
    privacy: {
      title: "Politika privatnosti",
      // MOCK — replace with reviewed legal text.
      updated: "Poslednja izmena",
      body: [
        "Prikupljamo samo podatke koji su neophodni za funkcionisanje platforme.",
        "Kada pošaljete upit preko forme, čuvamo vaše ime, telefon, e-mail adresu i tekst poruke, kako bismo ih prosledili prodavcu. Ti podaci se koriste isključivo za odgovor na vaš upit.",
        "Radi zaštite od zloupotrebe, čuvamo i nepovratni kriptografski otisak vaše IP adrese. Sama IP adresa se ne čuva.",
        "Podatke ne prodajemo i ne prosleđujemo trećim licima izvan svrhe opisane iznad.",
        "Za brisanje vaših podataka, obratite nam se putem kontakt podataka navedenih na stranici Kontakt.",
      ],
    },
  },
} as const;

export type Copy = typeof COPY;

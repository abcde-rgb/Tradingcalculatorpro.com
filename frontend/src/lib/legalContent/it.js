/** Legal content — ITALIANO (traduzione di cortesia; prevale la versione spagnola). */
const it = {
  meta: {
    updated: 'Luglio 2026',
    updatedLabel: 'Ultimo aggiornamento',
    courtesy: 'Questa è una traduzione di cortesia. In caso di discrepanza, prevale la versione spagnola.',
  },

  privacy: {
    title: 'Informativa sulla Privacy',
    sections: [
      { t: 'Titolare del Trattamento', b: [
        { p: 'Il titolare del trattamento dei tuoi dati personali è **TradingCalculator.pro**, gestito da una società a responsabilità limitata (LLC) registrata negli Stati Uniti. Per qualsiasi questione relativa alla privacy, scrivici a {email}.' },
      ]},
      { t: 'Dati che Raccogliamo', b: [
        { p: 'Raccogliamo solo i dati necessari a fornire il servizio:' },
        { list: [
          'Dati identificativi: nome e indirizzo email, forniti in fase di registrazione o tramite l\'autenticazione Google (OAuth).',
          'Dati di utilizzo: pagine visitate, funzionalità usate (calcolatrice di opzioni, simulazioni, monitoraggio dei prezzi), preferenze di tema e lingua.',
          'Dati di pagamento: trattati da fornitori di pagamento esterni (Stripe, PayPal, Revolut e NOWPayments per le criptovalute). Non conserviamo mai numeri di carta o dati bancari sui nostri server; conserviamo solo identificativi cliente/transazione e lo stato dell\'abbonamento.',
          'Log tecnici: indirizzo IP, tipo di browser e sistema operativo, per sicurezza e diagnostica.',
          'Dati degli avvisi di prezzo: coppie di asset e soglie che configuri, solo se attivi questa funzionalità.',
          'Dati del diario di trading e dell\'AI Trade Coach: le operazioni che registri volontariamente e, se usi l\'AI Trade Coach, i parametri della strategia analizzata.',
        ]},
      ]},
      { t: 'Finalità del Trattamento', b: [
        { p: 'Trattiamo i tuoi dati per le seguenti finalità:' },
        { list: [
          'Erogazione del servizio: gestire il tuo account, l\'accesso agli strumenti della piattaforma (calcolatrice di opzioni, prezzi in tempo reale, simulazioni) e personalizzare l\'esperienza.',
          'Fatturazione e gestione dell\'abbonamento: elaborare i pagamenti ricorrenti, gestire i piani (17 €/mese, 45 €/trimestre, 200 €/anno, 500 € a vita) ed emettere le fatture.',
          'Comunicazioni transazionali: conferme di pagamento, avvisi di rinnovo e notifiche degli avvisi di prezzo che configuri, inviati tramite SendGrid.',
          'Sicurezza e prevenzione delle frodi: rilevare accessi non autorizzati e proteggere l\'integrità del servizio.',
          'Analisi dell\'utilizzo del servizio (con il tuo consenso): tramite Google Analytics 4 con anonimizzazione dell\'IP, per migliorare la piattaforma.',
          'Pubblicità nei contenuti gratuiti (con il tuo consenso): tramite Google AdSense, per finanziare le sezioni aperte. Gli utenti Premium non vedono pubblicità.',
        ]},
      ]},
      { t: 'Base Giuridica del Trattamento (GDPR)', b: [
        { p: 'Per gli utenti nello Spazio Economico Europeo, il trattamento si fonda sulle seguenti basi giuridiche ai sensi del Regolamento generale sulla protezione dei dati (GDPR):' },
        { list: [
          'Art. 6, par. 1, lett. b) GDPR — Esecuzione di un contratto: il trattamento è necessario per fornire il servizio contrattato, gestire il tuo abbonamento ed elaborare i pagamenti.',
          'Art. 6, par. 1, lett. a) GDPR — Consenso: per i cookie analitici (Google Analytics 4) e le comunicazioni di marketing facoltative. Puoi revocare il consenso in qualsiasi momento. Vale anche per i cookie pubblicitari di Google AdSense nei contenuti gratuiti.',
          'Art. 6, par. 1, lett. c) GDPR — Obbligo legale: conservazione dei dati di fatturazione ai sensi della normativa fiscale applicabile.',
          'Art. 6, par. 1, lett. f) GDPR — Legittimo interesse: sicurezza del servizio e prevenzione delle frodi.',
        ]},
      ]},
      { t: 'Terzi che Ricevono i Tuoi Dati', b: [
        { p: 'Condividiamo i dati con i seguenti fornitori di servizi, solo nella misura necessaria a erogare il servizio:' },
        { list: [
          'Stripe, Inc. (pagamenti con carta e SEPA): elabora i pagamenti dell\'abbonamento. Agisce come titolare autonomo per i dati di pagamento. Informativa: stripe.com/privacy.',
          'PayPal, Inc. (pagamenti): elabora i pagamenti effettuati con PayPal secondo la propria informativa sulla privacy.',
          'Revolut (Revolut Pay, include Apple Pay/Google Pay nel suo checkout): elabora i pagamenti effettuati con Revolut Pay.',
          'NOWPayments (pagamenti in criptovaluta): elabora i pagamenti in cripto. Riceve l\'importo, un identificativo d\'ordine e, se del caso, la tua email per la ricevuta.',
          'Google LLC (OAuth e Analytics): l\'accesso con Google OAuth trasferisce il tuo nome e la tua email. Google Analytics 4 è usato con anonimizzazione dell\'IP e solo con il tuo consenso. Informativa: policies.google.com/privacy. Google AdSense mostra annunci nei contenuti gratuiti, solo con il tuo consenso e mai agli utenti Premium.',
          'Twilio SendGrid (email transazionali): invia conferme, fatture e avvisi. Riceve solo il tuo indirizzo email.',
          'Anthropic (AI Trade Coach): quando richiedi un\'analisi con l\'IA, i parametri della strategia analizzata (asset, gambe dell\'operazione, prezzi) vengono inviati ad Anthropic. Il tuo nome e la tua email non vengono inviati con la richiesta.',
        ]},
        { p: 'I fornitori sono vincolati da accordi sul trattamento dei dati oppure si avvalgono di validi meccanismi di trasferimento internazionale (clausole contrattuali standard o altri meccanismi riconosciuti).' },
      ]},
      { t: 'I Tuoi Diritti come Interessato (GDPR)', b: [
        { p: 'Se ti trovi nell\'UE/SEE, hai i seguenti diritti:' },
        { list: [
          'Diritto di accesso (art. 15 GDPR): richiedere una copia dei dati personali che trattiamo su di te.',
          'Diritto di rettifica (art. 16 GDPR): correggere dati inesatti o incompleti in qualsiasi momento dalle impostazioni del tuo account.',
          'Diritto alla cancellazione (art. 17 GDPR): chiedere l\'eliminazione del tuo account e dei tuoi dati personali, salvo obblighi legali di conservazione.',
          'Diritto alla portabilità dei dati (art. 20 GDPR): richiedere un\'esportazione dei tuoi dati in un formato strutturato e leggibile da dispositivo automatico.',
          'Diritto di opposizione (art. 21 GDPR): opporti in qualsiasi momento al trattamento basato sul legittimo interesse.',
          'Diritto di revocare il consenso: senza pregiudicare la liceità del trattamento precedente.',
          'Diritto di proporre reclamo all\'autorità di controllo del tuo Paese di residenza nell\'UE (in Italia, il Garante per la protezione dei dati personali).',
        ]},
        { p: 'Per esercitare uno di questi diritti, scrivi a {email} indicando il diritto che intendi esercitare. Rispondiamo entro 30 giorni.' },
      ]},
      { t: 'Periodi di Conservazione', b: [
        { list: [
          'Dati dell\'account (nome, email, preferenze): conservati finché l\'account è attivo. Cancellati entro 30 giorni da una richiesta di eliminazione.',
          'Log tecnici: 90 giorni, per sicurezza e diagnostica.',
          'Dati di pagamento e fatturazione: conservati per il periodo richiesto dagli obblighi fiscali e contabili applicabili (fino a 10 anni a seconda della giurisdizione).',
          'Dati analitici (Google Analytics 4): massimo 14 mesi, con IP anonimizzato.',
        ]},
      ]},
      { t: 'Sicurezza dei Dati', b: [
        { p: 'Applichiamo misure tecniche e organizzative adeguate per proteggere i tuoi dati personali da accessi non autorizzati, perdita o divulgazione: cifratura in transito (TLS/HTTPS), controllo degli accessi basato sui ruoli e revisioni di sicurezza periodiche. I pagamenti sono protetti dall\'infrastruttura PCI DSS dei fornitori di pagamento.' },
      ]},
      { t: 'Trasferimenti Internazionali', b: [
        { p: 'La Società ha sede negli Stati Uniti e alcuni fornitori (Google, Stripe, SendGrid, Anthropic) trattano dati al di fuori dello Spazio Economico Europeo. In tali casi garantiamo tutele adeguate, come le clausole contrattuali standard approvate dalla Commissione europea o altri meccanismi di trasferimento validi.' },
      ]},
      { t: 'Cookie', b: [
        { p: 'Utilizziamo cookie e tecnologie analoghe. Per i dettagli, consulta la nostra Cookie Policy nella scheda corrispondente di questa pagina.' },
      ]},
    ],
  },

  terms: {
    title: 'Termini di Utilizzo',
    sections: [
      { t: 'Accettazione dei Termini', b: [
        { p: 'Accedendo e utilizzando TradingCalculator.pro (il «Servizio»), accetti di essere vincolato dai presenti Termini di Utilizzo. Se non concordi con una delle condizioni qui indicate, devi astenerti dall\'utilizzare il Servizio. Questi termini costituiscono un accordo giuridicamente vincolante tra te e la società a responsabilità limitata (LLC) registrata negli Stati Uniti che gestisce TradingCalculator.pro (la «Società»).' },
      ]},
      { t: 'Natura del Servizio — Non è Consulenza Finanziaria', b: [
        { p: 'TradingCalculator.pro è una piattaforma di strumenti di informazione finanziaria che comprende calcolatrici di opzioni (Black-Scholes, greche), prezzi degli asset in tempo reale e simulazioni di strategie. Il Servizio è strettamente informativo ed educativo.' },
        { p: '**AVVISO IMPORTANTE: TradingCalculator.pro NON fornisce consulenza finanziaria, di investimento, fiscale o legale. Nulla nella piattaforma deve essere interpretato come una raccomandazione di acquisto, vendita o detenzione di qualsiasi strumento finanziario.**' },
        { p: 'I risultati passati non garantiscono né prevedono risultati futuri. Investire in strumenti finanziari, comprese le opzioni, comporta un rischio significativo di perdita; puoi perdere l\'intero capitale investito. Sei l\'unico responsabile delle tue decisioni di investimento. Consulta un consulente finanziario professionista prima di operare.' },
      ]},
      { t: 'Registrazione e Account Utente', b: [
        { p: 'Per accedere alle funzionalità della piattaforma è necessario un account. Sei responsabile della riservatezza delle tue credenziali e di tutte le attività svolte con il tuo account. Segnalaci immediatamente qualsiasi uso non autorizzato scrivendo a {email}. Devi avere almeno 18 anni per registrarti e utilizzare il Servizio.' },
      ]},
      { t: 'Piani di Abbonamento, Prova Gratuita e Pagamenti', b: [
        { p: 'I piani disponibili sono:' },
        { list: [
          'Piano mensile: 17 €/mese, con rinnovo automatico ogni mese.',
          'Piano trimestrale: 45 €/trimestre, con rinnovo automatico ogni 3 mesi.',
          'Piano annuale: 200 €/anno, con rinnovo automatico ogni 12 mesi.',
          'Piano a vita: 500 €, pagamento unico, accesso permanente senza rinnovi.',
        ]},
        { p: '**Prova gratuita di 7 giorni** (solo per i piani ricorrenti e solo per i nuovi abbonati): per attivarla è necessario un metodo di pagamento valido. Se non disdici prima della fine della prova, il primo addebito del piano scelto viene effettuato automaticamente. Puoi disdire durante la prova senza alcun costo da «Il mio abbonamento».' },
        { p: 'I pagamenti sono elaborati in sicurezza tramite **Stripe** (carta, SEPA, Klarna e wallet come Apple Pay/Google Pay), **PayPal**, **Revolut Pay** e **NOWPayments** (criptovalute). I prezzi sono indicati in euro (EUR) e includono le imposte applicabili ove pertinente. Sottoscrivendo un piano a rinnovo automatico autorizzi addebiti ricorrenti sul tuo metodo di pagamento fino alla disdetta. Puoi disdire in qualsiasi momento da «Il mio abbonamento»; l\'accesso prosegue fino alla fine del periodo di fatturazione in corso.' },
      ]},
      { t: 'Politica di Rimborso', b: [
        { list: [
          'Piano mensile (17 €/mese): rimborso integrale entro i primi 14 giorni di calendario dall\'attivazione, a condizione che non tu abbia fatto un uso significativo delle funzionalità premium.',
          'Piano trimestrale (45 €/trimestre): rimborso integrale entro i primi 14 giorni di calendario dall\'attivazione, alle stesse condizioni.',
          'Piano annuale (200 €/anno): rimborso integrale entro i primi 14 giorni di calendario dall\'attivazione, alle stesse condizioni.',
          'Piano a vita (500 €): non rimborsabile una volta pagato, fatti salvi i diritti irrinunciabili del consumatore previsti dalla legge del tuo Paese di residenza.',
        ]},
        { p: 'Per richiedere un rimborso, contattaci a {email} entro il periodo applicabile. I rimborsi sono emessi sul metodo di pagamento originale entro 5-10 giorni lavorativi. **Pagamenti in criptovaluta:** poiché queste transazioni sono irreversibili, i rimborsi approvati vengono pagati in euro tramite un mezzo alternativo equivalente. Questa politica non limita i tuoi diritti di consumatore previsti dalla legge del tuo Paese di residenza nell\'UE.' },
      ]},
      { t: 'Proprietà Intellettuale', b: [
        { p: 'Tutti i contenuti del Servizio — inclusi codice sorgente, algoritmi, design dell\'interfaccia, testi, grafica, loghi e banche dati — sono di proprietà esclusiva della Società e sono protetti dalle leggi applicabili in materia di proprietà intellettuale. Ti viene concessa una licenza limitata, non esclusiva, non trasferibile e revocabile per utilizzare il Servizio esclusivamente per scopi personali e non commerciali.' },
      ]},
      { t: 'Utilizzi Vietati', b: [
        { p: 'È espressamente vietato:' },
        { list: [
          'Effettuare reverse engineering, decompilare o disassemblare qualsiasi parte del Servizio.',
          'Usare scraper, bot, crawler o altri strumenti automatizzati per estrarre dati dalla piattaforma.',
          'Rivendere, concedere in sublicenza o ridistribuire il Servizio o i suoi contenuti a terzi.',
          'Tentare di accedere a sistemi o dati del Servizio senza autorizzazione.',
          'Utilizzare il Servizio per attività illegali, fraudolente o lesive dei diritti di terzi.',
          'Condividere le credenziali di accesso o consentire l\'uso simultaneo del tuo account da parte di più persone.',
          'Sovraccaricare intenzionalmente l\'infrastruttura del Servizio con richieste massive o attacchi di negazione del servizio.',
        ]},
        { p: 'La violazione può comportare la sospensione o la chiusura immediata del tuo account, senza rimborso, e le azioni legali applicabili.' },
      ]},
      { t: 'Disponibilità e Limitazione di Responsabilità', b: [
        { p: 'Ci impegniamo a mantenere il Servizio costantemente disponibile ma non garantiamo una disponibilità del 100%. Possono verificarsi interruzioni per manutenzione programmata, guasti tecnici o cause di forza maggiore.' },
        { p: 'Nella misura massima consentita dalla legge applicabile, la Società non sarà responsabile per danni indiretti, incidentali, speciali, consequenziali o punitivi derivanti dall\'uso del Servizio, incluse le perdite finanziarie derivanti da decisioni di investimento. La responsabilità massima della Società è limitata all\'importo totale da te pagato nei 12 mesi precedenti l\'evento che ha dato origine alla contestazione.' },
      ]},
      { t: 'Modifiche', b: [
        { p: 'Ci riserviamo il diritto di modificare i presenti Termini in qualsiasi momento. Comunicheremo le modifiche sostanziali via email o con un avviso in piattaforma con almeno 15 giorni di anticipo. L\'uso continuato del Servizio dopo l\'entrata in vigore dei nuovi termini costituisce accettazione.' },
      ]},
      { t: 'Legge Applicabile e Foro Competente', b: [
        { p: 'I presenti Termini sono regolati dalle leggi degli Stati Uniti e, ove applicabile, dello Stato di costituzione della Società, fatte salve le norme imperative di tutela del consumatore del tuo Paese di residenza (in particolare all\'interno dell\'Unione Europea). Qualsiasi controversia che non possa essere risolta in via amichevole sarà sottoposta ai tribunali competenti secondo le norme applicabili.' },
      ]},
    ],
  },

  cookies: {
    title: 'Cookie Policy',
    sections: [
      { t: 'Cosa Sono i Cookie?', b: [
        { p: 'I cookie sono piccoli file di testo memorizzati sul tuo dispositivo quando visiti un sito web. Consentono al sito di ricordare le tue azioni e preferenze per un certo periodo, così non devi reinserire alcune informazioni mentre navighi o quando torni.' },
      ]},
      { t: 'Cookie Tecnici ed Essenziali (Non Richiedono Consenso)', b: [
        { p: 'Questi cookie sono strettamente necessari al funzionamento di base del Servizio (autenticazione sicura). Sono cookie httpOnly: nessuno script del browser può leggerli.' },
        { table: {
          head: ['Cookie', 'Finalità', 'Durata'],
          rows: [
            ['access_token', 'Mantenere la sessione autenticata (token di accesso, httpOnly)', '1 ora'],
            ['refresh_token', 'Rinnovare la sessione senza rifare il login (httpOnly)', '7 giorni'],
          ],
        }},
        { p: 'Usiamo inoltre l\'**archiviazione locale del browser (localStorage — non sono cookie)** per ricordare le preferenze sul tuo dispositivo: lingua selezionata, tema visivo, la tua scelta sul consenso ai cookie e lo stato dell\'interfaccia del tuo account. Questi dati non vengono trasmessi a terzi.' },
      ]},
      { t: 'Cookie Analitici (Richiedono Consenso)', b: [
        { p: 'Usiamo Google Analytics 4 per capire come gli utenti interagiscono con il Servizio e migliorarlo. Questi cookie vengono installati solo se hai dato il consenso tramite il banner dei cookie (Google Consent Mode v2, negato per impostazione predefinita).' },
        { table: {
          head: ['Cookie', 'Fornitore', 'Finalità', 'Durata'],
          rows: [
            ['_ga', 'Google Analytics', 'Distinguere gli utenti unici (ID anonimizzato)', '12 mesi'],
            ['_ga_*', 'Google Analytics', 'Mantenere lo stato della sessione di analisi', '12 mesi'],
          ],
        }},
        { p: 'Google Analytics 4 è configurato con anonimizzazione dell\'IP: l\'indirizzo IP viene troncato prima dell\'archiviazione. Attraverso questi cookie non viene trasmessa a Google alcuna informazione personalmente identificabile.' },
      ]},
      { t: 'Contenuti di Terzi Incorporati', b: [
        { p: 'Alcune pagine incorporano il grafico di **TradingView** tramite un iframe da tradingview.com. Quel contenuto è servito da TradingView e può installare cookie tecnici propri secondo la propria informativa sulla privacy e sui cookie. Non controlliamo quei cookie.' },
      ]},
      { t: 'Cookie Pubblicitari e di Tracciamento di Terzi', b: [
        { p: 'Mostriamo annunci di **Google AdSense** nelle sezioni gratuite del sito per finanziare i contenuti aperti. Gli annunci e i loro cookie vengono caricati solo se hai scelto «Accetta tutto» nel banner dei cookie — senza quel consenso, lo script di Google non viene nemmeno scaricato.' },
        { p: '**Con un abbonamento Premium attivo non vedrai pubblicità in nessuna parte del sito**, nemmeno leggendo i contenuti gratuiti: lo script di AdSense non viene mai caricato nel tuo browser e non viene installato alcun cookie pubblicitario.' },
        { p: 'Google può usare i cookie per personalizzare gli annunci in base alle tue visite a questo e ad altri siti. Puoi disattivare tale personalizzazione nelle [Impostazioni annunci di Google](https://adssettings.google.com), oppure rifiutarla qui scegliendo «Solo essenziali» nel banner.' },
      ]},
      { t: 'Come Gestire e Disattivare i Cookie', b: [
        { p: 'La maggior parte dei browser consente di controllare i cookie dalle proprie impostazioni:' },
        { list: [
          'Google Chrome: Impostazioni → Privacy e sicurezza → Cookie e altri dati dei siti.',
          'Mozilla Firefox: Impostazioni → Privacy e sicurezza → Cookie e dati dei siti web.',
          'Safari: Preferenze → Privacy → Gestisci dati dei siti web.',
          'Microsoft Edge: Impostazioni → Privacy, ricerca e servizi → Cookie e autorizzazioni sito.',
        ]},
        { p: 'Bloccare i cookie essenziali può impedirti di accedere. Per rifiutare specificamente Google Analytics, puoi installare il [componente aggiuntivo di disattivazione di Google Analytics](https://tools.google.com/dlpage/gaoptout).' },
      ]},
      { t: 'Consenso e Gestione delle Preferenze', b: [
        { p: 'Alla prima visita, un banner ti permette di accettare o rifiutare i cookie non essenziali; la tua scelta viene ricordata sul tuo dispositivo. Puoi modificare le tue preferenze in qualsiasi momento cancellando i dati del sito nel tuo browser o contattando {email}. La revoca del consenso non pregiudica la liceità del trattamento precedente.' },
      ]},
      { t: 'Aggiornamenti di questa Policy', b: [
        { p: 'Possiamo aggiornare questa Cookie Policy quando introduciamo nuove tecnologie o quando cambiano le norme applicabili. Comunicheremo le modifiche significative con un avviso in piattaforma o via email. La data di «Ultimo aggiornamento» indica la revisione più recente.' },
      ]},
    ],
  },

  risk: {
    title: 'Avvertenza sui Rischi',
    sections: [
      { t: 'I Dati Sono Chiari', b: [
        { p: '**Fare trading sui mercati finanziari comporta un elevato rischio di perdita. La grande maggioranza dei trader retail perde denaro.** Prima di operare con denaro vero, dovresti conoscere questi dati verificati e indipendenti. Non sono la nostra opinione: provengono da regolatori e studi accademici.' },
        { stat: { fig: '74–89 %', text: 'dei **conti retail in CFD perde denaro**, secondo il regolatore europeo (ESMA). La perdita media per cliente va da 1.600 € a 29.000 €. Per questo la legge impone a ogni broker di mostrare questa percentuale nella propria pubblicità.' } },
        { stat: { fig: '97 %', text: 'di chi ha **fatto day trading per più di 300 giorni** ha perso denaro (studio sul mercato dei futures brasiliano, 2013–2015). Solo l\'1,1 % ha guadagnato più del salario minimo e solo lo 0,5 % più dello stipendio iniziale di un impiegato di banca. Gli autori concludono che è «praticamente impossibile vivere di day trading».' } },
        { stat: { fig: '<1 %', text: 'dei day trader è **costantemente e prevedibilmente** profittevole, secondo gli studi classici sul mercato di Taiwan (Barber & Odean); circa l\'80 % perde denaro.' } },
      ]},
      { t: 'Cosa Significa per Te', b: [
        { list: [
          'La redditività sostenuta nel trading retail è rara: meno dell\'1–3 % la ottiene nel lungo periodo.',
          'I risultati passati non garantiscono né prevedono risultati futuri.',
          'Puoi perdere tutto il capitale investito. Con i prodotti a leva (CFD, futures, opzioni) le perdite possono avvenire molto rapidamente e persino superare il deposito iniziale.',
          'I costi (commissioni, spread, slippage e imposte) lavorano contro di te in modo cumulativo.',
          'I fattori psicologici e i bias comportamentali (eccesso di fiducia, trading di vendetta, overtrading) peggiorano i risultati della maggior parte delle persone.',
        ]},
      ]},
      { t: 'La Nostra Posizione', b: [
        { p: '**TradingCalculator.pro fornisce strumenti informativi ed educativi — non consulenza finanziaria, non segnali e nessuna promessa di redditività.** Mostriamo questi dati perché vogliamo che tu decida con informazioni veritiere. Opera solo con denaro che puoi permetterti di perdere e, se necessario, rivolgiti a un consulente finanziario debitamente autorizzato. Vedi anche i nostri {terms}.' },
      ]},
      { t: 'Fonti', b: [
        { list: [
          'ESMA (Autorità europea degli strumenti finanziari e dei mercati) — misure di intervento sui prodotti CFD: [esma.europa.eu](https://www.esma.europa.eu/press-news/esma-news/esma-adopts-final-product-intervention-measures-cfds-and-binary-options).',
          'Chague, De-Losso & Giovannetti (2020), «Day Trading for a Living?» — FGV/USP: [papers.ssrn.com](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3423101).',
          'Barber, Lee, Liu & Odean — ricerca sulla performance dei day trader nel mercato di Taiwan.',
        ]},
      ]},
    ],
  },
};

export default it;

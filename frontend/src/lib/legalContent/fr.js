/** Contenu juridique — FRANÇAIS (traduction de courtoisie ; la version espagnole prévaut). */
const fr = {
  meta: {
    updated: 'Juillet 2026',
    updatedLabel: 'Dernière mise à jour',
    courtesy: 'Ceci est une traduction de courtoisie. En cas de divergence, la version espagnole prévaut.',
  },

  privacy: {
    title: 'Politique de Confidentialité',
    sections: [
      { t: 'Responsable du Traitement', b: [
        { p: 'Le responsable du traitement de vos données personnelles est **TradingCalculator.pro**, exploité par une société à responsabilité limitée (LLC) enregistrée aux États-Unis. Pour toute question relative à la confidentialité, contactez-nous à {email}.' },
      ]},
      { t: 'Données que Nous Collectons', b: [
        { p: 'Nous ne collectons que les données nécessaires à la fourniture du service :' },
        { list: [
          'Données d’identification : nom et adresse e-mail, fournis lors de l’inscription ou via l’authentification Google (OAuth).',
          'Données d’utilisation : pages visitées, fonctionnalités utilisées (calculateur d’options, simulations, suivi des prix), préférences de thème et de langue.',
          'Données de paiement : traitées par des prestataires externes (Stripe, PayPal, Revolut et NOWPayments pour les cryptomonnaies). Nous ne stockons jamais de numéros de carte ni de coordonnées bancaires sur nos serveurs ; nous ne conservons que des identifiants client/transaction et l’état de l’abonnement.',
          'Journaux techniques (logs) : adresse IP, type de navigateur et système d’exploitation, à des fins de sécurité et de diagnostic.',
          'Données d’alertes de prix : actifs et seuils configurés, uniquement si vous activez cette fonctionnalité.',
          'Données du journal de trading et de l’AI Trade Coach : les opérations que vous enregistrez volontairement et, si vous utilisez l’AI Trade Coach, les paramètres de la stratégie analysée.',
        ]},
      ]},
      { t: 'Finalités du Traitement', b: [
        { p: 'Nous traitons vos données aux fins suivantes :' },
        { list: [
          'Fourniture du service : gestion de votre compte, accès aux outils de la plateforme (calculateur d’options, prix en temps réel, simulations) et personnalisation de l’expérience.',
          'Facturation et gestion des abonnements : traitement des paiements récurrents, gestion des formules (17 €/mois, 45 €/trimestre, 200 €/an, 500 € à vie) et émission des factures.',
          'Communications transactionnelles : confirmations de paiement, avis de renouvellement et notifications d’alertes de prix que vous configurez, envoyés via SendGrid.',
          'Sécurité et prévention de la fraude : détection des accès non autorisés et protection de l’intégrité du service.',
          'Analyse d’utilisation (avec votre consentement) : via Google Analytics 4 avec anonymisation de l’IP, pour améliorer la plateforme.',
          'Publicité dans le contenu gratuit (avec votre consentement) : via Google AdSense, pour financer les sections ouvertes. Les utilisateurs Premium ne voient aucune publicité.',
        ]},
      ]},
      { t: 'Base Légale du Traitement (RGPD)', b: [
        { p: 'Pour les utilisateurs de l’Espace économique européen, le traitement repose sur les bases légales suivantes du Règlement général sur la protection des données (RGPD) :' },
        { list: [
          'Art. 6(1)(b) RGPD — Exécution d’un contrat : le traitement est nécessaire pour fournir le service, gérer votre abonnement et traiter les paiements.',
          'Art. 6(1)(a) RGPD — Consentement : pour les cookies analytiques (Google Analytics 4) et les communications marketing optionnelles. Vous pouvez retirer votre consentement à tout moment. De même pour les cookies publicitaires de Google AdSense dans le contenu gratuit.',
          'Art. 6(1)(c) RGPD — Obligation légale : conservation des données de facturation selon la législation fiscale applicable.',
          'Art. 6(1)(f) RGPD — Intérêt légitime : sécurité du service et prévention de la fraude.',
        ]},
      ]},
      { t: 'Tiers Recevant vos Données', b: [
        { p: 'Nous partageons des données avec les prestataires suivants, uniquement dans la mesure nécessaire :' },
        { list: [
          'Stripe, Inc. (paiements carte et SEPA) : traite les paiements d’abonnement. Agit en responsable indépendant pour les données de paiement. Politique : stripe.com/privacy.',
          'PayPal, Inc. (paiements) : traite les paiements PayPal selon sa propre politique de confidentialité.',
          'Revolut (Revolut Pay, avec Apple Pay/Google Pay dans son checkout) : traite les paiements Revolut Pay.',
          'NOWPayments (paiements en cryptomonnaies) : traite les paiements crypto. Reçoit le montant, un identifiant de commande et, le cas échéant, votre e-mail pour le reçu.',
          'Google LLC (OAuth et Analytics) : la connexion Google transfère nom et e-mail. Google Analytics 4 est utilisé avec anonymisation de l’IP et uniquement avec votre consentement. Politique : policies.google.com/privacy. Google AdSense diffuse des annonces dans le contenu gratuit, uniquement avec votre consentement et jamais aux utilisateurs Premium.',
          'Twilio SendGrid (e-mails transactionnels) : envoi des confirmations, factures et alertes. Ne reçoit que votre adresse e-mail.',
          'Anthropic (AI Trade Coach) : lorsque vous demandez une analyse IA, les paramètres de la stratégie analysée (actif, jambes, prix) sont envoyés à Anthropic. Votre nom et votre e-mail ne sont pas transmis avec la requête.',
        ]},
        { p: 'Les prestataires sont liés par des accords de traitement des données ou s’appuient sur des mécanismes de transfert international valides (clauses contractuelles types ou autres mécanismes reconnus).' },
      ]},
      { t: 'Vos Droits (RGPD)', b: [
        { p: 'Si vous êtes dans l’UE/EEE, vous disposez des droits suivants :' },
        { list: [
          'Droit d’accès (art. 15 RGPD) : demander une copie des données personnelles que nous traitons.',
          'Droit de rectification (art. 16 RGPD) : corriger des données inexactes ou incomplètes depuis les réglages de votre compte.',
          'Droit à l’effacement (art. 17 RGPD) : demander la suppression de votre compte et de vos données, sauf obligation légale de conservation.',
          'Droit à la portabilité (art. 20 RGPD) : demander un export de vos données dans un format structuré et lisible par machine.',
          'Droit d’opposition (art. 21 RGPD) : vous opposer à tout moment au traitement fondé sur l’intérêt légitime.',
          'Droit de retirer votre consentement : sans affecter la licéité du traitement antérieur.',
          'Droit d’introduire une réclamation auprès de l’autorité de contrôle de votre pays de résidence dans l’UE (en France, la CNIL ; en Espagne, l’AEPD).',
        ]},
        { p: 'Pour exercer ces droits, écrivez à {email} en précisant le droit concerné. Nous répondons sous 30 jours au maximum.' },
      ]},
      { t: 'Durées de Conservation', b: [
        { list: [
          'Données de compte (nom, e-mail, préférences) : conservées tant que le compte est actif. Supprimées dans les 30 jours suivant la demande de suppression.',
          'Journaux techniques : 90 jours, à des fins de sécurité et de diagnostic.',
          'Données de paiement et de facturation : conservées pendant la durée exigée par les obligations fiscales et comptables applicables (jusqu’à 10 ans selon la juridiction).',
          'Données analytiques (Google Analytics 4) : 14 mois maximum, avec IP anonymisée.',
        ]},
      ]},
      { t: 'Sécurité des Données', b: [
        { p: 'Nous appliquons des mesures techniques et organisationnelles appropriées pour protéger vos données contre l’accès non autorisé, la perte ou la divulgation : chiffrement en transit (TLS/HTTPS), contrôle d’accès basé sur les rôles et revues de sécurité périodiques. Les paiements sont protégés par l’infrastructure PCI DSS des prestataires de paiement.' },
      ]},
      { t: 'Transferts Internationaux', b: [
        { p: 'La Société est établie aux États-Unis et certains prestataires (Google, Stripe, SendGrid, Anthropic) traitent des données hors de l’Espace économique européen. Dans ces cas, nous veillons à l’existence de garanties appropriées, telles que des clauses contractuelles types approuvées par la Commission européenne ou d’autres mécanismes valides.' },
      ]},
      { t: 'Cookies', b: [
        { p: 'Nous utilisons des cookies et technologies similaires. Pour plus de détails, consultez notre Politique de Cookies dans l’onglet correspondant de cette page.' },
      ]},
    ],
  },

  terms: {
    title: 'Conditions d’Utilisation',
    sections: [
      { t: 'Acceptation des Conditions', b: [
        { p: 'En accédant à TradingCalculator.pro (le « Service ») et en l’utilisant, vous acceptez d’être lié par ces Conditions d’Utilisation. Si vous êtes en désaccord avec l’une d’elles, vous devez vous abstenir d’utiliser le Service. Ces conditions constituent un accord juridiquement contraignant entre vous et la société à responsabilité limitée (LLC) enregistrée aux États-Unis qui exploite TradingCalculator.pro (la « Société »).' },
      ]},
      { t: 'Nature du Service — Pas de Conseil Financier', b: [
        { p: 'TradingCalculator.pro est une plateforme d’outils d’information financière : calculateurs d’options (Black-Scholes, grecques), prix d’actifs en temps réel et simulations de stratégies. Le Service a un caractère exclusivement informatif et éducatif.' },
        { p: '**AVIS IMPORTANT : TradingCalculator.pro ne fournit AUCUN conseil financier, d’investissement, fiscal ou juridique. Aucun contenu de la plateforme ne doit être interprété comme une recommandation d’achat, de vente ou de conservation d’un instrument financier.**' },
        { p: 'Les résultats passés ne garantissent ni ne prédisent les résultats futurs. Tout investissement dans des instruments financiers, y compris les options, comporte un risque important de perte, pouvant aller jusqu’à la totalité du capital investi. Vous êtes seul responsable de vos décisions d’investissement. Consultez un conseiller financier professionnel avant de trader.' },
      ]},
      { t: 'Inscription et Compte Utilisateur', b: [
        { p: 'Un compte est nécessaire pour accéder aux fonctionnalités. Vous êtes responsable de la confidentialité de vos identifiants et de toute activité effectuée sous votre compte. Signalez-nous immédiatement tout usage non autorisé à {email}. Vous devez avoir au moins 18 ans pour vous inscrire et utiliser le Service.' },
      ]},
      { t: 'Formules d’Abonnement, Essai Gratuit et Paiements', b: [
        { p: 'Les formules disponibles sont :' },
        { list: [
          'Formule mensuelle : 17 €/mois, renouvellement automatique chaque mois.',
          'Formule trimestrielle : 45 €/trimestre, renouvellement automatique tous les 3 mois.',
          'Formule annuelle : 200 €/an, renouvellement automatique tous les 12 mois.',
          'Formule à vie (Lifetime) : 500 €, paiement unique, accès permanent sans renouvellement.',
        ]},
        { p: '**Essai gratuit de 7 jours** (formules récurrentes uniquement, nouveaux abonnés uniquement) : un moyen de paiement valide est demandé au démarrage. Si vous n’annulez pas avant la fin de l’essai, le premier prélèvement de la formule choisie est effectué automatiquement. Vous pouvez annuler pendant l’essai, sans frais, depuis « Mon Abonnement ».' },
        { p: 'Les paiements sont traités de manière sécurisée via **Stripe** (carte, SEPA, Klarna et portefeuilles comme Apple Pay/Google Pay), **PayPal**, **Revolut Pay** et **NOWPayments** (cryptomonnaies). Les prix sont indiqués en euros (EUR), taxes applicables incluses le cas échéant. En souscrivant une formule à renouvellement automatique, vous autorisez les prélèvements récurrents jusqu’à annulation. Vous pouvez annuler à tout moment depuis « Mon Abonnement » ; l’accès est maintenu jusqu’à la fin de la période de facturation en cours.' },
      ]},
      { t: 'Politique de Remboursement', b: [
        { list: [
          'Formule mensuelle (17 €/mois) : remboursement intégral dans les 14 jours calendaires suivant l’activation, à condition de ne pas avoir fait un usage significatif des fonctionnalités premium.',
          'Formule trimestrielle (45 €/trimestre) : remboursement intégral dans les 14 jours calendaires, aux mêmes conditions.',
          'Formule annuelle (200 €/an) : remboursement intégral dans les 14 jours calendaires, aux mêmes conditions.',
          'Formule à vie (500 €) : non remboursable une fois le paiement effectué, sans préjudice des droits impératifs dont vous bénéficiez en tant que consommateur selon la législation de votre pays de résidence.',
        ]},
        { p: 'Pour demander un remboursement, contactez-nous à {email} dans le délai applicable. Les remboursements sont effectués sur le moyen de paiement d’origine sous 5 à 10 jours ouvrés. **Paiements en cryptomonnaies :** ces transactions étant irréversibles, les remboursements approuvés sont versés en euros par un moyen alternatif équivalent. Cette politique ne limite pas vos droits de consommateur selon la législation de votre pays de résidence dans l’UE.' },
      ]},
      { t: 'Propriété Intellectuelle', b: [
        { p: 'Tout le contenu du Service — code source, algorithmes, design de l’interface, textes, graphiques, logos et bases de données — est la propriété exclusive de la Société et est protégé par les lois applicables en matière de propriété intellectuelle. Une licence limitée, non exclusive, non transférable et révocable vous est accordée pour un usage strictement personnel et non commercial.' },
      ]},
      { t: 'Usages Interdits', b: [
        { p: 'Il est expressément interdit de :' },
        { list: [
          'Faire de l’ingénierie inverse, décompiler ou désassembler toute partie du Service.',
          'Utiliser des scrapers, bots, crawlers ou autres outils automatisés pour extraire des données.',
          'Revendre, sous-licencier ou redistribuer le Service ou ses contenus à des tiers.',
          'Tenter d’accéder sans autorisation aux systèmes ou données du Service.',
          'Utiliser le Service pour des activités illégales, frauduleuses ou portant atteinte aux droits de tiers.',
          'Partager vos identifiants ou permettre l’utilisation simultanée de votre compte par plusieurs personnes.',
          'Surcharger intentionnellement l’infrastructure par des requêtes massives ou des attaques par déni de service.',
        ]},
        { p: 'Tout manquement peut entraîner la suspension ou la résiliation immédiate de votre compte, sans remboursement, ainsi que des poursuites le cas échéant.' },
      ]},
      { t: 'Disponibilité et Limitation de Responsabilité', b: [
        { p: 'Nous nous efforçons de maintenir le Service disponible en continu, sans garantir une disponibilité de 100 %. Des interruptions peuvent survenir pour maintenance programmée, incident technique ou force majeure.' },
        { p: 'Dans la mesure maximale permise par la loi applicable, la Société ne saurait être tenue responsable de dommages indirects, accessoires, spéciaux, consécutifs ou punitifs résultant de l’utilisation du Service, y compris des pertes financières liées à des décisions d’investissement. La responsabilité maximale de la Société est limitée au montant total que vous avez payé au cours des 12 mois précédant l’événement à l’origine de la réclamation.' },
      ]},
      { t: 'Modifications', b: [
        { p: 'Nous nous réservons le droit de modifier ces Conditions à tout moment. Les changements substantiels seront notifiés par e-mail ou avis sur la plateforme au moins 15 jours à l’avance. La poursuite de l’utilisation après l’entrée en vigueur vaut acceptation.' },
      ]},
      { t: 'Droit Applicable et Juridiction', b: [
        { p: 'Ces Conditions sont régies par le droit des États-Unis et, le cas échéant, par celui de l’État de constitution de la Société, sans préjudice des règles impératives de protection des consommateurs de votre pays de résidence (notamment au sein de l’Union européenne). Tout litige ne pouvant être résolu à l’amiable sera soumis aux tribunaux compétents selon les règles applicables.' },
      ]},
    ],
  },

  cookies: {
    title: 'Politique de Cookies',
    sections: [
      { t: 'Que sont les Cookies ?', b: [
        { p: 'Les cookies sont de petits fichiers texte stockés sur votre appareil lors de la visite d’un site web. Ils permettent au site de mémoriser vos actions et préférences pendant un certain temps, pour vous éviter de ressaisir certaines informations à chaque navigation.' },
      ]},
      { t: 'Cookies Techniques et Essentiels (Sans Consentement)', b: [
        { p: 'Ces cookies sont strictement nécessaires au fonctionnement de base du Service (authentification sécurisée). Ce sont des cookies httpOnly : aucun script du navigateur ne peut les lire.' },
        { table: {
          head: ['Cookie', 'Finalité', 'Durée'],
          rows: [
            ['access_token', 'Maintenir votre session authentifiée (jeton d’accès, httpOnly)', '1 heure'],
            ['refresh_token', 'Renouveler la session sans nouvelle connexion (httpOnly)', '7 jours'],
          ],
        }},
        { p: 'Nous utilisons aussi le **stockage local du navigateur (localStorage — ce ne sont pas des cookies)** pour mémoriser des préférences sur votre appareil : langue choisie, thème visuel, votre choix de consentement aux cookies et l’état de l’interface de votre compte. Ces données ne sont pas transmises à des tiers.' },
      ]},
      { t: 'Cookies Analytiques (Consentement Requis)', b: [
        { p: 'Nous utilisons Google Analytics 4 pour comprendre l’utilisation du Service et l’améliorer. Ces cookies ne sont déposés que si vous avez donné votre consentement via le bandeau (Google Consent Mode v2, refusé par défaut).' },
        { table: {
          head: ['Cookie', 'Fournisseur', 'Finalité', 'Durée'],
          rows: [
            ['_ga', 'Google Analytics', 'Distinguer les utilisateurs uniques (ID anonymisé)', '12 mois'],
            ['_ga_*', 'Google Analytics', 'Maintenir l’état de la session analytique', '12 mois'],
          ],
        }},
        { p: 'Google Analytics 4 est configuré avec l’anonymisation de l’IP : l’adresse IP est tronquée avant stockage. Aucune information personnellement identifiable n’est transmise à Google via ces cookies.' },
      ]},
      { t: 'Contenus Tiers Intégrés', b: [
        { p: 'Certaines pages intègrent le graphique **TradingView** via un iframe de tradingview.com. Ce contenu est servi par TradingView, qui peut déposer ses propres cookies techniques selon sa propre politique. Nous ne contrôlons pas ces cookies.' },
      ]},
      { t: 'Cookies Publicitaires et Traçage Tiers', b: [
        { p: 'Nous affichons des annonces **Google AdSense** dans les sections gratuites du site afin de financer le contenu ouvert. Les annonces et leurs cookies ne sont chargés que si vous avez choisi « Tout accepter » dans le bandeau — sans ce consentement, le script de Google n’est même pas téléchargé.' },
        { p: '**Avec un abonnement Premium actif, vous ne verrez aucune publicité sur le site**, y compris dans le contenu gratuit : le script AdSense n’est pas chargé dans votre navigateur et aucun cookie publicitaire n’est déposé.' },
        { p: 'Google peut utiliser des cookies pour personnaliser les annonces selon vos visites sur ce site et sur d’autres. Vous pouvez désactiver cette personnalisation dans les [paramètres des annonces Google](https://adssettings.google.com), ou la refuser ici en choisissant « Essentiels uniquement ».' },
      ]},
      { t: 'Gérer et Désactiver les Cookies', b: [
        { p: 'La plupart des navigateurs permettent de contrôler les cookies dans leurs réglages :' },
        { list: [
          'Google Chrome : Paramètres → Confidentialité et sécurité → Cookies et autres données de site.',
          'Mozilla Firefox : Paramètres → Vie privée et sécurité → Cookies et données de sites.',
          'Safari : Préférences → Confidentialité → Gérer les données de sites web.',
          'Microsoft Edge : Paramètres → Confidentialité, recherche et services → Cookies et autorisations de site.',
        ]},
        { p: 'Bloquer les cookies essentiels peut empêcher la connexion. Pour refuser spécifiquement Google Analytics, vous pouvez installer le [module de désactivation de Google Analytics](https://tools.google.com/dlpage/gaoptout).' },
      ]},
      { t: 'Consentement et Gestion des Préférences', b: [
        { p: 'Lors de votre première visite, un bandeau vous permet d’accepter ou refuser les cookies non essentiels ; votre choix est mémorisé sur votre appareil. Vous pouvez modifier vos préférences à tout moment en effaçant les données du site dans votre navigateur ou en écrivant à {email}. Le retrait du consentement n’affecte pas la licéité du traitement antérieur.' },
      ]},
      { t: 'Mises à Jour de cette Politique', b: [
        { p: 'Nous pouvons mettre à jour cette Politique de Cookies en cas de nouvelles technologies ou d’évolution réglementaire. Les changements significatifs seront notifiés par avis sur la plateforme ou par e-mail. La date de « Dernière mise à jour » indique la dernière révision.' },
      ]},
    ],
  },

  risk: {
    title: 'Avertissement sur les Risques',
    sections: [
      { t: 'Les Chiffres Parlent d’Eux-Mêmes', b: [
        { p: '**Trader sur les marchés financiers comporte un risque élevé de perte. La grande majorité des traders particuliers perdent de l’argent.** Avant de trader avec de l’argent réel, vous devriez connaître ces chiffres vérifiés et indépendants. Ce n’est pas notre opinion : ce sont des chiffres de régulateurs et d’études académiques.' },
        { stat: { fig: '74–89%', text: 'des **comptes CFD de particuliers perdent de l’argent**, selon le régulateur européen (ESMA). La perte moyenne par client se situe entre 1 600 € et 29 000 €. C’est pourquoi la loi oblige chaque courtier à afficher ce pourcentage dans sa publicité.' } },
        { stat: { fig: '97%', text: 'de ceux qui ont fait du **day trading pendant plus de 300 jours** ont perdu de l’argent (étude sur le marché des futures au Brésil, 2013–2015). Seuls 1,1 % ont gagné plus que le salaire minimum et seuls 0,5 % plus que le salaire de départ d’un guichetier de banque. Les auteurs concluent qu’il est « pratiquement impossible de vivre du day trading ».' } },
        { stat: { fig: '<1%', text: 'des day traders sont rentables de manière **constante et prévisible**, selon les études classiques sur le marché de Taïwan (Barber & Odean) ; environ 80 % perdent de l’argent.' } },
      ]},
      { t: 'Ce que Cela Signifie pour Vous', b: [
        { list: [
          'La rentabilité durable dans le trading particulier est rare : moins de 1 à 3 % y parviennent sur le long terme.',
          'Les résultats passés ne garantissent ni ne prédisent les résultats futurs.',
          'Vous pouvez perdre la totalité du capital investi. Sur les produits à effet de levier (CFD, futures, options), les pertes peuvent survenir très vite et même dépasser le dépôt initial.',
          'Les coûts (commissions, spreads, slippage et impôts) jouent contre vous de façon cumulative.',
          'Les facteurs psychologiques et les biais comportementaux (excès de confiance, revenge trading, surtrading) détériorent les résultats de la plupart.',
        ]},
      ]},
      { t: 'Notre Position', b: [
        { p: '**TradingCalculator.pro fournit des outils d’information et d’éducation — pas de conseil financier, pas de signaux, pas de promesses de rentabilité.** Nous montrons ces chiffres pour que vous décidiez avec une information véridique. Ne tradez qu’avec de l’argent que vous pouvez vous permettre de perdre et, si besoin, consultez un conseiller financier dûment agréé. Consultez aussi nos {terms}.' },
      ]},
      { t: 'Sources', b: [
        { list: [
          'ESMA (Autorité européenne des marchés financiers) — mesures d’intervention sur les CFD : [esma.europa.eu](https://www.esma.europa.eu/press-news/esma-news/esma-adopts-final-product-intervention-measures-cfds-and-binary-options).',
          'Chague, De-Losso & Giovannetti (2020), « Day Trading for a Living? » — FGV/USP : [papers.ssrn.com](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3423101).',
          'Barber, Lee, Liu & Odean — recherches sur la performance des day traders sur le marché de Taïwan.',
        ]},
      ]},
    ],
  },
};

export default fr;

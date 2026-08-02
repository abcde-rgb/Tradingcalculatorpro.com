/** Legal content — PORTUGUÊS (tradução de cortesia; prevalece a versão em espanhol). */
const pt = {
  meta: {
    updated: 'Julho de 2026',
    updatedLabel: 'Última atualização',
    courtesy: 'Esta é uma tradução de cortesia. Em caso de qualquer discrepância, prevalece a versão em espanhol.',
  },

  privacy: {
    title: 'Política de Privacidade',
    sections: [
      { t: 'Responsável pelo Tratamento', b: [
        { p: 'O responsável pelos seus dados pessoais é a **TradingCalculator.pro**, operada por uma sociedade de responsabilidade limitada (LLC) registada nos Estados Unidos. Para qualquer questão de privacidade, contacte-nos em {email}.' },
      ]},
      { t: 'Dados que Recolhemos', b: [
        { p: 'Recolhemos apenas os dados necessários para prestar o serviço:' },
        { list: [
          'Dados de identificação: nome e endereço de email, fornecidos no registo ou através da autenticação da Google (OAuth).',
          'Dados de utilização: páginas visitadas, funcionalidades usadas (calculadora de opções, simulações, seguimento de preços), preferências de tema e idioma.',
          'Dados de pagamento: processados por fornecedores de pagamento externos (Stripe, PayPal, Revolut e NOWPayments para criptomoedas). Nunca guardamos números de cartão nem dados bancários nos nossos servidores; guardamos apenas identificadores de cliente/transação e o estado da subscrição.',
          'Registos técnicos: endereço IP, tipo de navegador e sistema operativo, para segurança e diagnóstico.',
          'Dados de alertas de preço: pares de ativos e limiares que configurar, apenas se ativar esta funcionalidade.',
          'Dados do diário de trading e do AI Trade Coach: as operações que registar voluntariamente e, se usar o AI Trade Coach, os parâmetros da estratégia analisada.',
        ]},
      ]},
      { t: 'Finalidades do Tratamento', b: [
        { p: 'Tratamos os seus dados para as seguintes finalidades:' },
        { list: [
          'Prestação do serviço: gerir a sua conta, o acesso às ferramentas da plataforma (calculadora de opções, preços em tempo real, simulações) e personalizar a experiência.',
          'Faturação e gestão da subscrição: processar pagamentos recorrentes, gerir planos (17 €/mês, 45 €/trimestre, 200 €/ano, 500 € vitalício) e emitir faturas.',
          'Comunicações transacionais: confirmações de pagamento, avisos de renovação e notificações dos alertas de preço que configurar, enviados através da SendGrid.',
          'Segurança e prevenção de fraude: detetar acessos não autorizados e proteger a integridade do serviço.',
          'Analítica de utilização do serviço (com o seu consentimento): através do Google Analytics 4 com anonimização de IP, para melhorar a plataforma.',
        ]},
      ]},
      { t: 'Base Jurídica do Tratamento (RGPD)', b: [
        { p: 'Para utilizadores no Espaço Económico Europeu, o tratamento assenta nas seguintes bases jurídicas ao abrigo do Regulamento Geral sobre a Proteção de Dados (RGPD):' },
        { list: [
          'Art. 6.º, n.º 1, al. b) do RGPD — Execução de um contrato: o tratamento é necessário para prestar o serviço contratado, gerir a sua subscrição e processar pagamentos.',
          'Art. 6.º, n.º 1, al. a) do RGPD — Consentimento: para os cookies analíticos (Google Analytics 4) e comunicações de marketing opcionais. Pode retirar o consentimento a qualquer momento.',
          'Art. 6.º, n.º 1, al. c) do RGPD — Obrigação legal: conservação dos dados de faturação ao abrigo da legislação fiscal aplicável.',
          'Art. 6.º, n.º 1, al. f) do RGPD — Interesse legítimo: segurança do serviço e prevenção de fraude.',
        ]},
      ]},
      { t: 'Terceiros que Recebem os Seus Dados', b: [
        { p: 'Partilhamos dados com os seguintes prestadores de serviços, apenas na medida necessária para prestar o serviço:' },
        { list: [
          'Stripe, Inc. (pagamentos com cartão e SEPA): processa os pagamentos da subscrição. Atua como responsável independente pelos dados de pagamento. Política: stripe.com/privacy.',
          'PayPal, Inc. (pagamentos): processa os pagamentos feitos com PayPal ao abrigo da sua própria política de privacidade.',
          'Revolut (Revolut Pay, inclui Apple Pay/Google Pay no seu checkout): processa os pagamentos feitos com Revolut Pay.',
          'NOWPayments (pagamentos em criptomoeda): processa os pagamentos em cripto. Recebe o montante, um identificador de encomenda e, quando aplicável, o seu email para o recibo.',
          'Google LLC (OAuth e Analytics): o início de sessão com Google OAuth transfere o seu nome e email. O Google Analytics 4 é usado com anonimização de IP e apenas com o seu consentimento. Política: policies.google.com/privacy.',
          'Twilio SendGrid (email transacional): envia confirmações, faturas e alertas. Recebe apenas o seu endereço de email.',
          'Anthropic (AI Trade Coach): quando pede uma análise de IA, os parâmetros da estratégia analisada (ativo, pernas da operação, preços) são enviados à Anthropic. O seu nome e email não são enviados com a consulta.',
        ]},
        { p: 'Os prestadores estão vinculados por contratos de subcontratação de dados ou recorrem a mecanismos válidos de transferência internacional (cláusulas contratuais-tipo ou outros mecanismos reconhecidos).' },
      ]},
      { t: 'Os Seus Direitos enquanto Titular dos Dados (RGPD)', b: [
        { p: 'Se estiver na UE/EEE, tem os seguintes direitos:' },
        { list: [
          'Direito de acesso (art. 15.º do RGPD): pedir uma cópia dos dados pessoais que tratamos sobre si.',
          'Direito de retificação (art. 16.º do RGPD): corrigir dados inexatos ou incompletos a qualquer momento a partir das definições da sua conta.',
          'Direito ao apagamento (art. 17.º do RGPD): pedir a eliminação da sua conta e dos seus dados pessoais, salvo se existir uma obrigação legal de conservação.',
          'Direito à portabilidade dos dados (art. 20.º do RGPD): pedir uma exportação dos seus dados num formato estruturado e legível por máquina.',
          'Direito de oposição (art. 21.º do RGPD): opor-se a qualquer momento ao tratamento baseado em interesse legítimo.',
          'Direito de retirar o consentimento: sem afetar a licitude do tratamento anterior.',
          'Direito de apresentar reclamação à autoridade de controlo do seu país de residência na UE (em Portugal, a CNPD).',
        ]},
        { p: 'Para exercer qualquer destes direitos, envie um email para {email} indicando o direito que pretende exercer. Respondemos no prazo de 30 dias.' },
      ]},
      { t: 'Prazos de Conservação', b: [
        { list: [
          'Dados da conta (nome, email, preferências): conservados enquanto a conta estiver ativa. Eliminados no prazo de 30 dias após um pedido de eliminação.',
          'Registos técnicos: 90 dias, para segurança e diagnóstico.',
          'Dados de pagamento e faturação: conservados durante o período exigido pelas obrigações fiscais e contabilísticas aplicáveis (até 10 anos consoante a jurisdição).',
          'Dados analíticos (Google Analytics 4): máximo de 14 meses, com IP anonimizado.',
        ]},
      ]},
      { t: 'Segurança dos Dados', b: [
        { p: 'Aplicamos medidas técnicas e organizativas adequadas para proteger os seus dados pessoais contra acessos não autorizados, perda ou divulgação: encriptação em trânsito (TLS/HTTPS), controlo de acessos baseado em funções e revisões de segurança periódicas. Os pagamentos estão protegidos pela infraestrutura PCI DSS dos fornecedores de pagamento.' },
      ]},
      { t: 'Transferências Internacionais', b: [
        { p: 'A Empresa está estabelecida nos Estados Unidos e alguns prestadores (Google, Stripe, SendGrid, Anthropic) tratam dados fora do Espaço Económico Europeu. Nesses casos asseguramos garantias adequadas, como as cláusulas contratuais-tipo aprovadas pela Comissão Europeia ou outros mecanismos válidos de transferência.' },
      ]},
      { t: 'Cookies', b: [
        { p: 'Utilizamos cookies e tecnologias semelhantes. Para mais detalhes, consulte a nossa Política de Cookies no separador correspondente desta página.' },
      ]},
    ],
  },

  terms: {
    title: 'Termos de Utilização',
    sections: [
      { t: 'Aceitação dos Termos', b: [
        { p: 'Ao aceder e utilizar o TradingCalculator.pro (o «Serviço»), concorda em ficar vinculado a estes Termos de Utilização. Se discordar de alguma condição aqui estabelecida, deve abster-se de utilizar o Serviço. Estes termos constituem um acordo juridicamente vinculativo entre si e a sociedade de responsabilidade limitada (LLC) registada nos Estados Unidos que opera o TradingCalculator.pro (a «Empresa»).' },
      ]},
      { t: 'Natureza do Serviço — Não é Aconselhamento Financeiro', b: [
        { p: 'O TradingCalculator.pro é uma plataforma de ferramentas de informação financeira que inclui calculadoras de opções (Black-Scholes, gregas), preços de ativos em tempo real e simulações de estratégias. O Serviço é estritamente informativo e educativo.' },
        { p: '**AVISO IMPORTANTE: O TradingCalculator.pro NÃO presta aconselhamento financeiro, de investimento, fiscal ou jurídico. Nada na plataforma deve ser interpretado como uma recomendação de compra, venda ou manutenção de qualquer instrumento financeiro.**' },
        { p: 'Os resultados passados não garantem nem preveem resultados futuros. Investir em instrumentos financeiros, incluindo opções, comporta um risco significativo de perda; pode perder todo o capital investido. É o único responsável pelas suas decisões de investimento. Consulte um consultor financeiro profissional antes de operar.' },
      ]},
      { t: 'Registo e Conta de Utilizador', b: [
        { p: 'É necessária uma conta para aceder às funcionalidades da plataforma. É responsável por manter as suas credenciais confidenciais e por toda a atividade realizada na sua conta. Notifique-nos de imediato de qualquer utilização não autorizada através de {email}. Tem de ter pelo menos 18 anos para se registar e utilizar o Serviço.' },
      ]},
      { t: 'Planos de Subscrição, Período Gratuito e Pagamentos', b: [
        { p: 'Os planos disponíveis são:' },
        { list: [
          'Plano mensal: 17 €/mês, com renovação automática todos os meses.',
          'Plano trimestral: 45 €/trimestre, com renovação automática a cada 3 meses.',
          'Plano anual: 200 €/ano, com renovação automática a cada 12 meses.',
          'Plano vitalício: 500 €, pagamento único, acesso permanente sem renovações.',
        ]},
        { p: '**Período gratuito de 7 dias** (apenas planos recorrentes e apenas para novos subscritores): é necessário um meio de pagamento válido para o iniciar. Se não cancelar antes do fim do período gratuito, a primeira cobrança do plano escolhido é efetuada automaticamente. Pode cancelar durante o período gratuito sem qualquer custo a partir de «A minha subscrição».' },
        { p: 'Os pagamentos são processados em segurança através da **Stripe** (cartão, SEPA, Klarna e carteiras como Apple Pay/Google Pay), do **PayPal**, do **Revolut Pay** e da **NOWPayments** (criptomoedas). Os preços são apresentados em euros (EUR) e incluem os impostos aplicáveis quando relevante. Ao subscrever um plano de renovação automática autoriza cobranças recorrentes ao seu meio de pagamento até que cancele. Pode cancelar a qualquer momento a partir de «A minha subscrição»; o acesso mantém-se até ao final do período de faturação em curso.' },
      ]},
      { t: 'Política de Reembolso', b: [
        { list: [
          'Plano mensal (17 €/mês): reembolso integral nos primeiros 14 dias de calendário após a ativação, desde que não tenha feito uma utilização significativa das funcionalidades premium.',
          'Plano trimestral (45 €/trimestre): reembolso integral nos primeiros 14 dias de calendário após a ativação, nas mesmas condições.',
          'Plano anual (200 €/ano): reembolso integral nos primeiros 14 dias de calendário após a ativação, nas mesmas condições.',
          'Plano vitalício (500 €): não reembolsável depois de pago, sem prejuízo dos direitos de consumidor irrenunciáveis ao abrigo da lei do seu país de residência.',
        ]},
        { p: 'Para solicitar um reembolso, contacte-nos em {email} dentro do prazo aplicável. Os reembolsos são emitidos para o meio de pagamento original no prazo de 5 a 10 dias úteis. **Pagamentos em criptomoeda:** dado que estas transações são irreversíveis, os reembolsos aprovados são pagos em euros através de um meio alternativo equivalente. Esta política não limita os seus direitos de consumidor ao abrigo da lei do seu país de residência na UE.' },
      ]},
      { t: 'Propriedade Intelectual', b: [
        { p: 'Todo o conteúdo do Serviço — incluindo o código-fonte, os algoritmos, o desenho da interface, os textos, os gráficos, os logótipos e as bases de dados — é propriedade exclusiva da Empresa e está protegido pela legislação de propriedade intelectual aplicável. É-lhe concedida uma licença limitada, não exclusiva, intransmissível e revogável para utilizar o Serviço exclusivamente para fins pessoais e não comerciais.' },
      ]},
      { t: 'Utilizações Proibidas', b: [
        { p: 'É expressamente proibido:' },
        { list: [
          'Fazer engenharia inversa, descompilar ou desmontar qualquer parte do Serviço.',
          'Utilizar scrapers, bots, crawlers ou outras ferramentas automatizadas para extrair dados da plataforma.',
          'Revender, sublicenciar ou redistribuir o Serviço ou os seus conteúdos a terceiros.',
          'Tentar aceder a sistemas ou dados do Serviço sem autorização.',
          'Utilizar o Serviço para atividades ilegais, fraudulentas ou que violem direitos de terceiros.',
          'Partilhar credenciais de acesso ou permitir a utilização simultânea da sua conta por várias pessoas.',
          'Sobrecarregar intencionalmente a infraestrutura do Serviço através de pedidos em massa ou ataques de negação de serviço.',
        ]},
        { p: 'O incumprimento pode levar à suspensão ou cessação imediata da sua conta, sem reembolso, e às ações legais aplicáveis.' },
      ]},
      { t: 'Disponibilidade e Limitação de Responsabilidade', b: [
        { p: 'Esforçamo-nos por manter o Serviço continuamente disponível, mas não garantimos 100 % de disponibilidade. Podem ocorrer interrupções por manutenção programada, falhas técnicas ou casos de força maior.' },
        { p: 'Na medida máxima permitida pela lei aplicável, a Empresa não será responsável por quaisquer danos indiretos, incidentais, especiais, consequenciais ou punitivos decorrentes da utilização do Serviço, incluindo perdas financeiras resultantes de decisões de investimento. A responsabilidade máxima da Empresa está limitada ao montante total que pagou nos 12 meses anteriores ao facto que dá origem à reclamação.' },
      ]},
      { t: 'Alterações', b: [
        { p: 'Reservamo-nos o direito de alterar estes Termos a qualquer momento. Notificaremos as alterações relevantes por email ou por aviso na plataforma com pelo menos 15 dias de antecedência. A continuação da utilização do Serviço após a entrada em vigor dos novos termos constitui aceitação.' },
      ]},
      { t: 'Lei Aplicável e Jurisdição', b: [
        { p: 'Estes Termos regem-se pelas leis dos Estados Unidos e, quando aplicável, do estado de constituição da Empresa, sem prejuízo das normas imperativas de proteção do consumidor do seu país de residência (em particular na União Europeia). Qualquer litígio que não possa ser resolvido amigavelmente será submetido aos tribunais competentes ao abrigo das regras aplicáveis.' },
      ]},
    ],
  },

  cookies: {
    title: 'Política de Cookies',
    sections: [
      { t: 'O que são Cookies?', b: [
        { p: 'Os cookies são pequenos ficheiros de texto guardados no seu dispositivo quando visita um site. Permitem que o site se lembre das suas ações e preferências durante um período de tempo, para que não tenha de voltar a introduzir determinada informação enquanto navega ou quando regressa.' },
      ]},
      { t: 'Cookies Técnicos e Essenciais (Não Requerem Consentimento)', b: [
        { p: 'Estes cookies são estritamente necessários ao funcionamento básico do Serviço (autenticação segura). São cookies httpOnly: nenhum script do navegador os consegue ler.' },
        { table: {
          head: ['Cookie', 'Finalidade', 'Duração'],
          rows: [
            ['access_token', 'Manter a sua sessão autenticada (token de acesso, httpOnly)', '1 hora'],
            ['refresh_token', 'Renovar a sessão sem voltar a iniciar sessão (httpOnly)', '7 dias'],
          ],
        }},
        { p: 'Utilizamos também o **armazenamento local do navegador (localStorage — não são cookies)** para recordar preferências no seu próprio dispositivo: idioma selecionado, tema visual, a sua escolha de consentimento de cookies e o estado da interface da sua conta. Estes dados não são transmitidos a terceiros.' },
      ]},
      { t: 'Cookies Analíticos (Requerem Consentimento)', b: [
        { p: 'Utilizamos o Google Analytics 4 para perceber como os utilizadores interagem com o Serviço e melhorá-lo. Estes cookies só são instalados se tiver dado consentimento através do banner de cookies (Google Consent Mode v2, negado por defeito).' },
        { table: {
          head: ['Cookie', 'Fornecedor', 'Finalidade', 'Duração'],
          rows: [
            ['_ga', 'Google Analytics', 'Distinguir utilizadores únicos (ID anonimizado)', '12 meses'],
            ['_ga_*', 'Google Analytics', 'Manter o estado da sessão de analítica', '12 meses'],
          ],
        }},
        { p: 'O Google Analytics 4 está configurado com anonimização de IP: o endereço IP é truncado antes de ser armazenado. Não é transmitida à Google qualquer informação pessoalmente identificável através destes cookies.' },
      ]},
      { t: 'Conteúdo de Terceiros Incorporado', b: [
        { p: 'Algumas páginas incorporam o gráfico da **TradingView** através de um iframe de tradingview.com. Esse conteúdo é servido pela TradingView e pode instalar os seus próprios cookies técnicos ao abrigo da sua própria política de privacidade e de cookies. Não controlamos esses cookies.' },
      ]},
      { t: 'Como Gerir e Desativar Cookies', b: [
        { p: 'A maioria dos navegadores permite controlar os cookies a partir das suas definições:' },
        { list: [
          'Google Chrome: Definições → Privacidade e segurança → Cookies e outros dados de sites.',
          'Mozilla Firefox: Definições → Privacidade e segurança → Cookies e dados de sites.',
          'Safari: Preferências → Privacidade → Gerir dados de sites.',
          'Microsoft Edge: Definições → Privacidade, pesquisa e serviços → Cookies e permissões de sites.',
        ]},
        { p: 'Bloquear os cookies essenciais pode impedi-lo de iniciar sessão. Para recusar especificamente o Google Analytics, pode instalar a [extensão de desativação do Google Analytics](https://tools.google.com/dlpage/gaoptout).' },
      ]},
      { t: 'Consentimento e Gestão de Preferências', b: [
        { p: 'Na sua primeira visita, um banner permite-lhe aceitar ou recusar os cookies não essenciais; a sua escolha é guardada no seu dispositivo. Pode alterar as suas preferências a qualquer momento limpando os dados do site no seu navegador ou contactando {email}. A retirada do consentimento não afeta a licitude do tratamento anterior.' },
      ]},
      { t: 'Atualizações desta Política', b: [
        { p: 'Podemos atualizar esta Política de Cookies quando introduzirmos novas tecnologias ou quando as normas aplicáveis mudarem. Notificaremos as alterações significativas através de um aviso na plataforma ou por email. A data de «Última atualização» indica a revisão mais recente.' },
      ]},
    ],
  },

  risk: {
    title: 'Aviso de Risco',
    sections: [
      { t: 'Os Dados São Claros', b: [
        { p: '**Operar nos mercados financeiros comporta um elevado risco de perda. A grande maioria dos traders de retalho perde dinheiro.** Antes de operar com dinheiro real, deve conhecer estes números verificados e independentes. Não são a nossa opinião: vêm de reguladores e de estudos académicos.' },
        { stat: { fig: '74–89 %', text: 'das **contas de retalho de CFD perdem dinheiro**, segundo o regulador europeu (ESMA). A perda média por cliente varia entre 1.600 € e 29.000 €. É por isso que a lei obriga todas as corretoras a mostrar esta percentagem na sua publicidade.' } },
        { stat: { fig: '97 %', text: 'dos que **fizeram day trading durante mais de 300 dias** perderam dinheiro (estudo do mercado de futuros brasileiro, 2013–2015). Apenas 1,1 % ganhou mais do que o salário mínimo e apenas 0,5 % mais do que o salário inicial de um bancário. Os autores concluem que é «praticamente impossível viver do day trading».' } },
        { stat: { fig: '<1 %', text: 'dos day traders é **consistente e previsivelmente** rentável, segundo estudos clássicos do mercado de Taiwan (Barber & Odean); cerca de 80 % perde dinheiro.' } },
      ]},
      { t: 'O que Isto Significa para Si', b: [
        { list: [
          'A rentabilidade sustentada no trading de retalho é rara: menos de 1–3 % consegue-a a longo prazo.',
          'Os resultados passados não garantem nem preveem resultados futuros.',
          'Pode perder todo o capital investido. Com produtos alavancados (CFDs, futuros, opções) as perdas podem ocorrer muito depressa e até exceder o depósito inicial.',
          'Os custos (comissões, spreads, slippage e impostos) trabalham contra si de forma cumulativa.',
          'Os fatores psicológicos e os vieses comportamentais (excesso de confiança, trading de vingança, overtrading) pioram os resultados da maioria das pessoas.',
        ]},
      ]},
      { t: 'A Nossa Posição', b: [
        { p: '**O TradingCalculator.pro fornece ferramentas informativas e educativas — não aconselhamento financeiro, não sinais e nenhuma promessa de rentabilidade.** Mostramos estes números porque queremos que decida com informação verdadeira. Opere apenas com dinheiro que possa dar-se ao luxo de perder e, se necessário, consulte um consultor financeiro devidamente autorizado. Veja também os nossos {terms}.' },
      ]},
      { t: 'Fontes', b: [
        { list: [
          'ESMA (Autoridade Europeia dos Valores Mobiliários e dos Mercados) — medidas de intervenção sobre produtos CFD: [esma.europa.eu](https://www.esma.europa.eu/press-news/esma-news/esma-adopts-final-product-intervention-measures-cfds-and-binary-options).',
          'Chague, De-Losso & Giovannetti (2020), «Day Trading for a Living?» — FGV/USP: [papers.ssrn.com](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3423101).',
          'Barber, Lee, Liu & Odean — investigação sobre o desempenho dos day traders no mercado de Taiwan.',
        ]},
      ]},
    ],
  },
};

export default pt;

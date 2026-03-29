const initialState = {
  dadosBasicos: {
    taxaRetirada: 4,
    inflacaoAnual: 2,
    idadeAtual: 29,
    idadeReforma: 65,
    rendimentoAnual: 40000,
    despesasAnuais: 14400,
    valorInvestido: 20000
  },
  depositosDiversificados: [
    {
      id: 1,
      tipo: 'ETF Global',
      valorMensal: 400,
      taxaEsperada: 8,
      desvioPadrao: 18,
      dataInicio: '2025-01-01',
      dataFim: '2055-01-01',
      descricao: 'FTSE ALL-World'
    },
    {
      id: 2,
      tipo: 'PPR',
      valorMensal: 150,
      taxaEsperada: 4,
      desvioPadrao: 8,
      dataInicio: '2025-01-01',
      dataFim: '2055-01-01',
      descricao: 'Stoik PPR'
    },
    {
      id: 3,
      tipo: 'Cripto',
      valorMensal: 200,
      taxaEsperada: 14,
      desvioPadrao: 40,
      dataInicio: '2025-01-01',
      dataFim: '2055-01-01',
      descricao: 'Bitcoin'
    }
  ],
  eventosFinanceiros: {
    unicos: [
      {
        id: 1,
        ano: 2035,
        mes: 6,
        tipo: 'Depósito',
        valor: 5000,
        descricao: 'Herança'
      },
      {
        id: 2,
        ano: 2035,
        mes: 7,
        tipo: 'Levantamento',
        valor: 6000,
        descricao: 'Viagem Japão'
      }
    ],
    recorrentes: [
      {
        id: 1,
        anoInicio: 2025,
        anoFim: 2050,
        periodicidade: 'Anual',
        valorPeriodo: 50,
        descricao: 'Bônus',
        tipo: 'Depósito'
      }
    ]
  },
  despesasVariaveis: [
    {
      id: 1,
      descricao: 'Crédito Habitação',
      valorMensal: 800,
      anoInicio: 2025,
      anoFim: 2055
    },
    {
      id: 2,
      descricao: 'Creche',
      valorMensal: 350,
      anoInicio: 2026,
      anoFim: 2031
    },
    {
      id: 3,
      descricao: 'Escola Privada',
      valorMensal: 450,
      anoInicio: 2032,
      anoFim: 2043
    }
  ]
};

let dadosApp = JSON.parse(JSON.stringify(initialState));

let estadoEdicao = {
  deposito: null,
  despesa: null,
  eventoUnico: null,
  eventoRecorrente: null
};

function salvarDadosNoLocalStorage() {
  try {
    localStorage.setItem('dadosCalculadoraFIRE', JSON.stringify(dadosApp));
  } catch (e) {
    console.error('Erro ao salvar dados no LocalStorage:', e);
  }
}

function carregarDadosDoLocalStorage() {
  try {
    const dadosSalvos = localStorage.getItem('dadosCalculadoraFIRE');
    if (dadosSalvos) {
      let dadosParse = JSON.parse(dadosSalvos);

      if (dadosParse.eventosFinanceiros && dadosParse.eventosFinanceiros.unicos) {
        dadosParse.eventosFinanceiros.unicos.forEach(e => {
          if (!e.mes) e.mes = 1;
        });
      }
      if (dadosParse.depositosDiversificados) {
        dadosParse.depositosDiversificados.forEach(d => {
          if (!d.desvioPadrao) d.desvioPadrao = 5;
        });
      }

      dadosApp = { ...initialState, ...dadosParse };
    }
  } catch (e) {
    console.error('Erro ao carregar dados do LocalStorage:', e);
  }
}

export {
  dadosApp,
  estadoEdicao,
  salvarDadosNoLocalStorage,
  carregarDadosDoLocalStorage
};

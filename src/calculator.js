import { dadosApp } from './state.js';

const PERIODOS_POR_ANO = {
  Mensal: 12,
  Trimestral: 4,
  Semestral: 2,
  Anual: 1
};

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function calcularAlvoFIRE(anoAtual, inflacaoAcumulada) {
  const { dadosBasicos, despesasVariaveis } = dadosApp;
  
  // 1. Capital para Despesas Eternas
  const despesasFixasNominais = dadosBasicos.despesasAnuais * inflacaoAcumulada;
  const capitalPerpetuo = despesasFixasNominais / (dadosBasicos.taxaRetirada / 100);

  // 2. Capital para Despesas Temporárias
  let capitalTemporario = 0;
  
  (despesasVariaveis ?? []).forEach(despesa => {
    if (despesa.anoFim >= anoAtual) {
      const anoInicioCobrar = Math.max(anoAtual, despesa.anoInicio);
      const anosRestantes = despesa.anoFim - anoInicioCobrar + 1;
      
      if (anosRestantes > 0) {
        const custoTotalRestante = despesa.valorMensal * 12 * anosRestantes;
        capitalTemporario += custoTotalRestante;
      }
    }
  });

  return capitalPerpetuo + capitalTemporario;
}

// — Fluxos de Caixa —

function fluxoUnicoMensal(ano, mes) {
  return (dadosApp.eventosFinanceiros?.unicos ?? []).reduce((total, evento) => {
    if (evento.ano === ano && (evento.mes - 1) === mes) {
      const valor = evento.tipo === 'Levantamento' ? -evento.valor : evento.valor;
      return total + valor;
    }
    return total;
  }, 0);
}

function fluxoRecorrenteMensal(ano, mes) {
  return (dadosApp.eventosFinanceiros?.recorrentes ?? []).reduce((total, evento) => {
    if (ano >= evento.anoInicio && ano <= evento.anoFim) {
      const valor = evento.tipo === 'Levantamento' ? -evento.valorPeriodo : evento.valorPeriodo;
      switch (evento.periodicidade) {
        case 'Mensal': return total + valor;
        case 'Trimestral': if (mes % 3 === 0) return total + valor; break;
        case 'Semestral': if (mes % 6 === 0) return total + valor; break;
        case 'Anual': if (mes === 0) return total + valor; break;
      }
    }
    return total;
  }, 0);
}

function fluxoRecorrenteAnual(ano) {
  return (dadosApp.eventosFinanceiros?.recorrentes ?? []).reduce((total, evento) => {
    if (ano >= evento.anoInicio && ano <= evento.anoFim) {
      const valor = evento.tipo === 'Levantamento' ? -evento.valorPeriodo : evento.valorPeriodo;
      const periodosPorAno = PERIODOS_POR_ANO[evento.periodicidade] || 1;
      return total + (valor * periodosPorAno);
    }
    return total;
  }, 0);
}

function fluxoUnicoAnual(ano) {
  return (dadosApp.eventosFinanceiros?.unicos ?? []).reduce((total, evento) => {
    if (evento.ano === ano) {
      const valor = evento.tipo === 'Levantamento' ? -evento.valor : evento.valor;
      return total + valor;
    }
    return total;
  }, 0);
}

function fluxoVariavelAnual(ano) {
  return (dadosApp.despesasVariaveis ?? []).reduce((total, despesa) => {
    if (ano >= despesa.anoInicio && ano <= despesa.anoFim) {
      return total - (despesa.valorMensal * 12); 
    }
    return total;
  }, 0);
}

// ==========================================
// SIMULAÇÃO DETERMINÍSTICA
// ==========================================

function simularEvolucaoPatrimonial() {
  const { dadosBasicos, depositosDiversificados } = dadosApp;
  const anoBase = new Date().getFullYear();
  const anosDeSimulacao = dadosBasicos.idadeReforma - dadosBasicos.idadeAtual;
  const ANO_MAXIMO_SIMULACAO = Math.max(anosDeSimulacao, 1);

  let totalContribuicaoMensal = 0;
  let somaPonderada = 0;
  const dataFimDep = new Date(anoBase + ANO_MAXIMO_SIMULACAO, 11, 31);

  depositosDiversificados.forEach(dep => {
    if (new Date(dep.dataInicio) <= dataFimDep) {
      totalContribuicaoMensal += dep.valorMensal;
      somaPonderada += dep.valorMensal * (dep.taxaEsperada / 100);
    }
  });

  let taxaRetornoNominalAnual = 0.07;
  if (totalContribuicaoMensal > 0) {
    taxaRetornoNominalAnual = somaPonderada / totalContribuicaoMensal;
  } else if (depositosDiversificados.length > 0) {
    const somaTaxas = depositosDiversificados.reduce((acc, dep) => acc + dep.taxaEsperada, 0);
    taxaRetornoNominalAnual = (somaTaxas / depositosDiversificados.length) / 100;
  }

  const taxaRetornoNominalMensal = Math.pow(1 + taxaRetornoNominalAnual, 1 / 12) - 1;
  const taxaInflacaoMensal = Math.pow(1 + dadosBasicos.inflacaoAnual / 100, 1 / 12) - 1;

  let valorAtual = dadosBasicos.valorInvestido;
  const historicoPatrimonialMensal = [{
    ano: anoBase, mes: 0, valorNominal: valorAtual, valorReal: valorAtual
  }];
  const historicoPatrimonialAnual = [{
    ano: anoBase, valorNominal: valorAtual, valorReal: valorAtual
  }];

  let anosParaFIRE = 0;
  let atingiuFIRE = false;
  let valorFIRENoMomentoFIRE = 0;

  for (let i = 1; i <= ANO_MAXIMO_SIMULACAO * 12; i++) {
    const anoCorrente = anoBase + Math.floor((i - 1) / 12);
    const mesCorrente = (i - 1) % 12;

    const jurosMensais = valorAtual * taxaRetornoNominalMensal;
    
    let contribuicaoMensalAtual = 0;
    const dataMesAtual = new Date(anoCorrente, mesCorrente, 1);
    depositosDiversificados.forEach(dep => {
      if (dataMesAtual >= new Date(dep.dataInicio) && dataMesAtual <= new Date(dep.dataFim)) {
        contribuicaoMensalAtual += dep.valorMensal;
      }
    });

    const fluxoCaixaMensal = contribuicaoMensalAtual + fluxoRecorrenteMensal(anoCorrente, mesCorrente) + fluxoUnicoMensal(anoCorrente, mesCorrente);
    valorAtual += jurosMensais + fluxoCaixaMensal;

    const inflacaoAcumulada = Math.pow(1 + taxaInflacaoMensal, i);
    
    historicoPatrimonialMensal.push({
      ano: anoCorrente,
      mes: mesCorrente,
      valorNominal: valorAtual,
      valorReal: valorAtual / inflacaoAcumulada
    });

    if (mesCorrente === 11) {
      historicoPatrimonialAnual.push({
        ano: anoCorrente,
        valorNominal: valorAtual,
        valorReal: valorAtual / inflacaoAcumulada
      });

      if (!atingiuFIRE) {
        const alvoFIRENominal = calcularAlvoFIRE(anoCorrente, inflacaoAcumulada);
        if (valorAtual >= alvoFIRENominal) {
          atingiuFIRE = true;
          anosParaFIRE = anoCorrente - anoBase;
          valorFIRENoMomentoFIRE = alvoFIRENominal;
        }
      }
    }
  }

  if (!atingiuFIRE) anosParaFIRE = 'N/A';

  const inflacaoFinal = Math.pow(1 + taxaInflacaoMensal, ANO_MAXIMO_SIMULACAO * 12);
  const valorFIREFinalSimulacao = atingiuFIRE 
    ? valorFIRENoMomentoFIRE 
    : calcularAlvoFIRE(anoBase + ANO_MAXIMO_SIMULACAO, inflacaoFinal);

  return {
    historicoPatrimonialAnual,
    historicoPatrimonialMensal,
    anosParaFIRE,
    idadeFIRE: atingiuFIRE ? dadosBasicos.idadeAtual + anosParaFIRE : '—',
    valorFIRE: valorFIREFinalSimulacao,
    taxaRetornoNominal: taxaRetornoNominalAnual * 100,
    taxaRetornoReal: (taxaRetornoNominalAnual - dadosBasicos.inflacaoAnual / 100) * 100,
  };
}

// ==========================================
// SIMULAÇÃO DE MONTE CARLO
// ==========================================

function gerarNumeroNormal(media, desvioPadrao) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * desvioPadrao + media;
}

function executarSimulacaoMonteCarloAvancada(dados) {
  const { dadosBasicos, depositosDiversificados } = dados;
  const anoBase = new Date().getFullYear();
  
  const IDADE_MAXIMA_SIMULACAO = 85;
  const anosAteMaximo = IDADE_MAXIMA_SIMULACAO - dadosBasicos.idadeAtual;
  const idadeReformaPlaneada = dadosBasicos.idadeReforma;
  const anoReformaPlaneada = anoBase + (idadeReformaPlaneada - dadosBasicos.idadeAtual);

  let valorAtual = dadosBasicos.valorInvestido;
  let idadeAtingiuFIRE = null;
  let valorNaReformaPlaneada = 0;

  // CORREÇÃO: Variável declarada FORA do loop para manter o valor entre meses
  let taxaRetornoNominalMensal = 0; 

  for (let i = 1; i <= anosAteMaximo * 12; i++) {
    const anoCorrente = anoBase + Math.floor((i - 1) / 12);
    const mesCorrente = (i - 1) % 12;
    const idadeAtualSimulada = dadosBasicos.idadeAtual + Math.floor((i - 1) / 12);

    // 1. Determinar Taxa de Retorno (Volatilidade Anual - Atualizada em Janeiro)
    if (mesCorrente === 0 || i === 1) {
      let somaPonderada = 0;
      let totalPesos = 0;
      depositosDiversificados.forEach(dep => {
        const desvioPadrao = (dep.desvioPadrao || 15) / 100;
        const retornoAnualSimulado = gerarNumeroNormal(dep.taxaEsperada / 100, desvioPadrao);
        somaPonderada += dep.valorMensal * retornoAnualSimulado;
        totalPesos += dep.valorMensal;
      });
      const taxaAnual = totalPesos > 0 ? somaPonderada / totalPesos : gerarNumeroNormal(0.06, 0.10);
      taxaRetornoNominalMensal = Math.pow(1 + taxaAnual, 1 / 12) - 1;
    }

    // 2. Juros (Agora aplica-se corretamente todos os meses)
    const juros = valorAtual * taxaRetornoNominalMensal;
    
    let aportes = 0;
    const dataMes = new Date(anoCorrente, mesCorrente, 1);
    depositosDiversificados.forEach(dep => {
        if (dataMes >= new Date(dep.dataInicio) && dataMes <= new Date(dep.dataFim)) aportes += dep.valorMensal;
    });

    const fluxosExtras = fluxoRecorrenteMensal(anoCorrente, mesCorrente) + fluxoUnicoMensal(anoCorrente, mesCorrente);
    valorAtual += juros + aportes + fluxosExtras;

    // 3. Guardar valor na data de reforma planeada
    if (anoCorrente === anoReformaPlaneada && mesCorrente === 11) {
        valorNaReformaPlaneada = valorAtual;
    }

    // 4. Verificar se atingiu FIRE
    if (idadeAtingiuFIRE === null && mesCorrente === 11) {
        const inflacaoAcumulada = Math.pow(1 + dadosBasicos.inflacaoAnual / 100, (i / 12));
        const alvoFIRE = calcularAlvoFIRE(anoCorrente, inflacaoAcumulada);
        
        if (valorAtual >= alvoFIRE) {
            idadeAtingiuFIRE = idadeAtualSimulada; 
        }
    }
  }

  return {
    valorNaReformaPlaneada,
    idadeAtingiuFIRE: idadeAtingiuFIRE
  };
}

function simularMonteCarlo(numSimulacoes = 2500) {
  const resultadosValores = [];
  const resultadosIdades = [];

  for (let i = 0; i < numSimulacoes; i++) {
    const res = executarSimulacaoMonteCarloAvancada(dadosApp);
    resultadosValores.push(res.valorNaReformaPlaneada);
    if (res.idadeAtingiuFIRE !== null) {
        resultadosIdades.push(res.idadeAtingiuFIRE);
    }
  }

  resultadosValores.sort((a, b) => a - b);
  resultadosIdades.sort((a, b) => a - b);

  const p10 = resultadosValores[Math.floor(numSimulacoes * 0.10)];
  const p50 = resultadosValores[Math.floor(numSimulacoes * 0.50)];
  const p90 = resultadosValores[Math.floor(numSimulacoes * 0.90)];

  const anoReforma = dadosApp.dadosBasicos.idadeReforma - dadosApp.dadosBasicos.idadeAtual + new Date().getFullYear();
  const inflacaoTotal = Math.pow(1 + dadosApp.dadosBasicos.inflacaoAnual / 100, anoReforma - new Date().getFullYear());
  const alvoFixo = calcularAlvoFIRE(anoReforma, inflacaoTotal);
  const sucessoSimulacoes = resultadosValores.filter(r => r >= alvoFixo).length;
  const taxaDeSucesso = (sucessoSimulacoes / numSimulacoes) * 100;

  let idadePessimista = "Nunca (>85)"; 
  let idadeMediana = "Nunca (>85)";    
  let idadeOtimista = "Nunca (>85)";  

  if (resultadosIdades.length > 0) {
      if (resultadosIdades.length >= numSimulacoes * 0.1) {
          idadeOtimista = resultadosIdades[Math.floor(resultadosIdades.length * 0.10)];
      }
      if (resultadosIdades.length >= numSimulacoes * 0.5) {
          idadeMediana = resultadosIdades[Math.floor(resultadosIdades.length * 0.50)];
      }
      if (resultadosIdades.length >= numSimulacoes * 0.9) {
          idadePessimista = resultadosIdades[Math.floor(resultadosIdades.length * 0.90)];
      }
  }

  return {
    p10, p50, p90,
    taxaDeSucesso,
    resultados: resultadosValores,
    idadesFIRE: {
        otimista: idadeOtimista, 
        mediana: idadeMediana,   
        pessimista: idadePessimista 
    }
  };
}

function simularSequenceOfReturnsRisk(srrDuration, srrReturn) {
  const { dadosBasicos, depositosDiversificados } = dadosApp;
  const anoBase = new Date().getFullYear();
  const anosDeSimulacao = dadosBasicos.idadeReforma - dadosBasicos.idadeAtual;
  const ANO_MAXIMO_SIMULACAO = Math.max(anosDeSimulacao, 1);

  let totalContribuicaoMensal = 0;
  let somaPonderada = 0;
  depositosDiversificados.forEach(dep => {
    totalContribuicaoMensal += dep.valorMensal;
    somaPonderada += dep.valorMensal * (dep.taxaEsperada / 100);
  });
  
  const taxaRetornoNominalAnual = totalContribuicaoMensal > 0 ? somaPonderada / totalContribuicaoMensal : 0.07;
  const taxaRetornoStressAnual = srrReturn / 100;

  let valorAtual = dadosBasicos.valorInvestido;
  const historicoPatrimonialAnual = [{
    ano: anoBase,
    valorNominal: valorAtual,
  }];

  for (let i = 0; i < ANO_MAXIMO_SIMULACAO; i++) {
    const anoCorrente = anoBase + i;
    const taxaDeRetornoDoAno = i < srrDuration ? taxaRetornoStressAnual : taxaRetornoNominalAnual;
    const jurosAnuais = valorAtual * taxaDeRetornoDoAno;

    let contribuicaoAnual = 0;
    depositosDiversificados.forEach(dep => {
       const anoInicio = new Date(dep.dataInicio).getFullYear();
       const anoFim = new Date(dep.dataFim).getFullYear();
       if (anoCorrente >= anoInicio && anoCorrente <= anoFim) {
         contribuicaoAnual += dep.valorMensal * 12;
       }
    });

    const fluxoEventosRecorrentes = fluxoRecorrenteAnual(anoCorrente);
    const fluxoEventosUnicos = fluxoUnicoAnual(anoCorrente);
    const fluxoCaixaAnual = contribuicaoAnual + fluxoEventosRecorrentes + fluxoEventosUnicos;

    valorAtual += jurosAnuais + fluxoCaixaAnual;

    historicoPatrimonialAnual.push({
      ano: anoCorrente,
      valorNominal: valorAtual,
    });
  }

  return { historicoPatrimonialAnual };
}

export { simularEvolucaoPatrimonial, simularMonteCarlo, simularSequenceOfReturnsRisk };
import { dadosApp } from './state.js';

const PERIODOS_POR_ANO = {
  Mensal: 12,
  Trimestral: 4,
  Semestral: 2,
  Anual: 1
};

// ==========================================
// FUNÇÕES AUXILIARES DE CÁLCULO FINANCEIRO
// ==========================================

/**
 * Calcula o alvo FIRE "Sinking Fund".
 * Despesas Fixas -> Regra dos 4% (Capital Perpétuo)
 * Despesas Variáveis -> Soma dos pagamentos restantes (Capital Temporário)
 */
function calcularAlvoFIRE(anoAtual, inflacaoAcumulada) {
  const { dadosBasicos, despesasVariaveis } = dadosApp;
  
  // 1. Capital para Despesas Eternas (ajustado à inflação)
  // Ex: €20k anuais hoje * 1.8 (inflação) / 0.04
  const despesasFixasNominais = dadosBasicos.despesasAnuais * inflacaoAcumulada;
  const capitalPerpetuo = despesasFixasNominais / (dadosBasicos.taxaRetirada / 100);

  // 2. Capital para Despesas Temporárias (Sinking Fund)
  // Soma quanto falta pagar de cada despesa variável até ela acabar
  let capitalTemporario = 0;
  
  (despesasVariaveis ?? []).forEach(despesa => {
    if (despesa.anoFim >= anoAtual) {
      // Se a despesa ainda existe ou vai existir
      const anoInicioCobrar = Math.max(anoAtual, despesa.anoInicio);
      const anosRestantes = despesa.anoFim - anoInicioCobrar + 1;
      
      if (anosRestantes > 0) {
        // Assume-se que despesas variáveis (como escola/crédito) são valores nominais contratuais
        // Se quiser ser conservador e inflacionar escola, poderia multiplicar pela inflação aqui.
        // Por simplicidade e segurança, mantemos o valor nominal do contrato/plano:
        const custoTotalRestante = despesa.valorMensal * 12 * anosRestantes;
        capitalTemporario += custoTotalRestante;
      }
    }
  });

  return capitalPerpetuo + capitalTemporario;
}

// — Fluxos de Caixa (Auxiliares) —

function fluxoVariavelAnual(ano) {
  return (dadosApp.despesasVariaveis ?? []).reduce((total, despesa) => {
    if (ano >= despesa.anoInicio && ano <= despesa.anoFim) {
      return total - (despesa.valorMensal * 12); 
    }
    return total;
  }, 0);
}

function fluxoUnicoMensal(ano, mes) { // mes is 0-11
  return (dadosApp.eventosFinanceiros?.unicos ?? []).reduce((total, evento) => {
    if (evento.ano === ano && (evento.mes - 1) === mes) {
      const valor = evento.tipo === 'Levantamento' ? -evento.valor : evento.valor;
      return total + valor;
    }
    return total;
  }, 0);
}

function fluxoRecorrenteMensal(ano, mes) { // mes is 0-11
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

// ==========================================
// SIMULAÇÃO DETERMINÍSTICA (Evolução Patrimonial)
// ==========================================

function simularEvolucaoPatrimonial() {
  const { dadosBasicos, depositosDiversificados } = dadosApp;
  const anoBase = new Date().getFullYear();
  const anosDeSimulacao = dadosBasicos.idadeReforma - dadosBasicos.idadeAtual;
  const ANO_MAXIMO_SIMULACAO = Math.max(anosDeSimulacao, 1);

  // 1. Calcular Taxa Ponderada Global
  let totalContribuicaoMensal = 0;
  let somaPonderada = 0;
  
  // Usamos uma janela ampla para calcular a média ponderada dos aportes
  const dataInicioDep = new Date(anoBase, 0, 1);
  const dataFimDep = new Date(anoBase + ANO_MAXIMO_SIMULACAO, 11, 31);

  depositosDiversificados.forEach(dep => {
    const dataInicio = new Date(dep.dataInicio);
    const dataFim = new Date(dep.dataFim);
    if (dataInicio <= dataFimDep && dataFim >= dataInicioDep) {
      totalContribuicaoMensal += dep.valorMensal;
      somaPonderada += dep.valorMensal * (dep.taxaEsperada / 100);
    }
  });

  // Fallback: Se não houver depósitos, usa 7% ou a média aritmética das taxas
  let taxaRetornoNominalAnual = 0.07;
  if (totalContribuicaoMensal > 0) {
    taxaRetornoNominalAnual = somaPonderada / totalContribuicaoMensal;
  } else if (depositosDiversificados.length > 0) {
    const somaTaxas = depositosDiversificados.reduce((acc, dep) => acc + dep.taxaEsperada, 0);
    taxaRetornoNominalAnual = (somaTaxas / depositosDiversificados.length) / 100;
  }

  const taxaRetornoNominalMensal = Math.pow(1 + taxaRetornoNominalAnual, 1 / 12) - 1;
  const taxaInflacaoMensal = Math.pow(1 + dadosBasicos.inflacaoAnual / 100, 1 / 12) - 1;

  // 2. Estado Inicial
  let valorAtual = dadosBasicos.valorInvestido;
  const historicoPatrimonialMensal = [{
    ano: anoBase, mes: 0, valorNominal: valorAtual, valorReal: valorAtual
  }];
  const historicoPatrimonialAnual = [{
    ano: anoBase, valorNominal: valorAtual, valorReal: valorAtual
  }];

  let anosParaFIRE = 0;
  let atingiuFIRE = false;
  let valorFIRENoMomentoFIRE = 0; // Para guardar o alvo no ano exato

  // 3. Loop Mensal
  for (let i = 1; i <= ANO_MAXIMO_SIMULACAO * 12; i++) {
    const anoCorrente = anoBase + Math.floor((i - 1) / 12);
    const mesCorrente = (i - 1) % 12;

    // Juros
    const jurosMensais = valorAtual * taxaRetornoNominalMensal;

    // Aportes (Depósitos)
    let contribuicaoMensalAtual = 0;
    const dataMesAtual = new Date(anoCorrente, mesCorrente, 1);
    depositosDiversificados.forEach(dep => {
      const dataInicio = new Date(dep.dataInicio);
      const dataFim = new Date(dep.dataFim);
      if (dataMesAtual >= dataInicio && dataMesAtual <= dataFim) {
        contribuicaoMensalAtual += dep.valorMensal;
      }
    });

    // Eventos
    const fluxoEventosRecorrentes = fluxoRecorrenteMensal(anoCorrente, mesCorrente);
    const fluxoEventosUnicos = fluxoUnicoMensal(anoCorrente, mesCorrente);

    const fluxoCaixaMensal = contribuicaoMensalAtual + fluxoEventosRecorrentes + fluxoEventosUnicos;
    valorAtual += jurosMensais + fluxoCaixaMensal;

    // Histórico e Inflação
    const inflacaoAcumulada = Math.pow(1 + taxaInflacaoMensal, i);
    
    historicoPatrimonialMensal.push({
      ano: anoCorrente,
      mes: mesCorrente,
      valorNominal: valorAtual,
      valorReal: valorAtual / inflacaoAcumulada
    });

    // Verificações Anuais (Dezembro)
    if (mesCorrente === 11) {
      historicoPatrimonialAnual.push({
        ano: anoCorrente,
        valorNominal: valorAtual,
        valorReal: valorAtual / inflacaoAcumulada
      });

      if (!atingiuFIRE) {
        // Calcula o alvo FIRE Nominal para este ano específico
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

  // O valor FIRE final para exibição usa o ano de reforma planeado se ainda não atingiu
  const inflacaoFinal = Math.pow(1 + taxaInflacaoMensal, ANO_MAXIMO_SIMULACAO * 12);
  const valorFIREFinalSimulacao = atingiuFIRE 
    ? valorFIRENoMomentoFIRE 
    : calcularAlvoFIRE(anoBase + ANO_MAXIMO_SIMULACAO, inflacaoFinal);

  // Convertemos o Valor FIRE exibido para Real (hoje) para o utilizador entender
  // ou mantemos Nominal se a UI explicar que é valor futuro. 
  // O padrão aqui será devolver o valor NOMINAL necessário no futuro.
  
  return {
    historicoPatrimonialAnual,
    historicoPatrimonialMensal,
    anosParaFIRE,
    idadeFIRE: atingiuFIRE ? dadosBasicos.idadeAtual + anosParaFIRE : '—',
    valorFIRE: valorFIREFinalSimulacao, // Valor Nominal Futuro Necessário
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

function executarSimulacaoUnica(dados) {
  const { dadosBasicos, depositosDiversificados } = dados;
  const anoBase = new Date().getFullYear();
  const anosDeSimulacao = dadosBasicos.idadeReforma - dadosBasicos.idadeAtual;
  const ANO_MAXIMO_SIMULACAO = Math.max(anosDeSimulacao, 1);

  let valorAtual = dadosBasicos.valorInvestido;
  
  // Cache de totais para otimizar o loop
  let totalContribuicaoMensalDepositos = 0;
  const dataFimSimulacao = new Date(anoBase + ANO_MAXIMO_SIMULACAO, 11, 31);
  depositosDiversificados.forEach(dep => {
     // Simplificação para MC: considera o valor se estiver ativo na maior parte do tempo
     if (new Date(dep.dataInicio) <= dataFimSimulacao) {
       totalContribuicaoMensalDepositos += dep.valorMensal;
     }
  });

  // Loop Mensal
  for (let i = 1; i <= ANO_MAXIMO_SIMULACAO * 12; i++) {
    const anoCorrente = anoBase + Math.floor((i - 1) / 12);
    const mesCorrente = (i - 1) % 12;

    // Recalcula taxa anual aleatória a cada Janeiro (Volatilidade Anual)
    // Se preferir volatilidade mensal, mova isto para fora do if
    let taxaRetornoNominalMensal = 0;
    
    if (mesCorrente === 0 || i === 1) {
      let somaPonderada = 0;
      let totalPesos = 0;
      
      depositosDiversificados.forEach(dep => {
        const desvioPadrao = (dep.desvioPadrao || 15) / 100;
        const retornoAnualSimulado = gerarNumeroNormal(dep.taxaEsperada / 100, desvioPadrao);
        somaPonderada += dep.valorMensal * retornoAnualSimulado;
        totalPesos += dep.valorMensal;
      });

      // Fallback se totalPesos for 0
      const taxaRetornoAnualRandom = totalPesos > 0 ? somaPonderada / totalPesos : gerarNumeroNormal(0.07, 0.15);
      taxaRetornoNominalMensal = Math.pow(1 + taxaRetornoAnualRandom, 1 / 12) - 1;
    }

    // Aplica Juros (simplificado assumindo a taxa do ano aplicada mensalmente)
    // Nota: Para precisão extrema MC, a taxa deve variar, mas manter constante no ano é comum
    const jurosMensais = valorAtual * taxaRetornoNominalMensal;

    const fluxoEventosRecorrentes = fluxoRecorrenteMensal(anoCorrente, mesCorrente);
    const fluxoEventosUnicos = fluxoUnicoMensal(anoCorrente, mesCorrente);
    
    // Aportes
    let contribuicaoMensalAtualMC = 0;
    const dataMesAtual = new Date(anoCorrente, mesCorrente, 1);
    depositosDiversificados.forEach(dep => {
      if (dataMesAtual >= new Date(dep.dataInicio) && dataMesAtual <= new Date(dep.dataFim)) {
        contribuicaoMensalAtualMC += dep.valorMensal;
      }
    });

    valorAtual += jurosMensais + contribuicaoMensalAtualMC + fluxoEventosRecorrentes + fluxoEventosUnicos;
  }

  return valorAtual;
}

function simularMonteCarlo(numSimulacoes = 2500) {
  const resultadosFinais = [];
  for (let i = 0; i < numSimulacoes; i++) {
    resultadosFinais.push(executarSimulacaoUnica(dadosApp));
  }

  resultadosFinais.sort((a, b) => a - b);

  const p10 = resultadosFinais[Math.floor(numSimulacoes * 0.10)];
  const p50 = resultadosFinais[Math.floor(numSimulacoes * 0.50)];
  const p90 = resultadosFinais[Math.floor(numSimulacoes * 0.90)];

  // CORREÇÃO CRÍTICA: Comparar resultado Nominal com Alvo Nominal
  const anoFinal = new Date().getFullYear() + (dadosApp.dadosBasicos.idadeReforma - dadosApp.dadosBasicos.idadeAtual);
  const inflacaoTotal = Math.pow(1 + dadosApp.dadosBasicos.inflacaoAnual / 100, anoFinal - new Date().getFullYear());
  
  // O alvo FIRE no final da simulação (ajustado para nominal)
  const despesasFinaisNominais = calcularAlvoFIRE(anoFinal, inflacaoTotal);
    
  const sucessoSimulacoes = resultadosFinais.filter(r => r >= despesasFinaisNominais).length;
  const taxaDeSucesso = (sucessoSimulacoes / numSimulacoes) * 100;

  return {
    p10,
    p50,
    p90,
    taxaDeSucesso,
    resultados: resultadosFinais
  };
}

// ==========================================
// SIMULAÇÃO SEQUENCE OF RETURNS (Risk)
// ==========================================

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

    // Calcular Fluxos Anuais Agregados
    let contribuicaoAnual = 0;
    // Aproximação anual para o gráfico de stress
    depositosDiversificados.forEach(dep => {
       // Considera aporte se o ano estiver dentro do range
       const anoInicio = new Date(dep.dataInicio).getFullYear();
       const anoFim = new Date(dep.dataFim).getFullYear();
       if (anoCorrente >= anoInicio && anoCorrente <= anoFim) {
         contribuicaoAnual += dep.valorMensal * 12;
       }
    });

    const fluxoEventosRecorrentes = fluxoRecorrenteAnual(anoCorrente);
    const fluxoEventosUnicos = fluxoUnicoAnual(anoCorrente);
    
    // Na fase de acumulação não subtraímos despesas variáveis do portfólio (pagas com salário)
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
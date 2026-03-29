import { dadosApp } from './state.js';

let chartEvolucaoPatrimonial = null;
let chartDespesasVariaveis = null;
let chartAssetAllocation = null;
let chartMonteCarloDistribution = null;

function getYearRange() {
  const anoBase = new Date().getFullYear();
  const deposits = dadosApp.depositosDiversificados;
  const despesas = dadosApp.despesasVariaveis;
  let minYear = anoBase;
  let maxYear = anoBase + (dadosApp.dadosBasicos.idadeReforma - dadosApp.dadosBasicos.idadeAtual);

  deposits.forEach(dep => {
    const start = new Date(dep.dataInicio).getFullYear();
    const end = new Date(dep.dataFim).getFullYear();
    if (start < minYear) minYear = start;
    if (end > maxYear) maxYear = end;
  });

  despesas.forEach(d => {
    if (d.anoInicio < minYear) minYear = d.anoInicio;
    if (d.anoFim > maxYear) maxYear = d.anoFim;
  });

  return { minYear, maxYear };
}

function criarGraficoAssetAllocation() {
  const ctx = document.getElementById('chartAssetAllocation').getContext('2d');

  if (chartAssetAllocation) {
    chartAssetAllocation.destroy();
  }

  const { depositosDiversificados } = dadosApp;
  const totalInvestido = depositosDiversificados.reduce((sum, dep) => sum + dep.valorMensal, 0);

  const labels = depositosDiversificados.map(dep => dep.tipo);
  const data = depositosDiversificados.map(dep => (dep.valorMensal / totalInvestido) * 100);

  const backgroundColors = [
    '#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F',
    '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'
  ];

  chartAssetAllocation = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        label: 'Distribuição de Ativos',
        data: data,
        backgroundColor: backgroundColors,
        borderColor: '#fff',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed !== null) {
                label += context.parsed.toFixed(2) + '%';
              }
              return label;
            }
          }
        }
      }
    }
  });
}

function criarGraficoEvolucaoPatrimonial(dadosGrafico, granularidade) {
  const ctx = document.getElementById('chartEvolucaoPatrimonial').getContext('2d');

  if (chartEvolucaoPatrimonial) {
    chartEvolucaoPatrimonial.destroy();
  }

  const labels = granularidade === 'anual'
    ? dadosGrafico.map(d => d.ano)
    : dadosGrafico.map(d => `${d.mes + 1}/${d.ano}`);

  const valoresNominais = dadosGrafico.map(d => d.valorNominal);
  const valoresReais = dadosGrafico.map(d => d.valorReal);

  chartEvolucaoPatrimonial = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Valor Nominal',
        data: valoresNominais,
        borderColor: '#1FB8CD',
        backgroundColor: 'rgba(31, 184, 205, 0.1)',
        tension: 0.1,
        fill: true
      }, {
        label: 'Valor Real (ajustado à inflação)',
        data: valoresReais,
        borderColor: '#FFC185',
        backgroundColor: 'rgba(255, 193, 133, 0.1)',
        tension: 0.1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '€' + value.toLocaleString();
            }
          }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: €${Math.round(context.raw).toLocaleString()}`;
            }
          }
        }
      }
    }
  });
}

function criarGraficoDespesas() {
  const ctx = document.getElementById('chartDespesasVariaveis').getContext('2d');

  if (chartDespesasVariaveis) {
    chartDespesasVariaveis.destroy();
  }

  const { minYear, maxYear } = getYearRange();
  const anos = [];
  for (let ano = minYear; ano <= maxYear; ano++) {
    anos.push(ano);
  }

  const datasets = [];
  const cores = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'];
  const totalPorAno = Array(anos.length).fill(0);

  const despesasFixasAnuais = dadosApp.dadosBasicos.despesasAnuais || 0;

  dadosApp.despesasVariaveis.forEach((despesa, idx) => {
    const dadosDespesa = anos.map((ano, i) => {
      const valor = (ano >= despesa.anoInicio && ano <= despesa.anoFim)
        ? despesa.valorMensal * 12
        : 0;
      totalPorAno[i] += valor;
      return valor;
    });

    datasets.push({
      label: despesa.descricao,
      data: dadosDespesa,
      borderColor: cores[idx % cores.length],
      backgroundColor: cores[idx % cores.length] + '33',
      borderWidth: 2,
      fill: false,
      tension: 0.1
    });
  });

  for (let i = 0; i < totalPorAno.length; i++) {
    totalPorAno[i] += despesasFixasAnuais;
  }

  datasets.push({
    label: 'Despesas Fixas',
    data: anos.map(() => despesasFixasAnuais),
    borderColor: '#4B4B4B',
    backgroundColor: 'rgba(75,75,75,0.1)',
    borderWidth: 2,
    fill: false,
    tension: 0.1,
    borderDash: [4, 4]
  });

  datasets.push({
    label: 'Total (Variáveis + Fixas)',
    data: totalPorAno,
    borderColor: 'rgb(255, 99, 132)',
    backgroundColor: 'rgba(191, 172, 25, 0.1)',
    borderWidth: 3,
    fill: false,
    tension: 0.1,
    borderDash: [6, 4]
  });

  chartDespesasVariaveis = new Chart(ctx, {
    type: 'line',
    data: {
      labels: anos,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => '€' + value.toLocaleString()
          }
        },
        x: {
          title: {
            display: true,
            text: 'Ano'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 20,
            padding: 15
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: context => `${context.dataset.label}: €${context.raw.toLocaleString()}/ano`
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

function atualizarGraficos(resultadosSimulacao) {
  const granularidade = document.getElementById('chart-granularity').value;
  const periodButton = document.querySelector('.btn-group[role="toolbar"] .btn.active');
  const period = periodButton ? periodButton.dataset.period : 'ALL';

  const historico = granularidade === 'anual'
    ? resultadosSimulacao.historicoPatrimonialAnual
    : resultadosSimulacao.historicoPatrimonialMensal;

  let maxItens = historico.length;

  if (period !== 'ALL') {
    if (granularidade === 'mensal') {
      switch (period) {
      case '1M': maxItens = 2; break;
      case '6M': maxItens = 7; break;
      case 'YTD': maxItens = 12 - new Date().getMonth(); break;
      case '1A': maxItens = 13; break;
      }
    } else {
      switch (period) {
      case 'YTD': maxItens = 1; break;
      case '1A': maxItens = 2; break;
      case '1M':
      case '6M':
        maxItens = 1;
        break;
      }
    }
  }

  const dadosFiltrados = historico.slice(0, maxItens);

  criarGraficoEvolucaoPatrimonial(dadosFiltrados, granularidade);
  criarGraficoDespesas();
  criarGraficoAssetAllocation();
}

function criarGraficoMonteCarloDistribution(resultados) {
  const ctx = document.getElementById('chartMonteCarloDistribution').getContext('2d');

  if (chartMonteCarloDistribution) {
    chartMonteCarloDistribution.destroy();
  }

  const min = Math.min(...resultados);
  const max = Math.max(...resultados);
  const numBins = Math.min(50, Math.sqrt(resultados.length));
  const binSize = (max - min) / numBins;

  const bins = Array(Math.ceil(numBins)).fill(0);
  const labels = [];

  for (let i = 0; i < numBins; i++) {
    const binStart = min + i * binSize;
    const binEnd = binStart + binSize;
    labels.push(`€${Math.round(binStart / 1000)}k - €${Math.round(binEnd / 1000)}k`);
  }

  resultados.forEach(res => {
    let binIndex = Math.floor((res - min) / binSize);
    if (binIndex >= bins.length) binIndex = bins.length - 1;
    bins[binIndex]++;
  });

  const data = {
    labels: labels,
    datasets: [{
      label: 'Frequência de Resultados',
      data: bins,
      backgroundColor: 'rgba(112, 48, 160, 0.6)',
      borderColor: 'rgba(112, 48, 160, 1)',
      borderWidth: 1,
      barPercentage: 1.0,
      categoryPercentage: 1.0,
    }]
  };

  chartMonteCarloDistribution = new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            maxRotation: 90,
            minRotation: 70,
            autoSkip: true,
            maxTicksLimit: 10
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Número de Simulações'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Simulações: ${context.raw}`;
            }
          }
        }
      }
    }
  });
}


let chartSequenceOfReturns = null;

function criarGraficoSequenceOfReturns(originalData, stressData) {
  const ctx = document.getElementById('chartSequenceOfReturns').getContext('2d');

  if (chartSequenceOfReturns) {
    chartSequenceOfReturns.destroy();
  }

  const labels = originalData.map(d => d.ano);
  const originalValues = originalData.map(d => d.valorNominal);
  const stressValues = stressData.map(d => d.valorNominal);

  chartSequenceOfReturns = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Projeção Original',
        data: originalValues,
        borderColor: '#1FB8CD',
        backgroundColor: 'rgba(31, 184, 205, 0.1)',
        tension: 0.1,
        fill: true
      }, {
        label: 'Projeção com Stress Test',
        data: stressValues,
        borderColor: '#B4413C',
        backgroundColor: 'rgba(180, 65, 60, 0.1)',
        tension: 0.1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '€' + value.toLocaleString();
            }
          }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: €${Math.round(context.raw).toLocaleString()}`;
            }
          }
        }
      }
    }
  });
}
export { atualizarGraficos, criarGraficoMonteCarloDistribution, criarGraficoSequenceOfReturns };

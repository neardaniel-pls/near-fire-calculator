import {
  dadosApp,
  estadoEdicao,
  salvarDadosNoLocalStorage,
  carregarDadosDoLocalStorage
} from './state.js';

import {
  popularDadosIniciais,
  showLoader,
  hideLoader,
  adicionarTooltips,
  refreshAllTables,
  depositoManager,
  eventoUnicoManager,
  eventoRecorrenteManager,
  despesaManager,
} from './ui.js';

import {
  simularEvolucaoPatrimonial,
  simularMonteCarlo,
  simularSequenceOfReturnsRisk,
  calcularAnaliseSensibilidade
} from './calculator.js';
import { atualizarGraficos, criarGraficoMonteCarloDistribution, criarGraficoSequenceOfReturns } from './charts.js';
import { gerarPDF } from './pdf.js';
import { setLanguage, translate, translateUI } from './i18n.js';

const itemManagers = {
  deposito: depositoManager,
  eventoUnico: eventoUnicoManager,
  eventoRecorrente: eventoRecorrenteManager,
  despesa: despesaManager,
};

const itemConfigs = {
  deposito: {
    getList: () => dadosApp.depositosDiversificados,
    setList: (list) => { dadosApp.depositosDiversificados = list; },
  },
  eventoUnico: {
    getList: () => dadosApp.eventosFinanceiros.unicos,
    setList: (list) => { dadosApp.eventosFinanceiros.unicos = list; },
  },
  eventoRecorrente: {
    getList: () => dadosApp.eventosFinanceiros.recorrentes,
    setList: (list) => { dadosApp.eventosFinanceiros.recorrentes = list; },
  },
  despesa: {
    getList: () => dadosApp.despesasVariaveis,
    setList: (list) => { dadosApp.despesasVariaveis = list; },
  },
};

const tableToTipo = {
  tabelaDepositos: 'deposito',
  tabelaEventosUnicos: 'eventoUnico',
  tabelaEventosRecorrentes: 'eventoRecorrente',
  tabelaDespesasVariaveis: 'despesa',
};

function editarItem(tipo, id) {
  const manager = itemManagers[tipo];
  const cfg = itemConfigs[tipo];
  const item = cfg.getList().find(i => i.id === id);
  if (!item) return;

  manager.preencherFormulario(item);
  estadoEdicao[tipo] = id;
  manager.mostrarForm(true);
}

function removerItem(tipo, id) {
  const cfg = itemConfigs[tipo];
  cfg.setList(cfg.getList().filter(i => i.id !== id));
  itemManagers[tipo].atualizarTabela();
  salvarDadosNoLocalStorage();
}

function atualizarDadosBasicos() {
  dadosApp.dadosBasicos = {
    taxaRetirada: parseFloat(document.getElementById('taxaRetirada').value),
    inflacaoAnual: parseFloat(document.getElementById('inflacaoAnual').value),
    idadeAtual: parseInt(document.getElementById('idadeAtual').value),
    idadeReforma: parseInt(document.getElementById('idadeReforma').value),
    rendimentoAnual: parseFloat(document.getElementById('rendimentoAnual').value),
    despesasAnuais: parseFloat(document.getElementById('despesasAnuais').value),
    valorInvestido: parseFloat(document.getElementById('valorInvestido').value)
  };
  salvarDadosNoLocalStorage();
}

function salvarItem(tipo) {
  const manager = itemManagers[tipo];
  const cfg = itemConfigs[tipo];

  const dadosFormulario = manager.getDadosFormulario();
  const idEdicao = estadoEdicao[tipo];
  const lista = cfg.getList();

  if (idEdicao) {
    const index = lista.findIndex(item => item.id === idEdicao);
    if (index !== -1) {
      lista[index] = { ...lista[index], ...dadosFormulario };
    }
    estadoEdicao[tipo] = null;
  } else {
    const novoItem = { ...dadosFormulario, id: Date.now() };
    lista.push(novoItem);
  }

  manager.atualizarTabela();
  manager.esconderForm();
  salvarDadosNoLocalStorage();
}

function calcularResultados() {
  atualizarDadosBasicos();
  const resultados = simularEvolucaoPatrimonial();

  document.getElementById('valorFIRE').textContent = `€${Math.round(resultados.valorFIRE).toLocaleString()}`;
  document.getElementById('idadeFIRE').textContent = resultados.idadeFIRE;
  document.getElementById('taxaRetornoNominal').textContent = `${resultados.taxaRetornoNominal.toFixed(2)}%`;
  document.getElementById('taxaRetornoReal').textContent = `${resultados.taxaRetornoReal.toFixed(2)}%`;

  atualizarGraficos(resultados);

  const sensibilidade = calcularAnaliseSensibilidade();

  const retornoDeltas = [-2, -1, 0, 1, 2];
  const inflacaoDeltas = [-1, 0, 1, 2];
  const grid = {};
  let idades = [];

  sensibilidade.forEach(row => {
    const key = `${row.deltaInflacao},${row.deltaRetorno}`;
    grid[key] = row.idadeFIRE;
    if (typeof row.idadeFIRE === 'number') idades.push(row.idadeFIRE);
  });

  idades.sort((a, b) => a - b);
  const minAge = idades[0] || 0;
  const maxAge = idades[idades.length - 1] || 100;
  const range = maxAge - minAge || 1;

  const fmt = (v) => v >= 0 ? `+${v}%` : `${v}%`;
  const color = (age) => {
    if (typeof age !== 'number') return 'var(--color-error-rgb)';
    const t = (age - minAge) / range;
    if (t < 0.5) return 'var(--color-success-rgb)';
    if (t < 0.8) return 'var(--color-warning-rgb)';
    return 'var(--color-error-rgb)';
  };

  const container = document.getElementById('sensitivityHeatmap');
  let html = `<table class="sensitivity-grid"><thead>
    <tr><th class="sensitivity-grid__axis">${translate('sensitivityInflationLabel')}</th>
    <th colspan="5" class="sensitivity-grid__return-header">${translate('sensitivityReturnLabel')}</th></tr>
    <tr><th></th>`;
  retornoDeltas.forEach(d => {
    html += `<th>${fmt(d)}</th>`;
  });
  html += '</tr></thead><tbody>';

  inflacaoDeltas.forEach((di) => {
    html += '<tr>';
    html += `<th class="sensitivity-grid__axis">${fmt(di)}</th>`;
    retornoDeltas.forEach(dr => {
      const age = grid[`${di},${dr}`];
      const ageText = typeof age === 'number' ? age : '—';
      const rgb = color(age);
      html += `<td style="--cell-rgb: ${rgb}">
        <span class="sensitivity-grid__value">${ageText}</span>
      </td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;

  document.getElementById('analiseSensibilidade').classList.add('hidden');
}

async function calcularResultadosMonteCarlo() {
  showLoader();
  await new Promise(resolve => setTimeout(resolve, 50));

  try {
    atualizarDadosBasicos();
    const numSimulacoes = parseInt(document.getElementById('mcNumSimulacoes').value, 10) || 1000;
    const resultadosMC = simularMonteCarlo(numSimulacoes);

    document.getElementById('mcP10').textContent = `€${Math.round(resultadosMC.p10).toLocaleString()}`;
    document.getElementById('mcP50').textContent = `€${Math.round(resultadosMC.p50).toLocaleString()}`;
    document.getElementById('mcP90').textContent = `€${Math.round(resultadosMC.p90).toLocaleString()}`;
    document.getElementById('mcTaxaSucesso').textContent = `${resultadosMC.taxaDeSucesso.toFixed(1)}%`;

    document.getElementById('mcIdadeOtimista').textContent =
      typeof resultadosMC.idadesFIRE.otimista === 'number'
        ? `${resultadosMC.idadesFIRE.otimista} anos`
        : resultadosMC.idadesFIRE.otimista;

    document.getElementById('mcIdadeMediana').textContent =
      typeof resultadosMC.idadesFIRE.mediana === 'number'
        ? `${resultadosMC.idadesFIRE.mediana} anos`
        : resultadosMC.idadesFIRE.mediana;

    document.getElementById('mcIdadePessimista').textContent =
      typeof resultadosMC.idadesFIRE.pessimista === 'number'
        ? `${resultadosMC.idadesFIRE.pessimista} anos`
        : resultadosMC.idadesFIRE.pessimista;

    document.getElementById('resultadosMonteCarlo').classList.remove('hidden');
    criarGraficoMonteCarloDistribution(resultadosMC.resultados);
  } finally {
    hideLoader();
  }
}

function exportarDados() {
  const dadosString = JSON.stringify(dadosApp, null, 2);
  const blob = new Blob([dadosString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dados-calculadora-fire.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importarDados() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dadosImportados = JSON.parse(e.target.result);
        if (dadosImportados && dadosImportados.dadosBasicos) {
          Object.assign(dadosApp, dadosImportados);
          salvarDadosNoLocalStorage();
          popularDadosIniciais();
          calcularResultados();
          alert(translate('successDataImported'));
        } else {
          alert(translate('errorInvalidDataFile'));
        }
      } catch (error) {
        alert(translate('errorReadingDataFile'));
        console.error('Error importing data:', error);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

async function calcularSRR() {
  showLoader();
  await new Promise(resolve => setTimeout(resolve, 50));

  try {
    const srrDuration = parseInt(document.getElementById('srrDuration').value, 10);
    const srrReturn = parseFloat(document.getElementById('srrReturn').value);

    const originalResults = simularEvolucaoPatrimonial();
    const stressResults = simularSequenceOfReturnsRisk(srrDuration, srrReturn);

    document.getElementById('sequenceOfReturnsRisk').classList.remove('hidden');
    criarGraficoSequenceOfReturns(originalResults.historicoPatrimonialAnual, stressResults.historicoPatrimonialAnual);
  } finally {
    hideLoader();
  }
}

function handleTableActions(event) {
  const target = event.target;
  if (!target.matches('.btn-action')) return;

  const action = target.dataset.action;
  const id = parseInt(target.dataset.id, 10);
  const table = target.closest('table');

  if (!action || !id || !table) return;

  const tipo = tableToTipo[table.id];
  if (!tipo) return;

  if (action === 'editar') editarItem(tipo, id);
  else if (action === 'remover') removerItem(tipo, id);
}

const investmentTemplates = {
  conservador: [
    { id: 1, tipo: 'Obrigações Governamentais', valorMensal: 600, taxaEsperada: 2.5, desvioPadrao: 2, dataInicio: '2025-01-01', dataFim: '2055-01-01', descricao: 'Baixo Risco' },
    { id: 2, tipo: 'PPR Defensivo', valorMensal: 200, taxaEsperada: 3, desvioPadrao: 4, dataInicio: '2025-01-01', dataFim: '2055-01-01', descricao: 'Benefícios Fiscais' },
    { id: 3, tipo: 'Depósitos a Prazo', valorMensal: 200, taxaEsperada: 1.5, desvioPadrao: 1, dataInicio: '2025-01-01', dataFim: '2055-01-01', descricao: 'Capital Garantido' }
  ],
  moderado: [
    { id: 1, tipo: 'ETF Global (VWCE)', valorMensal: 500, taxaEsperada: 7, desvioPadrao: 16, dataInicio: '2025-01-01', dataFim: '2055-01-01', descricao: 'Diversificação Global' },
    { id: 2, tipo: 'Imobiliário (REITs)', valorMensal: 300, taxaEsperada: 5, desvioPadrao: 12, dataInicio: '2025-01-01', dataFim: '2055-01-01', descricao: 'Rendimento Passivo' },
    { id: 3, tipo: 'PPR Equilibrado', valorMensal: 200, taxaEsperada: 5.5, desvioPadrao: 10, dataInicio: '2025-01-01', dataFim: '2055-01-01', descricao: 'Crescimento e Segurança' }
  ],
  agressivo: [
    { id: 1, tipo: 'ETF Global (VWCE)', valorMensal: 600, taxaEsperada: 8, desvioPadrao: 18, dataInicio: '2025-01-01', dataFim: '2055-01-01', descricao: 'Máximo Crescimento' },
    { id: 2, tipo: 'Ações de Tecnologia (QQQ)', valorMensal: 250, taxaEsperada: 12, desvioPadrao: 28, dataInicio: '2025-01-01', dataFim: '2055-01-01', descricao: 'Alto Potencial' },
    { id: 3, tipo: 'Criptomoedas (BTC/ETH)', valorMensal: 150, taxaEsperada: 15, desvioPadrao: 50, dataInicio: '2025-01-01', dataFim: '2055-01-01', descricao: 'Elevado Risco/Retorno' }
  ]
};

function aplicarTemplateInvestimento(nomeTemplate) {
  if (!investmentTemplates[nomeTemplate]) return;

  const templateDeposits = JSON.parse(JSON.stringify(investmentTemplates[nomeTemplate]));

  if (dadosApp.depositosDiversificados.length > 0 && confirm(translate('confirmAddTemplate'))) {
    const maxId = Math.max(0, ...dadosApp.depositosDiversificados.map(d => d.id));
    templateDeposits.forEach((dep, index) => {
      dep.id = maxId + 1 + index;
    });
    dadosApp.depositosDiversificados.push(...templateDeposits);
  } else {
    dadosApp.depositosDiversificados = templateDeposits;
  }

  depositoManager.atualizarTabela();
  salvarDadosNoLocalStorage();
  calcularResultados();
  document.getElementById('investmentTemplate').value = '';
}

function salvarTemplatePersonalizado() {
  const nomeTemplate = prompt(translate('promptTemplateName'));
  if (!nomeTemplate || nomeTemplate.trim() === '') {
    alert(translate('errorEmptyTemplateName'));
    return;
  }

  const nomeNormalizado = nomeTemplate.trim().toLowerCase();
  if (investmentTemplates[nomeNormalizado]) {
    alert(translate('errorTemplateNameExists'));
    return;
  }

  if (dadosApp.depositosDiversificados.length === 0) {
    alert(translate('errorNoDepositsToSave'));
    return;
  }

  const novoTemplate = JSON.parse(JSON.stringify(dadosApp.depositosDiversificados));
  investmentTemplates[nomeNormalizado] = novoTemplate;

  const customTemplates = JSON.parse(localStorage.getItem('customInvestmentTemplates')) || {};
  customTemplates[nomeNormalizado] = novoTemplate;
  localStorage.setItem('customInvestmentTemplates', JSON.stringify(customTemplates));

  carregarTemplatesPersonalizados();
  alert(translate('successTemplateSaved').replace('{templateName}', nomeTemplate));
}

function carregarTemplatesPersonalizados() {
  const customTemplates = JSON.parse(localStorage.getItem('customInvestmentTemplates')) || {};
  const optgroup = document.getElementById('customTemplatesOptgroup');
  if (!optgroup) return;

  optgroup.innerHTML = '';
  let hasCustomTemplates = false;

  for (const nomeTemplate in customTemplates) {
    if (Object.hasOwnProperty.call(customTemplates, nomeTemplate)) {
      hasCustomTemplates = true;
      if (!investmentTemplates[nomeTemplate]) {
        investmentTemplates[nomeTemplate] = customTemplates[nomeTemplate];
      }

      const option = document.createElement('option');
      option.value = nomeTemplate;
      option.textContent = nomeTemplate.charAt(0).toUpperCase() + nomeTemplate.slice(1);
      optgroup.appendChild(option);
    }
  }
  optgroup.hidden = !hasCustomTemplates;
}

function configurarEventListeners() {
  const mainContainer = document.querySelector('main.container');
  mainContainer.addEventListener('click', handleTableActions);

  document.getElementById('formDadosBasicos').addEventListener('change', () => {
    atualizarDadosBasicos();
    calcularResultados();
    calcularResultadosMonteCarlo();
  });

  document.getElementById('btnCalcular').addEventListener('click', calcularResultados);
  document.getElementById('btnCalcularMonteCarlo').addEventListener('click', calcularResultadosMonteCarlo);
  document.getElementById('btnDownloadPDF').addEventListener('click', gerarPDF);
  document.getElementById('btnExportarDados').addEventListener('click', exportarDados);
  document.getElementById('btnImportarDados').addEventListener('click', importarDados);
  document.getElementById('btnSalvarTemplate').addEventListener('click', salvarTemplatePersonalizado);

  document.getElementById('btnAdicionarDeposito').addEventListener('click', () => depositoManager.mostrarForm());
  document.getElementById('btnSalvarDeposito').addEventListener('click', () => salvarItem('deposito'));
  document.getElementById('btnCancelarDeposito').addEventListener('click', () => depositoManager.esconderForm());

  document.getElementById('btnAdicionarEventoUnico').addEventListener('click', () => eventoUnicoManager.mostrarForm());
  document.getElementById('btnSalvarEventoUnico').addEventListener('click', () => salvarItem('eventoUnico'));
  document.getElementById('btnCancelarEventoUnico').addEventListener('click', () => eventoUnicoManager.esconderForm());

  document.getElementById('btnAdicionarEventoRecorrente').addEventListener('click', () => eventoRecorrenteManager.mostrarForm());
  document.getElementById('btnSalvarEventoRecorrente').addEventListener('click', () => salvarItem('eventoRecorrente'));
  document.getElementById('btnCancelarEventoRecorrente').addEventListener('click', () => eventoRecorrenteManager.esconderForm());

  document.getElementById('btnAdicionarDespesa').addEventListener('click', () => despesaManager.mostrarForm());
  document.getElementById('btnSalvarDespesa').addEventListener('click', () => salvarItem('despesa'));
  document.getElementById('btnCancelarDespesa').addEventListener('click', () => despesaManager.esconderForm());

  const taxaRetiradaSlider = document.getElementById('taxaRetirada');
  taxaRetiradaSlider.addEventListener('input', (e) => {
    document.getElementById('taxaRetiradaValue').textContent = e.target.value + '%';
    dadosApp.dadosBasicos.taxaRetirada = parseFloat(e.target.value);
    salvarDadosNoLocalStorage();
  });

  document.getElementById('investmentTemplate').addEventListener('change', (e) => {
    const template = e.target.value;
    if (template) {
      aplicarTemplateInvestimento(template);
    }
  });

  document.getElementById('chart-granularity').addEventListener('change', calcularResultados);

  const periodButtons = document.querySelectorAll('.btn-group[role="toolbar"] .btn');
  const granularitySelect = document.getElementById('chart-granularity');
  periodButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      periodButtons.forEach(btn => btn.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const period = e.currentTarget.dataset.period;
      if (period === '1M' || period === '6M') {
        granularitySelect.value = 'mensal';
      }
      calcularResultados();
    });
  });

  document.getElementById('btnSimularSRR').addEventListener('click', calcularSRR);

  window.addEventListener('language-changed', () => {
    refreshAllTables();
    adicionarTooltips();
  });
}

function setupThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  const sunIcon = themeToggle.querySelector('.sun');
  const moonIcon = themeToggle.querySelector('.moon');

  const savedTheme = localStorage.getItem('color-scheme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  applyTheme(currentTheme);

  themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(currentTheme);
    localStorage.setItem('color-scheme', currentTheme);
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-color-scheme', theme);

    if (theme === 'dark') {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    } else {
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    }
  }
}

function setupLanguageSwitcher() {
  const langSelector = document.getElementById('lang-selector');
  const langDropdown = document.getElementById('lang-dropdown');

  langSelector.addEventListener('click', () => {
    langDropdown.classList.toggle('hidden');
  });

  document.querySelectorAll('.lang-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      const lang = e.currentTarget.dataset.lang;
      setLanguage(lang);
      langDropdown.classList.add('hidden');
    });
  });

  document.addEventListener('click', (e) => {
    if (!langSelector.contains(e.target) && !langDropdown.contains(e.target)) {
      langDropdown.classList.add('hidden');
    }
  });
}

async function inicializarApp() {
  showLoader();
  try {
    setupThemeToggle();
    setupLanguageSwitcher();
    await setLanguage('pt');
    carregarDadosDoLocalStorage();
    configurarEventListeners();
    popularDadosIniciais();
    carregarTemplatesPersonalizados();
    await calcularResultados();
    await calcularResultadosMonteCarlo();
    translateUI();
    adicionarTooltips();
  } finally {
    hideLoader();
  }
}

document.addEventListener('DOMContentLoaded', inicializarApp);

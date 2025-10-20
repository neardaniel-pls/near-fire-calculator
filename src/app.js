const unused = 1;
import {
  dadosApp,
  estadoEdicao,
  salvarDadosNoLocalStorage,
  carregarDadosDoLocalStorage
} from './state.js';

import {
  popularDadosIniciais,
  mostrarFormDeposito,
  esconderFormDeposito,
  preencherFormularioDeposito,
  getDadosFormularioDeposito,
  atualizarTabelaDepositos,
  mostrarFormEventoUnico,
  esconderFormEventoUnico,
  preencherFormularioEventoUnico,
  getDadosFormularioEventoUnico,
  atualizarTabelaEventosUnicos,
  mostrarFormEventoRecorrente,
  esconderFormEventoRecorrente,
  preencherFormularioEventoRecorrente,
  getDadosFormularioEventoRecorrente,
  atualizarTabelaEventosRecorrentes,
  mostrarFormDespesa,
  esconderFormDespesa,
  preencherFormularioDespesa,
  getDadosFormularioDespesa,
  atualizarTabelaDespesasVariaveis,
  showLoader,
  hideLoader,
  adicionarTooltips
} from './ui.js';

import { simularEvolucaoPatrimonial, simularMonteCarlo, simularSequenceOfReturnsRisk } from './calculator.js';
import { atualizarGraficos, criarGraficoMonteCarloDistribution, criarGraficoSequenceOfReturns } from './charts.js';
import { gerarPDF } from './pdf.js';
import { setLanguage, translateUI } from './i18n.js';

// --- Funções de Lógica de Negócio (Handlers) ---

function editarDeposito(id) {
  const dep = dadosApp.depositosDiversificados.find(d => d.id === id);
  if (!dep) return;

  preencherFormularioDeposito(dep);
  estadoEdicao.deposito = id;
  mostrarFormDeposito(true);
}

function removerDeposito(id) {
  dadosApp.depositosDiversificados = dadosApp.depositosDiversificados.filter(d => d.id !== id);
  atualizarTabelaDepositos();
  salvarDadosNoLocalStorage();
}

function editarEventoUnico(id) {
  const ev = dadosApp.eventosFinanceiros.unicos.find(e => e.id === id);
  if (!ev) return;

  preencherFormularioEventoUnico(ev);
  estadoEdicao.eventoUnico = id;
  mostrarFormEventoUnico(true);
}

function removerEventoUnico(id) {
  dadosApp.eventosFinanceiros.unicos = dadosApp.eventosFinanceiros.unicos.filter(e => e.id !== id);
  atualizarTabelaEventosUnicos();
  salvarDadosNoLocalStorage();
}

function editarEventoRecorrente(id) {
  const ev = dadosApp.eventosFinanceiros.recorrentes.find(e => e.id === id);
  if (!ev) return;

  preencherFormularioEventoRecorrente(ev);
  estadoEdicao.eventoRecorrente = id;
  mostrarFormEventoRecorrente(true);
}

function removerEventoRecorrente(id) {
  dadosApp.eventosFinanceiros.recorrentes = dadosApp.eventosFinanceiros.recorrentes.filter(e => e.id !== id);
  atualizarTabelaEventosRecorrentes();
  salvarDadosNoLocalStorage();
}

function editarDespesa(id) {
  const desp = dadosApp.despesasVariaveis.find(d => d.id === id);
  if (!desp) return;

  preencherFormularioDespesa(desp);
  estadoEdicao.despesa = id;
  mostrarFormDespesa(true);
}

function removerDespesa(id) {
  dadosApp.despesasVariaveis = dadosApp.despesasVariaveis.filter(d => d.id !== id);
  atualizarTabelaDespesasVariaveis();
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
  const mapping = {
    deposito: {
      getDados: getDadosFormularioDeposito,
      estado: 'deposito',
      lista: dadosApp.depositosDiversificados,
      atualizar: atualizarTabelaDepositos,
      esconder: esconderFormDeposito
    },
    eventoUnico: {
      getDados: getDadosFormularioEventoUnico,
      estado: 'eventoUnico',
      lista: dadosApp.eventosFinanceiros.unicos,
      atualizar: atualizarTabelaEventosUnicos,
      esconder: esconderFormEventoUnico
    },
    eventoRecorrente: {
      getDados: getDadosFormularioEventoRecorrente,
      estado: 'eventoRecorrente',
      lista: dadosApp.eventosFinanceiros.recorrentes,
      atualizar: atualizarTabelaEventosRecorrentes,
      esconder: esconderFormEventoRecorrente
    },
    despesa: {
      getDados: getDadosFormularioDespesa,
      estado: 'despesa',
      lista: dadosApp.despesasVariaveis,
      atualizar: atualizarTabelaDespesasVariaveis,
      esconder: esconderFormDespesa
    }
  };

  const config = mapping[tipo];
  if (!config) return;

  const dadosFormulario = config.getDados();
  const idEdicao = estadoEdicao[config.estado];

  if (idEdicao) {
    const index = config.lista.findIndex(item => item.id === idEdicao);
    if (index !== -1) {
      config.lista[index] = { ...config.lista[index], ...dadosFormulario };
    }
    estadoEdicao[config.estado] = null;
  } else {
    const novoItem = { ...dadosFormulario, id: Date.now() };
    config.lista.push(novoItem);
  }

  config.atualizar();
  config.esconder();
  salvarDadosNoLocalStorage();
}

function calcularResultados() {
  atualizarDadosBasicos();
  const resultados = simularEvolucaoPatrimonial();

  // Atualizar a interface com os resultados
  document.getElementById('valorFIRE').textContent = `€${Math.round(resultados.valorFIRE).toLocaleString()}`;
  document.getElementById('idadeFIRE').textContent = resultados.idadeFIRE;
  document.getElementById('taxaRetornoNominal').textContent = `${resultados.taxaRetornoNominal.toFixed(2)}%`;
  document.getElementById('taxaRetornoReal').textContent = `${resultados.taxaRetornoReal.toFixed(2)}%`;

  atualizarGraficos(resultados);
}

async function calcularResultadosMonteCarlo() {
  showLoader();
  await new Promise(resolve => setTimeout(resolve, 50)); // Allow UI to update

  try {
    atualizarDadosBasicos();
    const numSimulacoes = parseInt(document.getElementById('mcNumSimulacoes').value, 10) || 1000;
    const resultadosMC = simularMonteCarlo(numSimulacoes);

    document.getElementById('mcP10').textContent = `€${Math.round(resultadosMC.p10).toLocaleString()}`;
    document.getElementById('mcP50').textContent = `€${Math.round(resultadosMC.p50).toLocaleString()}`;
    document.getElementById('mcP90').textContent = `€${Math.round(resultadosMC.p90).toLocaleString()}`;
    document.getElementById('mcTaxaSucesso').textContent = `${resultadosMC.taxaDeSucesso.toFixed(1)}%`;

    const resultadosSection = document.getElementById('resultadosMonteCarlo');
    resultadosSection.classList.remove('hidden');

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
        // Validação básica dos dados importados
        if (dadosImportados && dadosImportados.dadosBasicos) {
          Object.assign(dadosApp, dadosImportados);
          salvarDadosNoLocalStorage();
          popularDadosIniciais();
          calcularResultados();
          alert('Dados importados com sucesso!');
        } else {
          alert('Arquivo de dados inválido.');
        }
      } catch (error) {
        alert('Erro ao ler o arquivo de dados.');
        console.error('Erro ao importar dados:', error);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

async function calcularSRR() {
  showLoader();
  await new Promise(resolve => setTimeout(resolve, 50)); // Allow UI to update

  try {
    const srrDuration = parseInt(document.getElementById('srrDuration').value, 10);
    const srrReturn = parseFloat(document.getElementById('srrReturn').value);

    const originalResults = simularEvolucaoPatrimonial();
    const stressResults = simularSequenceOfReturnsRisk(srrDuration, srrReturn);

    const srrSection = document.getElementById('sequenceOfReturnsRisk');
    srrSection.classList.remove('hidden');

    criarGraficoSequenceOfReturns(originalResults.historicoPatrimonialAnual, stressResults.historicoPatrimonialAnual);
  } finally {
    hideLoader();
  }
}

// --- Configuração de Event Listeners ---

function handleTableActions(event) {
  const target = event.target;
  if (!target.matches('.btn-action')) return;

  const action = target.dataset.action;
  const id = parseInt(target.dataset.id, 10);
  const table = target.closest('table');

  if (!action || !id || !table) return;

  switch (table.id) {
  case 'tabelaDepositos':
    if (action === 'editar') editarDeposito(id);
    else if (action === 'remover') removerDeposito(id);
    break;
  case 'tabelaEventosUnicos':
    if (action === 'editar') editarEventoUnico(id);
    else if (action === 'remover') removerEventoUnico(id);
    break;
  case 'tabelaEventosRecorrentes':
    if (action === 'editar') editarEventoRecorrente(id);
    else if (action === 'remover') removerEventoRecorrente(id);
    break;
  case 'tabelaDespesasVariaveis':
    if (action === 'editar') editarDespesa(id);
    else if (action === 'remover') removerDespesa(id);
    break;
  }
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

  // Se já existirem depósitos, perguntar ao utilizador
  if (dadosApp.depositosDiversificados.length > 0 && confirm('Deseja adicionar os depósitos do template à sua lista existente? \n\nOK = Adicionar \nCancelar = Substituir a lista atual')) {
    // Adicionar aos existentes
    const maxId = Math.max(0, ...dadosApp.depositosDiversificados.map(d => d.id));
    templateDeposits.forEach((dep, index) => {
      // Garantir IDs únicos
      dep.id = maxId + 1 + index;
    });
    dadosApp.depositosDiversificados.push(...templateDeposits);
  } else {
    // Substituir
    dadosApp.depositosDiversificados = templateDeposits;
  }

  atualizarTabelaDepositos();
  salvarDadosNoLocalStorage();
  calcularResultados();

  // Resetar o seletor para o valor padrão para evitar reaplicação acidental
  document.getElementById('investmentTemplate').value = '';
}

function salvarTemplatePersonalizado() {
  const nomeTemplate = prompt('Digite um nome para o seu novo template de investimentos:');
  if (!nomeTemplate || nomeTemplate.trim() === '') {
    alert('O nome do template não pode estar vazio.');
    return;
  }

  const nomeNormalizado = nomeTemplate.trim().toLowerCase();
  if (investmentTemplates[nomeNormalizado]) {
    alert('Já existe um template com esse nome. Por favor, escolha outro.');
    return;
  }

  if (dadosApp.depositosDiversificados.length === 0) {
    alert('Não existem depósitos na lista para salvar como um template.');
    return;
  }

  // Clonar os depósitos atuais para o novo template
  const novoTemplate = JSON.parse(JSON.stringify(dadosApp.depositosDiversificados));

  // Adicionar ao objeto de templates em memória
  investmentTemplates[nomeNormalizado] = novoTemplate;

  // Guardar nos templates personalizados no localStorage
  const customTemplates = JSON.parse(localStorage.getItem('customInvestmentTemplates')) || {};
  customTemplates[nomeNormalizado] = novoTemplate;
  localStorage.setItem('customInvestmentTemplates', JSON.stringify(customTemplates));

  // Atualizar a lista dropdown
  carregarTemplatesPersonalizados();

  alert(`Template "${nomeTemplate}" salvo com sucesso!`);
}

function carregarTemplatesPersonalizados() {
  const customTemplates = JSON.parse(localStorage.getItem('customInvestmentTemplates')) || {};
  const optgroup = document.getElementById('customTemplatesOptgroup');
  if (!optgroup) return;

  optgroup.innerHTML = ''; // Limpar para evitar duplicados
  let hasCustomTemplates = false;

  for (const nomeTemplate in customTemplates) {
    if (Object.hasOwnProperty.call(customTemplates, nomeTemplate)) {
      hasCustomTemplates = true;
      // Adicionar ao objeto de templates em memória se ainda não existir
      if (!investmentTemplates[nomeTemplate]) {
        investmentTemplates[nomeTemplate] = customTemplates[nomeTemplate];
      }

      // Adicionar à lista dropdown
      const option = document.createElement('option');
      option.value = nomeTemplate;
      option.textContent = nomeTemplate.charAt(0).toUpperCase() + nomeTemplate.slice(1); // Capitalize
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

  // Depósitos
  document.getElementById('btnAdicionarDeposito').addEventListener('click', mostrarFormDeposito);
  document.getElementById('btnSalvarDeposito').addEventListener('click', () => salvarItem('deposito'));
  document.getElementById('btnCancelarDeposito').addEventListener('click', esconderFormDeposito);

  // Eventos Únicos
  document.getElementById('btnAdicionarEventoUnico').addEventListener('click', mostrarFormEventoUnico);
  document.getElementById('btnSalvarEventoUnico').addEventListener('click', () => salvarItem('eventoUnico'));
  document.getElementById('btnCancelarEventoUnico').addEventListener('click', esconderFormEventoUnico);

  // Eventos Recorrentes
  document.getElementById('btnAdicionarEventoRecorrente').addEventListener('click', mostrarFormEventoRecorrente);
  document.getElementById('btnSalvarEventoRecorrente').addEventListener('click', () => salvarItem('eventoRecorrente'));
  document.getElementById('btnCancelarEventoRecorrente').addEventListener('click', esconderFormEventoRecorrente);

  // Despesas
  document.getElementById('btnAdicionarDespesa').addEventListener('click', mostrarFormDespesa);
  document.getElementById('btnSalvarDespesa').addEventListener('click', () => salvarItem('despesa'));
  document.getElementById('btnCancelarDespesa').addEventListener('click', esconderFormDespesa);
    
  // Slider
  const taxaRetiradaSlider = document.getElementById('taxaRetirada');
  taxaRetiradaSlider.addEventListener('input', (e) => {
    document.getElementById('taxaRetiradaValue').textContent = e.target.value + '%';
    dadosApp.dadosBasicos.taxaRetirada = parseFloat(e.target.value);
    salvarDadosNoLocalStorage();
  });

  // Investment Template Selector
  document.getElementById('investmentTemplate').addEventListener('change', (e) => {
    const template = e.target.value;
    if (template) {
      aplicarTemplateInvestimento(template);
    }
  });
  // Chart Controls
  document.getElementById('chart-granularity').addEventListener('change', calcularResultados);
   
  const periodButtons = document.querySelectorAll('.btn-group[role="toolbar"] .btn');
  periodButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      periodButtons.forEach(btn => btn.classList.remove('active'));
      e.currentTarget.classList.add('active');
      calcularResultados();
    });
  });

  document.getElementById('btnSimularSRR').addEventListener('click', calcularSRR);
}

// --- Language Switcher ---
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

// --- Inicialização da Aplicação ---

async function inicializarApp() {
  showLoader();
  try {
    setupLanguageSwitcher();
    await setLanguage('pt'); // Set default language
    carregarDadosDoLocalStorage();
    configurarEventListeners();
    popularDadosIniciais();
    carregarTemplatesPersonalizados(); // Carregar templates guardados
    await calcularResultados();
    await calcularResultadosMonteCarlo();
    translateUI();
    adicionarTooltips();
  } finally {
    hideLoader();
  }
}

document.addEventListener('DOMContentLoaded', inicializarApp);

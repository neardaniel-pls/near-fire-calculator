import { dadosApp, estadoEdicao } from './state.js';
import { translate, currentLanguage } from './i18n.js';

function createFormManager(config) {
  function mostrarForm(isEditing = false) {
    document.getElementById(config.formId).classList.remove('hidden');
    document.getElementById(config.saveBtnId).textContent = isEditing ? translate('update') : translate('save');
  }

  function esconderForm() {
    document.getElementById(config.formId).classList.add('hidden');
    limparForm();
  }

  function limparForm() {
    config.fields.forEach(field => {
      const el = document.getElementById(field.id);
      if (el) {
        el.value = field.default !== undefined ? field.default : '';
      }
    });
    estadoEdicao[config.editStateKey] = null;
    document.getElementById(config.saveBtnId).textContent = translate('save');
  }

  function preencherFormulario(data) {
    config.fields.forEach(field => {
      const el = document.getElementById(field.id);
      if (el && data[field.key] !== undefined) {
        el.value = data[field.key];
      }
    });
  }

  function getDadosFormulario() {
    const data = {};
    config.fields.forEach(field => {
      const el = document.getElementById(field.id);
      if (!el) return;
      if (field.type === 'number') {
        data[field.key] = parseFloat(el.value) || (field.default !== undefined ? field.default : 0);
      } else {
        data[field.key] = el.value || '';
      }
    });
    return data;
  }

  function atualizarTabela() {
    const tbody = document.querySelector(config.tableSelector);
    tbody.innerHTML = '';

    const items = config.getList();
    items.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = config.renderRow(item);
      tbody.appendChild(row);
    });

    if (config.onUpdate) {
      config.onUpdate();
    }
  }

  return {
    mostrarForm,
    esconderForm,
    preencherFormulario,
    getDadosFormulario,
    atualizarTabela,
  };
}

const NOMES_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const locale = () => {
  const lang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'pt';
  return lang === 'en' ? 'en-GB' : 'pt-PT';
};

const depositoManager = createFormManager({
  formId: 'formNovoDeposito',
  saveBtnId: 'btnSalvarDeposito',
  tableSelector: '#tabelaDepositos tbody',
  editStateKey: 'deposito',
  getList: () => dadosApp.depositosDiversificados,
  fields: [
    { id: 'tipoInvestimento', key: 'tipo', type: 'text' },
    { id: 'valorMensal', key: 'valorMensal', type: 'number', default: 0 },
    { id: 'taxaEsperada', key: 'taxaEsperada', type: 'number', default: 0 },
    { id: 'desvioPadrao', key: 'desvioPadrao', type: 'number', default: 15 },
    { id: 'dataInicio', key: 'dataInicio', type: 'text' },
    { id: 'dataFim', key: 'dataFim', type: 'text' },
    { id: 'descricaoInvestimento', key: 'descricao', type: 'text' },
  ],
  renderRow: (dep) => `
    <td>${dep.tipo}</td>
    <td>€${dep.valorMensal.toLocaleString()}</td>
    <td>${dep.taxaEsperada}%</td>
    <td>${dep.desvioPadrao}%</td>
    <td>${new Date(dep.dataInicio).toLocaleDateString(locale())}</td>
    <td>${new Date(dep.dataFim).toLocaleDateString(locale())}</td>
    <td>${dep.descricao}</td>
    <td>
      <button class="btn-action btn-edit" data-action="editar" data-id="${dep.id}">${translate('edit')}</button>
      <button class="btn-action btn-remove" data-action="remover" data-id="${dep.id}">${translate('remove')}</button>
    </td>`,
  onUpdate: calcularTaxaRetornoPonderada,
});

const eventoUnicoManager = createFormManager({
  formId: 'formNovoEventoUnico',
  saveBtnId: 'btnSalvarEventoUnico',
  tableSelector: '#tabelaEventosUnicos tbody',
  editStateKey: 'eventoUnico',
  getList: () => dadosApp.eventosFinanceiros.unicos,
  fields: [
    { id: 'anoEvento', key: 'ano', type: 'number', default: new Date().getFullYear() },
    { id: 'mesEvento', key: 'mes', type: 'number', default: 1 },
    { id: 'tipoEvento', key: 'tipo', type: 'text', default: 'Depósito' },
    { id: 'valorEvento', key: 'valor', type: 'number', default: 0 },
    { id: 'descricaoEvento', key: 'descricao', type: 'text' },
  ],
  renderRow: (evento) => `
    <td>${evento.ano}</td>
    <td>${NOMES_MESES[evento.mes - 1]}</td>
    <td>${evento.tipo}</td>
    <td>€${evento.valor.toLocaleString()}</td>
    <td>${evento.descricao}</td>
    <td>
      <button class="btn-action btn-edit" data-action="editar" data-id="${evento.id}">${translate('edit')}</button>
      <button class="btn-action btn-remove" data-action="remover" data-id="${evento.id}">${translate('remove')}</button>
    </td>`,
});

const eventoRecorrenteManager = createFormManager({
  formId: 'formNovoEventoRecorrente',
  saveBtnId: 'btnSalvarEventoRecorrente',
  tableSelector: '#tabelaEventosRecorrentes tbody',
  editStateKey: 'eventoRecorrente',
  getList: () => dadosApp.eventosFinanceiros.recorrentes,
  fields: [
    { id: 'anoInicioEvento', key: 'anoInicio', type: 'number', default: new Date().getFullYear() },
    { id: 'anoFimEvento', key: 'anoFim', type: 'number', default: new Date().getFullYear() },
    { id: 'tipoEventoRecorrente', key: 'tipo', type: 'text', default: 'Depósito' },
    { id: 'periodicidadeEvento', key: 'periodicidade', type: 'text', default: 'Mensal' },
    { id: 'valorPeriodoEvento', key: 'valorPeriodo', type: 'number', default: 0 },
    { id: 'descricaoEventoRecorrente', key: 'descricao', type: 'text' },
  ],
  renderRow: (evento) => {
    const tipo = evento.tipo || 'Depósito';
    return `
    <td>${evento.anoInicio}-${evento.anoFim}</td>
    <td>${tipo}</td>
    <td>${evento.periodicidade}</td>
    <td>€${evento.valorPeriodo.toLocaleString()}</td>
    <td>${evento.descricao}</td>
    <td>
      <button class="btn-action btn-edit" data-action="editar" data-id="${evento.id}">${translate('edit')}</button>
      <button class="btn-action btn-remove" data-action="remover" data-id="${evento.id}">${translate('remove')}</button>
    </td>`;
  },
});

const despesaManager = createFormManager({
  formId: 'formNovaDespesa',
  saveBtnId: 'btnSalvarDespesa',
  tableSelector: '#tabelaDespesasVariaveis tbody',
  editStateKey: 'despesa',
  getList: () => dadosApp.despesasVariaveis,
  fields: [
    { id: 'descricaoDespesa', key: 'descricao', type: 'text' },
    { id: 'valorMensalDespesa', key: 'valorMensal', type: 'number', default: 0 },
    { id: 'anoInicioDespesa', key: 'anoInicio', type: 'number', default: new Date().getFullYear() },
    { id: 'anoFimDespesa', key: 'anoFim', type: 'number', default: new Date().getFullYear() },
  ],
  renderRow: (despesa) => `
    <td>${despesa.descricao}</td>
    <td>€${despesa.valorMensal.toLocaleString()}</td>
    <td>${despesa.anoInicio}</td>
    <td>${despesa.anoFim}</td>
    <td>
      <button class="btn-action btn-edit" data-action="editar" data-id="${despesa.id}">${translate('edit')}</button>
      <button class="btn-action btn-remove" data-action="remover" data-id="${despesa.id}">${translate('remove')}</button>
    </td>`,
});

function calcularTaxaRetornoPonderada() {
  let totalValor = 0;
  let somaValorada = 0;

  dadosApp.depositosDiversificados.forEach(deposito => {
    totalValor += deposito.valorMensal;
    somaValorada += deposito.valorMensal * deposito.taxaEsperada;
  });

  const taxaPonderada = totalValor > 0 ? (somaValorada / totalValor) : 0;
  document.getElementById('taxaRetornoPonderada').textContent = taxaPonderada.toFixed(2) + '%';
}

function popularDadosIniciais() {
  const dadosBasicos = dadosApp.dadosBasicos;
  document.getElementById('taxaRetirada').value = dadosBasicos.taxaRetirada;
  document.getElementById('taxaRetiradaValue').textContent = dadosBasicos.taxaRetirada + '%';
  document.getElementById('inflacaoAnual').value = dadosBasicos.inflacaoAnual;
  document.getElementById('idadeAtual').value = dadosBasicos.idadeAtual;
  document.getElementById('idadeReforma').value = dadosBasicos.idadeReforma;
  document.getElementById('rendimentoAnual').value = dadosBasicos.rendimentoAnual;
  document.getElementById('despesasAnuais').value = dadosBasicos.despesasAnuais;
  document.getElementById('valorInvestido').value = dadosBasicos.valorInvestido;

  refreshAllTables();
}

function refreshAllTables() {
  depositoManager.atualizarTabela();
  eventoUnicoManager.atualizarTabela();
  eventoRecorrenteManager.atualizarTabela();
  despesaManager.atualizarTabela();
}

function mostrarMensagem(texto, tipo) {
  const mensagensExistentes = document.querySelectorAll('.status-message');
  mensagensExistentes.forEach(msg => msg.remove());

  const mensagem = document.createElement('div');
  mensagem.className = `status-message status-message--${tipo}`;
  mensagem.textContent = texto;

  const main = document.querySelector('main');
  main.insertBefore(mensagem, main.firstChild);

  setTimeout(() => {
    if (mensagem.parentNode) {
      mensagem.remove();
    }
  }, 5000);
}

function showLoader() {
  document.getElementById('loader').classList.remove('hidden');
}

function hideLoader() {
  document.getElementById('loader').classList.add('hidden');
}

function criarTooltip(texto) {
  const container = document.createElement('div');
  container.className = 'tooltip-container';

  const icon = document.createElement('span');
  icon.className = 'tooltip-icon';
  icon.textContent = 'i';

  const text = document.createElement('div');
  text.className = 'tooltip-text';
  text.textContent = texto;

  container.appendChild(icon);
  container.appendChild(text);

  return container;
}

function adicionarTooltips() {
  document.querySelectorAll('.tooltip-container').forEach(tooltip => tooltip.remove());

  const sections = {
    'basicData': 'basicDataInfo',
    'diversifiedDeposits': 'diversifiedDepositsInfo',
    'uniqueFinancialEvents': 'uniqueFinancialEventsInfo',
    'recurringFinancialEvents': 'recurringFinancialEventsInfo',
    'variableExpenses': 'variableExpensesInfo',
    'results': 'resultsInfo',
    'sensitivityAnalysis': 'sensitivityAnalysisTooltip',
    'monteCarloSimulationResults': 'monteCarloSimulationInfo',
    'assetEvolution': 'assetEvolutionInfo',
    'expenseEvolution': 'expenseEvolutionInfo',
    'assetDistribution': 'assetDistributionInfo'
  };

  for (const sectionKey in sections) {
    const header = document.querySelector(`h2[data-i18n-key="${sectionKey}"]`);
    if (header) {
      const tooltipKey = sections[sectionKey];
      const tooltipText = translate(tooltipKey);
      const tooltip = criarTooltip(tooltipText);
      header.appendChild(tooltip);
    }
  }
}

export {
  popularDadosIniciais,
  showLoader,
  hideLoader,
  mostrarMensagem,
  criarTooltip,
  adicionarTooltips,
  refreshAllTables,
  depositoManager,
  eventoUnicoManager,
  eventoRecorrenteManager,
  despesaManager,
};

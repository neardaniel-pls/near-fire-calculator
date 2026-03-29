import { dadosApp } from './state.js';
import { simularEvolucaoPatrimonial, simularMonteCarlo } from './calculator.js';
import { mostrarMensagem } from './ui.js';

function gerarPDF() {
  try {
    mostrarMensagem('Gerando PDF...', 'info');

    if (!window.jspdf) {
      throw new Error('Biblioteca jsPDF não está carregada. Por favor, aguarde um momento e tente novamente.');
    }

    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
      throw new Error('Biblioteca jsPDF não está carregada. Por favor, aguarde um momento e tente novamente.');
    }

    const doc = new jsPDF();
    if (typeof doc.autoTable !== 'function') {
      throw new Error('Plugin jsPDF-AutoTable não está carregado.');
    }

    const resultados = simularEvolucaoPatrimonial();
    const mcResults = simularMonteCarlo(1000);

    let yPos = 0;

    const addHeader = () => {
      doc.setFillColor(124, 58, 237);
      doc.rect(0, 0, 210, 45, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Análise FIRE', 20, 20);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Independência Financeira, Aposentadoria Antecipada', 20, 30);

      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255, 0.8);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-PT')}`, 20, 38);

      doc.setDrawColor(168, 85, 247);
      doc.setLineWidth(2);
      doc.line(20, 48, 190, 48);
      yPos = 58;
    };

    const addFooter = () => {
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        doc.setFillColor(248, 250, 252);
        doc.rect(0, 277, 210, 20, 'F');

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(`Página ${i} de ${pageCount}`, 175, 288);

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Calculadora FIRE © 2025', 20, 288);
      }
    };

    const checkPageBreak = (neededHeight) => {
      if (yPos + neededHeight > 280) {
        doc.addPage();
        addHeader();
      }
    };

    const addDataRow = (label, value) => {
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(label, 20, yPos);
      doc.text(value, 80, yPos);
      yPos += 7;
    };

    addHeader();

    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setTextColor(19, 52, 59);
    doc.text('Dados de Base', 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const { dadosBasicos } = dadosApp;
    doc.text(`Idade Atual: ${dadosBasicos.idadeAtual} anos`, 20, yPos);
    doc.text(`Valor Investido Inicial: €${dadosBasicos.valorInvestido.toLocaleString()}`, 100, yPos);
    yPos += 7;
    doc.text(`Rendimento Anual: €${dadosBasicos.rendimentoAnual.toLocaleString()}`, 20, yPos);
    doc.text(`Despesas Anuais Fixas: €${dadosBasicos.despesasAnuais.toLocaleString()}`, 100, yPos);
    yPos += 7;
    doc.text(`Taxa de Retirada Segura: ${dadosBasicos.taxaRetirada}%`, 20, yPos);
    doc.text(`Inflação Anual Esperada: ${dadosBasicos.inflacaoAnual}%`, 100, yPos);
    yPos += 15;

    checkPageBreak(50);

    doc.setFillColor(16, 185, 129);
    doc.roundedRect(20, yPos, 170, 10, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resultados da Simulação', 105, yPos + 7);
    yPos += 18;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    doc.setFillColor(124, 58, 237, 0.1);
    doc.roundedRect(20, yPos, 170, 25, 3, 3, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Valor FIRE: €${Math.round(resultados.valorFIRE).toLocaleString()}`, 105, yPos + 15);
    yPos += 30;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    addDataRow('Idade FIRE Estimada:', `${resultados.idadeFIRE} anos`);
    addDataRow('Taxa de Retorno Nominal:', `${resultados.taxaRetornoNominal.toFixed(2)}%`);
    addDataRow('Taxa de Retorno Real:', `${resultados.taxaRetornoReal.toFixed(2)}%`);

    yPos += 10;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 15;

    checkPageBreak(110);

    doc.setFillColor(124, 58, 237);
    doc.roundedRect(20, yPos, 170, 10, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Gráfico de Evolução Patrimonial', 105, yPos + 7);
    yPos += 18;

    const canvas = document.getElementById('chartEvolucaoPatrimonial');
    if (!canvas) {
      yPos += 10;
    } else {
      const imgData = canvas.toDataURL('image/png', 2.0);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, yPos, 170, 85, 3, 3, 'F');
      doc.addImage(imgData, 'PNG', 25, yPos + 5, 160, 75);
      yPos += 95;
    }

    const addTable = (title, headers, data, accentColor) => {
      checkPageBreak(50 + data.length * 12);

      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.roundedRect(20, yPos, 170, 10, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 105, yPos + 7);
      yPos += 18;

      doc.autoTable({
        startY: yPos,
        head: [headers],
        body: data,
        theme: 'grid',
        headStyles: {
          fillColor: [accentColor[0], accentColor[1], accentColor[2]],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [30, 41, 59],
          fontSize: 9,
          cellPadding: 4
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        styles: {
          lineWidth: 0.1,
          lineColor: [226, 232, 240]
        }
      });
      yPos = doc.autoTable.previous.finalY + 20;
    };

    addTable('Depósitos Diversificados',
      ['Tipo', 'Valor Mensal', 'Taxa Esperada', 'Descrição'],
      dadosApp.depositosDiversificados.map(d => [d.tipo, `€${d.valorMensal}`, `${d.taxaEsperada}%`, d.descricao]),
      [124, 58, 237]
    );

    addTable('Despesas Variáveis',
      ['Descrição', 'Valor Mensal', 'Início', 'Fim'],
      dadosApp.despesasVariaveis.map(d => [d.descricao, `€${d.valorMensal}`, d.anoInicio, d.anoFim]),
      [245, 158, 11]
    );

    checkPageBreak(110);

    doc.setFillColor(245, 158, 11);
    doc.roundedRect(20, yPos, 170, 10, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Gráfico de Alocação de Ativos', 105, yPos + 7);
    yPos += 18;

    const assetCanvas = document.getElementById('chartAssetAllocation');
    if (!assetCanvas) {
      yPos += 10;
    } else {
      const assetImgData = assetCanvas.toDataURL('image/png', 2.0);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, yPos, 170, 85, 3, 3, 'F');
      doc.addImage(assetImgData, 'PNG', 25, yPos + 5, 160, 75);
      yPos += 95;
    }

    checkPageBreak(110);

    doc.setFillColor(239, 68, 68);
    doc.roundedRect(20, yPos, 170, 10, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Gráfico de Evolução das Despesas', 105, yPos + 7);
    yPos += 18;

    const despesasCanvas = document.getElementById('chartDespesasVariaveis');
    if (!despesasCanvas) {
      yPos += 10;
    } else {
      const despesasImgData = despesasCanvas.toDataURL('image/png', 2.0);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, yPos, 170, 85, 3, 3, 'F');
      doc.addImage(despesasImgData, 'PNG', 25, yPos + 5, 160, 75);
      yPos += 95;
    }

    checkPageBreak(50);

    doc.setFillColor(14, 165, 233);
    doc.roundedRect(20, yPos, 170, 10, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Simulação de Monte Carlo', 105, yPos + 7);
    yPos += 18;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    doc.setFillColor(16, 185, 129, 0.1);
    doc.roundedRect(20, yPos, 170, 15, 3, 3, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(`Taxa de Sucesso: ${mcResults.taxaDeSucesso.toFixed(1)}%`, 105, yPos + 10);
    yPos += 20;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    addDataRow('Património Mediano (P50):', `€${Math.round(mcResults.p50).toLocaleString()}`);
    addDataRow('Património Pessimista (P10):', `€${Math.round(mcResults.p10).toLocaleString()}`);
    addDataRow('Património Otimista (P90):', `€${Math.round(mcResults.p90).toLocaleString()}`);

    yPos += 10;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 15;

    checkPageBreak(110);

    doc.setFillColor(14, 165, 233);
    doc.roundedRect(20, yPos, 170, 10, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Gráfico de Distribuição', 105, yPos + 7);
    yPos += 18;

    const mcCanvas = document.getElementById('chartMonteCarloDistribution');
    if (!mcCanvas) {
      yPos += 10;
    } else {
      const mcImgData = mcCanvas.toDataURL('image/png', 2.0);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, yPos, 170, 85, 3, 3, 'F');
      doc.addImage(mcImgData, 'PNG', 25, yPos + 5, 160, 75);
      yPos += 95;
    }

    addFooter();
    const nomeArquivo = `Relatorio_FIRE_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(nomeArquivo);
    mostrarMensagem('PDF gerado e baixado com sucesso!', 'success');

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    mostrarMensagem(`Erro ao gerar PDF: ${error.message}`, 'error');
  }
}

export { gerarPDF };

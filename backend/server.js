const express = require('express'); // framework express
const cors = require('cors');   // middleware cors para permitir requisições de outros domínios/origens
const fs = require ('fs'); // módulo de sistema de arquivos
const path = require('path'); // módulo de manipulação de caminhos de arquivos
const { v4: uuidv4 } = require('uuid'); // Importa biblioteca para gerar IDs únicos
const htmlToPdf = require('html-pdf'); // Importa biblioteca para gerar PDF a partir de HTML
const AdmZip = require ('adm-zip'); // Importa biblioteca para criar arquivos ZIP

const app = express(); // cria uma instância do express
app.use(cors()); // habilita o middleware cors
app.use(express.json()); // habilita o parsing do JSON, para receber dados no formato JSON

const dataFilePath = path.resolve(__dirname, 'data.json');

const readAllData = () => {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify({}));
  }
  const data = fs.readFileSync(dataFilePath, 'utf-8');
  return JSON.parse(data);
};

// Função para ler dados de um formulário específico
const readFormData = (formId) => {
  const data = readAllData();
  if (!data[formId]) {
    // Inicializa o formulário se não existir
    data[formId] = {
      fiscal: { blocks: [{}], completed: false },
      dp: { blocks: [{}], completed: false },
      contabil: { blocks: [{}], completed: false },
      headerData: {}
    };
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  }
  return data[formId];
};

const sectionTitles = {
  fiscal: 'Departamento Fiscal',
  dp: 'Departamento Pessoal',
  contabil: 'Departamento Contábil'
};

// Função para salvar dados de um formulário específico
const saveFormData = (formId, formData) => {
  let data = readAllData();
  data[formId] = formData;
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
};

// function para gerar PDF
const generatePDF = (sections, headerData, filename) => {
    console.log('Gerando PDF...');

    const htmlContent = generateHTML(sections, headerData);
    
    const options = {
      format: 'A4',
      border: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    };
    
    return new Promise((resolve, reject) => {
      htmlToPdf.create(htmlContent, options).toFile(filename, (err, res) => {
        if (err) {
          console.error('Erro ao gerar PDF:', err);
          reject(err);
        } else {
          console.log('PDF gerado com sucesso:', res);
          resolve(res);
        }
      });
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };

// function para gerar HTML a partir das seções
const generateHTML = (sections, headerData) => {

    // Se headerData não for um objeto, inicialize como objeto vazio para evitar impressões indesejadas
    if (!headerData || typeof headerData !== 'object') {
      headerData = {};
    }

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ata de Reunião</title>
        <style>
          @page {
            size: A4;
            margin: 2.5cm;
          }
          
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #212121;
            margin: 0;
            padding: 0;
          }
          
          .document {
            max-width: 100%;
            margin: 0 auto;
          }
          
          /* Cabeçalho com borda inferior e espalamento */
          .header {
            text-align: center;
            margin-bottom: 2cm;
            border-bottom: 2px solid #333;
            padding-bottom: 1cm;
          }
          
          .title {
            font-size: 20pt;
            font-weight: bold;
            margin-bottom: 0.5cm;
            text-transform: uppercase;
          }

          /* Tabela do cabeçalho com espaçamento */
          .header-info {
            width: 100%;
            border-collapse: collapse;
            margin: 0.5cm 0;
          }
          
          .header-info td {
            padding: 0.5cm;
            vertical-align: top;
            text-align: left;
          }
          
          .header-info td:first-child {
            font-weight: bold;
            width: 25%;
          }
          
          /* Estilos para seções */
          .section {
            margin: 1.5cm 0;
            page-break-inside: avoid;
          }
          
          .section-title {
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
            background-color: #f0f0f0;
            padding: 0.5cm;
            margin-bottom: 0.5cm;
            border-left: 5px solid #333;
          }
          
          /* Estilos para blocos de conteúdo */
          .block {
            margin: 1cm;
          }
          
          .block-title {
            font-weight: bold;
            font-size: 14pt;
            margin-bottom: 0.3cm;
            color: #444;
          }
          
          .block-content {
            text-align: justify;
            margin-left: 0.5cm;
          }
          
          .block-content p {
            margin: 0.3cm 0;
          }
          
          /* estilos para listas */
          .block-content ul, 
          .block-content ol {
            margin: 0.5cm 0;
            padding-left: 1cm;
          }
          
          .signature-section {
            margin-top: 3cm;
            page-break-inside: avoid;
            display: flex;
            justify-content: space-around;
          }
          
          .signature {
            width: 40%;
            text-align: center;
          }
          
          .signature-line {
            border-top: 1px solid #333;
            margin-bottom: 0.3cm;
            margin-top: 2cm;
          }
          
          .signature-name {
            font-weight: bold;
          }
          
          .signature-title {
            font-size: 10pt;
            color: #666;
          }

          /* Novos estilos para listas hierárquicas */         
          .block-content li {
            position: relative;
            margin-bottom: 0.2cm;
          }
          
          /* Estilos para diferentes níveis de identação */
          .block-content ul ul,
          .block-content ol ol {
            padding-left: 1cm;
          }
          
          .block-content .ql-indent-1 { margin-left: 1.5cm; }
          .block-content .ql-indent-2 { margin-left: 3.0cm; }
          .block-content .ql-indent-3 { margin-left: 4.5cm; }
          .block-content .ql-indent-4 { margin-left: 6.0cm; }
          
          /* Estilos para listas ordenadas */
          .block-content ol {
            list-style-type: decimal;
          }
          
          .block-content ol .ql-indent-1 {
            list-style-type: lower-alpha;
          }
          
          .block-content ol .ql-indent-2 {
            list-style-type: lower-roman;
          }
          
          .block-content ol .ql-indent-3 {
            list-style-type: upper-alpha;
          }
        </style>
      </head>
      <body>
        <div class="document">
          <div class="header">
            <div class="title">Ata de Reunião</div>
            <table class="header-info">
              <tr>
                <td>Empresa</td>
                <td>${headerData.empresa || ''}</td>
              </tr>
              <tr>
                <td>Local</td>
                <td>${headerData.local || ''}</td>
              </tr>
              <tr>
                <td>Data</td>
                <td>${headerData.data ? formatDate(headerData.data) : ''}</td>
              </tr>
              <tr>
                <td>Representantes ${headerData.empresa || ''}</td>
                <td>${headerData.participantesEmpresa || ''}</td>
              </tr>
                <td>Representantes Canella & Santos</td>
                <td>${headerData.participantesContabilidade || ''}</td>
            </table>
          </div>
    `;

    // Função para processar o conteúdo HTML do Quill
    const processQuillContent = (content) => {
      if (!content) return '';
      
      // Converte classes de identação para estilos consistentes
      content = content
        .replace(/<li class="ql-indent-(\d+)"/g, '<li class="ql-indent-$1" style="margin-left: ${1.5 * parseInt($1)}cm"')
        .replace(/<ul class="ql-indent-(\d+)"/g, '<ul class="ql-indent-$1" style="margin-left: ${1.5 * parseInt($1)}cm"')
        .replace(/<ol class="ql-indent-(\d+)"/g, '<ol class="ql-indent-$1" style="margin-left: ${1.5 * parseInt($1)}cm"');
      
      return content;
    };

    // Processa cada seção
    Object.entries(sections).forEach(([sectionName, section]) => {
    const blocks = section?.blocks || [];
    const hasContent = blocks.some(block => {
        const hasTitle = block?.title?.trim();
        const hasContent = block?.content?.trim();
        return hasTitle || hasContent;
    });

      if (hasContent) {
        html += `
          <div class="section">
            <div class="section-title">${sectionTitles[sectionName] || sectionName.toUpperCase()}</div>
        `;

        section.blocks.forEach((block) => {
          if (block.title || block.content) {
            html += `
              <div class="block">
                ${block.title ? `<div class="block-title">${block.title}</div>` : ''}
                ${block.content ? `<div class="block-content">${processQuillContent(block.content)}</div>` : ''}
              </div>
            `;
          }
        });

        html += `</div>`;
      }
    });

    html += `</div></body></html>`;
    return html;
};
  
//  rota para obter os dados
app.get('/data/:formId', (req, res) => {
  try {
    const { formId } = req.params;
    const formData = readFormData(formId);
    res.json(formData);
  } catch (error) {
    console.error('Erro ao ler os dados:', error);
    res.status(500).json({ error: 'Erro ao ler os dados.' });
  }
});

// lista formulários abertos
app.get('/forms', (req, res) => {
  try {
    const data = readAllData();
    const formsList = Object.keys(data).map(formId => ({
      id: formId,
      title: data[formId].headerData?.empresa || 'Formulário sem título',
      date: data[formId].headerData?.data || 'Sem data'
    }));
    res.json(formsList);
  } catch (error) {
    console.error('Erro ao listar os formulários:', error);
    res.status(500).json({ error: 'Erro ao listar os formulários.' });
  }
});

// cria um novo formulário
app.post('/createForm', (req, res) => {
  try {
    let data = readAllData();
    const id = uuidv4();
    data[id] = {
      fiscal: { blocks: [{}], completed: false },
      dp: { blocks: [{}], completed: false },
      contabil: { blocks: [{}], completed: false },
      headerData: {
        participantesContabilidade: 'Eli, Cataryna e William'
      }
    };
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    res.json({ formId: id });
  } catch (error) {
    console.error('Erro ao criar o formulário:', error);
    res.status(500).json({ error: 'Erro ao criar o formulário.' });
  }
});

// atualizar dados de um formulário
app.post('/update/:formId', (req, res) => {
  const { formId } = req.params;
  const { sections, headerData } = req.body;
  if (!sections || typeof sections !== 'object') {
    return res.status(400).json({ error: 'Dados inválidos' });
  }
  try {
    const formData = readFormData(formId);
    // Atualiza apenas as seções e, se enviado, o headerData
    formData.fiscal = sections.fiscal;
    formData.dp = sections.dp;
    formData.contabil = sections.contabil;
    if (headerData) formData.headerData = headerData;
    saveFormData(formId, formData);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar os dados:', error);
    res.status(500).json({ error: 'Erro ao salvar os dados.' });
  }
});

// gerar documentos (PDF e Word) e depois deletar o formulário
app.post('/generate/:formId', async (req, res) => {
  const { formId } = req.params;
  const { sections, headerData } = req.body;
  if (!sections || typeof sections !== 'object' || !headerData) {
    return res.status(400).json({ error: 'Dados inválidos: sections ou headerData ausentes' });
  }
  const id = uuidv4();
  const pdfPath = `./temp/${id}.pdf`;
  // const wordPath = `./temp/${id}.docx`;
  const zipPath = `./temp/${id}.zip`;

  if (!fs.existsSync('./temp')) {
    try {
      fs.mkdirSync('./temp');
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error('Erro ao criar diretório temp:', err);
        return res.status(500).json({ error: 'Erro ao criar diretório temporário.' });
      }
    }
  }

  try {
    await generatePDF(sections, headerData, pdfPath);
    // await generateWord(sections, headerData, wordPath);
    const zip = new AdmZip();
    zip.addLocalFile(pdfPath);
    // zip.addLocalFile(wordPath);
    zip.writeZip(zipPath);
    res.json({ filename: id });
  } catch (error) {
    console.error('Erro ao gerar documentos:', error);
    res.status(500).json({ error: 'Erro ao gerar documentos' });
  }
});

// download do arquivo ZIP gerado
app.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.resolve(`./temp/${filename}.zip`);
  const fileName = 'relatorio.zip';
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Arquivo não encontrado');
  }
  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error('Erro ao fazer download:', err);
      return res.status(500).send('Erro ao fazer download do arquivo');
    }
  });
});

app.delete('/form/:formId', (req, res) => {
  try {
    const { formId } = req.params;
    if (!fs.existsSync(dataFilePath)) {
      return res.status(404).json({ error: 'Dados não encontrados.' });
    }
    const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
    if (data[formId]) {
      delete data[formId];
      fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Formulário não encontrado.' });
    }
  } catch (error) {
    console.error('Erro ao deletar o formulário:', error);
    res.status(500).json({ error: 'Erro ao deletar o formulário.' });
  }
});

// inicia o servidor na porta 3001
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Isso permite acesso de qualquer IP na rede

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT}`);
});
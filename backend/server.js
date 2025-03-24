const express = require('express'); // framework express
const cors = require('cors');   // middleware cors para permitir requisições de outros domínios/origens
const fs = require ('fs'); // módulo de sistema de arquivos
const path = require('path'); // módulo de manipulação de caminhos de arquivos
const { v4: uuidv4 } = require('uuid'); // Importa biblioteca para gerar IDs únicos
const htmlToPdf = require('html-pdf');
const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, BorderStyle } = require('docx');
const AdmZip = require ('adm-zip');

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

// Função para salvar dados de um formulário específico
const saveFormData = (formId, formData) => {
  let data = readAllData();
  data[formId] = formData;
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
};

// Função para remover formulário (DELETE)
const deleteFormData = (formId) => {
  let data = readAllData();
  if (data[formId]) {
    delete data[formId];
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    return true;
  }
  return false;
};

// function para gerar PDF
const generatePDF = (sections, headerData, filename) => {
    console.log('Gerando PDF...');
    console.log('Header Data:', headerData);
    console.log('Sections:', sections);

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

//   const convertHtmlToDocxElements = (html) => {
//     if (!html) return [new Paragraph({})];
  
//     // Processar quebras de linha e parágrafos
//     const cleanedHtml = html
//       .replace(/&nbsp;/g, ' ') // Substitui espaços não quebráveis
//       .replace(/<\/p>/g, '</p>\n') // Adiciona quebras após parágrafos
//       .replace(/<br\s*\/?>/g, '\n'); // Converte <br> em quebras de linha
  
//     // Extrair texto limpo e dividir em linhas
//     let text = cleanedHtml.replace(/<[^>]*>/g, ''); // Remove tags HTML
  
//     // Tratar espaçamentos extras
//     text = text.replace(/\n{3,}/g, '\n\n'); // Limita quebras consecutivas a no máximo 2
    
//     const lines = text.split('\n').filter(line => line.trim() !== '');
  
//     // Converter linhas em elementos do Word
//     const paragraphs = lines.map(line => {
//       const trimmedLine = line.trim();
      
//       // Detectar listas numeradas (ex: "3.1.", "3.2.")
//       const isNumberedList = /^\d+\.\d+\.?\s/.test(trimmedLine);
//       const isBulletList = /^[•\-*]\s/.test(trimmedLine);
      
//       let processedLine = trimmedLine;
//       let indent = {};
      
//       if (isNumberedList) {
//         // Manter o número como parte do texto, mas adicionar indentação
//         indent = { left: 720 };
//       } else if (isBulletList) {
//         // Remover o marcador de lista e adicionar indentação
//         processedLine = trimmedLine.replace(/^[•\-*]\s/, '');
//         indent = { left: 720 };
//       }
  
//       // Verifica se parece ser um título
//       const isTitle = trimmedLine.length < 50 && /^[A-Z0-9\s]+$/.test(trimmedLine);
      
//       return new Paragraph({
//         children: [
//           new TextRun({
//             text: processedLine,
//             bold: isTitle || isNumberedList, // Aplica negrito a títulos ou números de lista
//           }),
//         ],
//         spacing: { after: 120 }, // Espaçamento entre parágrafos
//         indent: indent,
//         bullet: isBulletList ? { level: 0 } : undefined, // Adiciona bullet para listas com marcadores
//       });
//     });
  
//     return paragraphs;
//   };

// // function para gerar Word
// const generateWord = async (sections, headerData, filename) => {
//   console.log('Gerando Word...');
  
//   // Criar um array de seções para o documento
//   const children = [];
  
//   // Adicionar título com formatação melhorada
//   children.push(
//     new Paragraph({
//       text: "ATA DE REUNIÃO",
//       heading: HeadingLevel.HEADING_1,
//       alignment: AlignmentType.CENTER,
//       spacing: { after: 400, before: 400 },
//     })
//   );

//   // Linha horizontal após o título
//   children.push(
//     new Paragraph({
//       text: "",
//       border: {
//         bottom: {
//           color: "#000000",
//           space: 1,
//           style: BorderStyle.SINGLE,
//           size: 6,
//         },
//       },
//       spacing: { after: 400 },
//     })
//   );

//   // Adicionar cabeçalho com tabela mais organizada
//   children.push(
//     new Paragraph({
//       text: `Empresa: ${headerData.empresa}`,
//       spacing: { after: 200 },
//     })
//   );
  
//   children.push(
//     new Paragraph({
//       text: `Local: ${headerData.local}`,
//       spacing: { after: 200 },
//     })
//   );
  
//   children.push(
//     new Paragraph({
//       text: `Data: ${headerData.data}`,
//       spacing: { after: 200 },
//     })
//   );
  
//   // Adicionar seção de participantes com melhor formatação
//   children.push(
//     new Paragraph({
//       text: "PARTICIPANTES:",
//       bold: true,
//       spacing: { after: 200, before: 200 }
//     })
//   );
  
//   children.push(
//     new Paragraph({
//       text: `Representantes ${headerData.empresa}: ${headerData.participantesEmpresa}`,
//       spacing: { after: 200 },
//       indent: { left: 720 }
//     })
//   );
  
//   children.push(
//     new Paragraph({
//       text: `Representantes Contabilidade: ${headerData.participantesContabilidade}`,
//       spacing: { after: 400 },
//       indent: { left: 720 }
//     })
//   );

//   // Linha horizontal para separar cabeçalho do conteúdo
//   children.push(
//     new Paragraph({
//       text: "",
//       border: {
//         bottom: {
//           color: "#000000",
//           space: 1,
//           style: BorderStyle.SINGLE,
//           size: 6,
//         },
//       },
//       spacing: { after: 400 },
//     })
//   );
  
//   // Processar cada seção com formatação consistente
//   Object.entries(sections).forEach(([sectionName, section]) => {
//     // Adicionar título da seção com formatação destacada
//     children.push(
//       new Paragraph({
//         text: sectionName.toUpperCase(),
//         heading: HeadingLevel.HEADING_2,
//         spacing: { before: 400, after: 200 },
//         border: {
//           left: { style: BorderStyle.SINGLE, size: 16, color: "#666666" }
//         },
//         indent: { left: 360 }
//       })
//     );

//     // Processar cada bloco com formatação consistente
//     section.blocks.forEach((block) => {
//       if (block.title) {
//         children.push(
//           new Paragraph({
//             text: block.title,
//             heading: HeadingLevel.HEADING_3,
//             spacing: { before: 300, after: 100 },
//             indent: { left: 360 }
//           })
//         );
//       }
      
//       // Converter conteúdo HTML para elementos docx com melhor formatação
//       if (block.content) {
//         const contentParagraphs = convertHtmlToDocxElements(block.content);
//         children.push(...contentParagraphs);
//       }
//     });
//   });

//   // Adicionar seção de assinaturas com melhor layout
//   children.push(
//     new Paragraph({
//       text: "",
//       spacing: { before: 800 }
//     })
//   );

//   // Assinaturas lado a lado
//   children.push(
//     new Paragraph({
//       children: [
//         new TextRun({
//           text: `_______________________              _______________________`,
//           bold: true
//         })
//       ],
//       alignment: AlignmentType.CENTER,
//       spacing: { after: 200 }
//     })
//   );

//   children.push(
//     new Paragraph({
//       children: [
//         new TextRun({
//           text: `${headerData.empresa}                           Contabilidade`,
//           bold: true
//         })
//       ],
//       alignment: AlignmentType.CENTER
//     })
//   );

//   // Criar o documento com todas as seções
//   const doc = new Document({
//     creator: "Ata Multissetorial",
//     title: "Ata de Reunião",
//     description: "Relatório gerado automaticamente",
//     sections: [{ 
//       properties: {
//         page: {
//           margin: {
//             top: 1440, // 1 inch
//             right: 1440,
//             bottom: 1440,
//             left: 1440
//           }
//         }
//       }, 
//       children: children 
//     }]
//   });

//   // Salvar documento
//   const buffer = await Packer.toBuffer(doc);
//   fs.writeFileSync(filename, buffer);
//   console.log('Word gerado com sucesso', filename);
// };

// Função para gerar HTML a partir das seções
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
            color: #333;
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
        </style>
      </head>
      <body>
        <div class="document">
          <div class="header">
            <div class="title">Ata de Reunião</div>
            <table class="header-info">
              <tr>
                <td>Empresa:</td>
                <td>${headerData.empresa || ''}</td>
              </tr>
              <tr>
                <td>Local:</td>
                <td>${headerData.local || ''}</td>
              </tr>
              <tr>
                <td>Data:</td>
                <td>${headerData.data || ''}</td>
              </tr>
              <tr>
                <td>${headerData.empresa || ''}:</td>
                <td>${headerData.participantesEmpresa || ''}</td>
              </tr>
                <td>Canella & Santos:</td>
                <td>${headerData.participantesContabilidade || ''}</td>
            </table>
          </div>
    `;

    // Adiciona as seções ao HTML
    Object.entries(sections).forEach(([sectionName, section]) => {
      html += `
        <div class="section">
          <div class="section-title">${sectionName.toUpperCase()}</div>
      `;
      if (section.blocks && Array.isArray(section.blocks)) {
        section.blocks.forEach((block) => {
          if (block.title || block.content) {
            html += `
              <div class="block">
                ${block.title ? `<div class="block-title">${block.title}</div>` : ''}
                ${block.content ? `<div class="block-content">${block.content}</div>` : ''}
              </div>
            `;
          }
        });
      }
      html += `</div>`;
    });

    // Seção de assinaturas (opcional, se necessário)
    html += ` `;
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

// Lista formulários abertos
app.get('/forms', (req, res) => {
  try {
    const data = readAllData();
    const formsList = Object.keys(data).map(formId => ({
      id: formId,
      title: data[formId].headerData?.empresa || 'Formulário sem título'
    }));
    res.json(formsList);
  } catch (error) {
    console.error('Erro ao listar os formulários:', error);
    res.status(500).json({ error: 'Erro ao listar os formulários.' });
  }
});

// Cria um novo formulário
app.post('/createForm', (req, res) => {
  try {
    let data = readAllData();
    const id = uuidv4();
    data[id] = {
      fiscal: { blocks: [{}], completed: false },
      dp: { blocks: [{}], completed: false },
      contabil: { blocks: [{}], completed: false },
      headerData: {}
    };
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    res.json({ formId: id });
  } catch (error) {
    console.error('Erro ao criar o formulário:', error);
    res.status(500).json({ error: 'Erro ao criar o formulário.' });
  }
});

// Atualizar dados de um formulário
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

// Resetar um formulário específico
app.post('/reset/:formId', (req, res) => {
  try {
    const { formId } = req.params;
    const initialData = {
      fiscal: { blocks: [{ title: '', content: '' }], completed: false },
      dp: { blocks: [{ title: '', content: '' }], completed: false },
      contabil: { blocks: [{ title: '', content: '' }], completed: false },
      headerData: {}
    };
    saveFormData(formId, initialData);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao resetar os dados:', error);
    res.status(500).json({ error: 'Erro ao resetar os dados.' });
  }
});

// Gerar documentos (PDF e Word) e depois deletar o formulário
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
    // Após a geração, remove o formulário
    deleteFormData(formId);
  } catch (error) {
    console.error('Erro ao gerar documentos:', error);
    res.status(500).json({ error: 'Erro ao gerar documentos' });
  }
});

// Download do arquivo ZIP gerado
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
app.listen(3001, () => {
    console.log('Servidor rodando em http://localhost:3001');
});
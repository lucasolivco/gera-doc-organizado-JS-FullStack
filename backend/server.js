const express = require('express'); // framework express
const cors = require('cors');   // middleware cors para permitir requisições de outros domínios/origens
const PDFDocument = require('pdfkit');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const fs = require ('fs'); // módulo de sistema de arquivos
const path = require('path'); // módulo de manipulação de caminhos de arquivos
const { v4: uuidv4 } = require('uuid'); // Importa biblioteca para gerar IDs únicos

const app = express(); // cria uma instância do express
app.use(cors()); // habilita o middleware cors
app.use(express.json()); // habilita o parsing do JSON, para receber dados no formato JSON

const dataFilePath = path.resolve(__dirname, 'data.json');

// função para ler o arquivo JSON
const readData = () => {
    if (!fs.existsSync(dataFilePath)) {
      // Se o arquivo não existir, cria um arquivo JSON inicial
      fs.writeFileSync(dataFilePath, JSON.stringify({
        fiscal: { blocks: [{}], completed: false },
        dp: { blocks: [{}], completed: false },
        contabil: { blocks: [{}], completed: false }
      }));
    }
    const data = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(data);
  };

// function para salvar no arquivo json
const saveData = (data) => {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  };

// function para gerar PDF
const generatePDF = (sections, filename) => {
    const doc = new PDFDocument(); // cria um novo doumento PDF
    doc.pipe(fs.createWriteStream(filename)); // Define o arquivo de saída

    doc.fontSize(20).text('Relatório Gerado', { align: 'center'}); // Adiciona um título ao documento
    doc.moveDown(); // Move o cursor para baixo

    // Verifica se sections é um objeto válido
    if (!sections || typeof sections !== 'object') {
        throw new Error('Sections não é um objeto válido.');
    }

    // itera sobre as seções e adiciona o PDF
    Object.entries(sections).forEach(([sectionName, section]) => {
        if (!section || !section.blocks) {
            throw new Error(`Seção "${sectionName}" ou seus blocos não estão definidos.`);
        }

        doc.fontSize(16).text(sectionName.toUpperCase(), { underline: true}); // adiciona nome da seção em com caps lock ativido
        section.blocks.forEach((block, index) => {
            doc.fontSize(12).text(`Bloco ${index + 1}: ${block.title}`); // adiciona o título do bloco
            doc.text(block.content); // adiciona o conteúdo do bloco
            doc.moveDown()
        });
    });

    doc.end(); // finaliza o documento PDF
};

// function para gerar Word
const generateWord = (sections, filename) => {
    const templatePath = path.resolve(__dirname, 'template.docx');
    // Verifica se o template existe
    if (!fs.existsSync(templatePath)) {
        throw new Error('Arquivo template.docx não encontrado.');
    }

    try { 
        // Lê o arquivo template.docx como um buffer
        const content = fs.readFileSync(templatePath, 'binary'); // lê o template do word
        // Inicializa o PizZip com o conteúdo do template
        const zip = new PizZip(content);
        // Inicializa o docxtemplater com o PizZip
        const doc = new Docxtemplater(zip);

        // Prepara os dados para o template
        const data = {
            sections: Object.entries(sections).map(([sectionName, section]) => ({
            sectionName, // Nome da seção
            blocks: section.blocks // Blocos da seção
            }))
        };

        // Passa os dados para o template
        doc.setData(data);
        doc.render(); // Renderiza o documento
        
        // Gera o arquivo Word
        const buffer = doc.getZip().generate({ type: 'nodebuffer' });
        fs.writeFileSync(filename, buffer); // Salva o arquivo Word // salva o arquivo word
    }   catch (error) {
        console.error('Erro ao gerar documento Word', error);
        throw new Error ('Erro ao processar o template do word.');
    }
};

//  rota para obter os dados
app.get('/data', (req, res) => {
    try {
      const data = readData();
      res.json(data);
    } catch (error) {
      console.error('Erro ao ler os dados:', error);
      res.status(500).json({ error: 'Erro ao ler os dados.' });
    }
  });

//  rota para salvar os dados
app.post('/update', (req, res) => {
    const { sections } = req.body;

    if (!sections || typeof sections !== 'object') {
        return res.status(400).json({ error: 'Dados inválidos' });
    }

    try {
        saveData(sections); // salva os dados no arquivo json
        res.json({ sucess: true });
    }   catch (error) {
        console.error('Error ao salvar os dados:', error);
        res.status(500).json({ error: 'Error ao salvar os dados.' });

    }
});

//  rota para resetar o arquivo json
app.post('/reset', (req, res) => {
    try {
        const initialData = {
            fiscal: { blocks: [{}], completed: false },
            dp: { blocks: [{}], completed: false },
            contabil: { blocks: [{}], completed: false }
        };
        saveData(initialData); //  reseta o arquivo json
        res.json({ success: true });
    }   catch (error) {
        console.error('Error ao resetar os dados:', error);
        res.status(500).json({ error: 'Erro ao resetar os dados.'});
    }
});

// rota para gerar documentos
app.post('/generate', (req, res) => {
    const { sections } = req.body; // obtém as seções do corpo da requisição

    // verifica se sections está definido e é um objetivo
    if (!sections || typeof sections !== 'object') {
        return res.status(400).json({ error: 'Dados inválidos: sections não está definido ou não é um objeto' });
    }

    const id= uuidv4(); // gera um id único para o arquivo
    const pdfPath = `./temp/${id}.pdf`; // define o caminho do PDF
    const wordPath = `./temp/${id}.docx`; // Define o caminho do Word

    // Cria o diretório temporário se não existir
    if (!fs.existsSync('./temp')) {
        try {
        fs.mkdirSync('./temp');
        } catch (err) {
        if (err.code !== 'EEXIST') { // Ignora o erro se o diretório já existir
            console.error('Erro ao criar diretório temp:', err);
            return res.status(500).json({ error: 'Erro ao criar diretório temporário.' });
        }
        }
    }

    try { 
        generatePDF(sections, pdfPath); // gera o PDF
        generateWord(sections, wordPath); // Gera o Word
        res.json({ filename: id }); // Retorna o ID do arquivo
    }   catch (error) {
        console.error('Erro ao gerar documentos:', error);
        res.status(500).json({ error: 'Erro ao gerar documentos' });
    }
});

// rota para download
app.get('/download/:id', (req, res) => {
    const { id } = req.params; // obtém o ID do arquivo
    res.download(`./temp/${id}.docx`, 'relatorio.docx'); // faz download do word
    res.download(`./temp/${id}.pdf`, 'relatorio.pdf'); // faz o download do PDF
});

// inicia o servidor na porta 3001
app.listen(3001, () => {
    console.log('Servidor rodando em http://localhost:3001');
});
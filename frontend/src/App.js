import React, { useEffect, useState } from 'react';
import { Container, Card, Button, Form, Row, Col, Modal, ListGroup } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { FaSun, FaMoon, FaPlus, FaTrash, FaCheck, FaEdit, FaArrowLeft } from 'react-icons/fa'; //  ícones de dark e light mode
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; //  estilos do editor

const FormSelection = ({ onSelectForm}) => {
  const [forms,setForms] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:3001/forms')
      .then(response => {
        setForms(response.data);
      })
      .catch(error => {
        console.error('Erro ao carregar os formulários:', error);
      });
  }
  , []);

  return (
    <div>
      <h2 className="form-title" style={{ marginBottom: '1.5rem' }}>Selecione um Formulário</h2>
      <ListGroup className="mb-4">
        {forms.map(form => (
          <ListGroup.Item 
            key={form.id}
            className="form-list-item d-flex justify-content-between align-items-center"
            style={{ 
              cursor: 'pointer',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease' 
            }}
          >
            <span className="ms-2" style={{ flexGrow: 1 }}>{form.title}</span>
            <Button 
              variant="outline-primary" 
              onClick={() => onSelectForm(form.id)}
              className="custom-button px-3 py-1"
            >
              Abrir
            </Button>
          </ListGroup.Item>
        ))}
      </ListGroup>
      <Button 
        variant="success" 
        onClick={() => onSelectForm('new')} 
        className="custom-button d-block mx-auto px-4 py-2"
      >
        Criar Novo Formulário
      </Button>
    </div>
  );
};

function App() {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [formId, setFormId] = useState(null); // ID do formulário selecionado
  const [sections, setSections] = useState(null);
  const [headerData, setHeaderData] = useState({
    empresa: '',
    local: '',
    data: '',
    participantesEmpresa: '',
    participantesContabilidade: 'Eli, Cataryna e William',
  });
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState({ section: null, index: null });
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  //  atualiza o localStorage sempre que o modo dark for alterado
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  //  function para atualizar os campos do cabeçalho
  const updateHeaderField = (field, value) => {
    const newHeaderData = { ...headerData, [field]: value };
    setHeaderData(newHeaderData);
    if (formId) {
      axios.post(`http://localhost:3001/update/${formId}`, { sections, headerData: newHeaderData });
    }
  };

// Carregar dados do formulário selecionado
useEffect(() => {
  if (formId && formId !== 'new') {
    axios.get(`http://localhost:3001/data/${formId}`)
      .then(response => {
        setSections(response.data);
        setHeaderData(response.data.headerData || headerData);
      })
      .catch(error => {
        console.error('Erro ao carregar os dados:', error);
        setSections({
          fiscal: { blocks: [{}], completed: false },
          dp: { blocks: [{}], completed: false },
          contabil: { blocks: [{}], completed: false }
        });
      })
      .finally(() => setLoading(false));
  } else if (formId === 'new') {
    // criar novo formulário e obter o formId
    axios.post('http://localhost:3001/createForm')
      .then(response => {
        setFormId(response.data.formId);
        // Inicializa com dados padrão
        setSections({
          fiscal: { blocks: [{}], completed: false },
          dp: { blocks: [{}], completed: false },
          contabil: { blocks: [{}], completed: false }
        });
      })
      .catch(error => console.error('Erro ao criar novo formulário:', error))
      .finally(() => setLoading(false));
  }
}, [formId]);

  //  function para alternar modo claro e escuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  //  para funcionar no body da página
  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : 'light-mode';
  }, [darkMode]);

  //  function para atualizar o conteúdo de um bloco
  const updateBlock = async (section, index, field, value) => {
    const updatedBlocks = [...sections[section].blocks];
    updatedBlocks[index][field] = value;
    const updatedSections = {
      ...sections,
      [section]: { ...sections[section], blocks: updatedBlocks }
    };
    setSections(updatedSections);
    if (formId) {
      await axios.post(`http://localhost:3001/update/${formId}`, { sections: updatedSections, headerData });
    }
  };

  // finaliza uma seção
  const completeSection = async (section) => {
    const updatedSections = {
      ...sections,
      [section]: { ...sections[section], completed: true }
    };
    setSections(updatedSections);
    if (formId) {
      await axios.post(`http://localhost:3001/update/${formId}`, { sections: updatedSections, headerData });
    }
  };

  //  function reabrir uma seção para edição
  const reopenSection = async (section) => {
    const updatedSections = {
      ...sections,
      [section]: { ...sections[section], completed: false }
    };
    setSections(updatedSections);
    if (formId) {
      await axios.post(`http://localhost:3001/update/${formId}`, { sections: updatedSections, headerData });
    }
  };

  // adiciona um novo bloco
  const addBlock = async (section) => {
    const updatedSections = {
      ...sections,
      [section]: { ...sections[section], blocks: [...sections[section].blocks, {}] }
    };
    setSections(updatedSections);
    if (formId) {
      await axios.post(`http://localhost:3001/update/${formId}`, { sections: updatedSections, headerData });
    }
  };

  //  functions excluir bloco
  const deleteBlock = async (section, index) => {
    const updatedBlocks = [...sections[section].blocks];
    updatedBlocks.splice(index, 1);
    const updatedSections = {
      ...sections,
      [section]: { ...sections[section], blocks: updatedBlocks }
    };
    setSections(updatedSections);
    if (formId) {
      await axios.post(`http://localhost:3001/update/${formId}`, { sections: updatedSections, headerData });
    }
  };

  //  function para abrir modal de confirmação
  const handleDeleteClick = (section, index) => {
    setBlockToDelete({ section, index }); //  armazena a selçao e o índice do bloco a ser excluído
    setShowDeleteModal(true); //  abre o modal
  };

  //  function para confirmar exclusão
  const confirmDelete = () => {
    if (blockToDelete.section && blockToDelete.index !== null) {
      deleteBlock(blockToDelete.section, blockToDelete.index); //  chama a função de exclusão
    }
    setShowDeleteModal(false); //  fecha o modal
  };

  //  function para cancelar a exclusão
  const cancelDelete = () => {
    setShowDeleteModal(false); //  fecha o modal
  };

  const generateDocuments = async () => {
    try {
      setDownloadLoading(true);
      const response = await axios.post(`http://localhost:3001/generate/${formId}`, { sections, headerData });
      window.open(`http://localhost:3001/download/${response.data.filename}`, '_blank');
      // await resetForm();
      // Opcional: após geração, redirecione para a tela de seleção
      setFormId(null);
      setSections(null);
    } catch (error) {
      console.error('Erro ao gerar documentos:', error);
      alert('Erro ao gerar documentos!');
    } finally {
      setDownloadLoading(false);
    }
  };

  if (!formId) {
    // Exibe a tela de seleção se nenhum formulário estiver selecionado
    return <Container className="my-5">
      <FormSelection onSelectForm={(id) => setFormId(id)} />
    </Container>;
  }

  if (loading) {
    return <div>Carregando...</div>;
  }
  if (!sections) {
    return <div>Erro ao carregar os dados.</div>;
  }



  return (
    <div className={darkMode ? 'dark-mode' : 'light-mode'}>
      {/* botão de alternância no canto superior direito */}
      <button onClick={toggleDarkMode} className="dark-mode-toggle">
        {darkMode ? <FaSun size={24} /> : <FaMoon size={24} />}
      </button>

      {/* Botão de voltar - adicione isso no início do return principal */}
      <Button 
        variant="outline-secondary" 
        onClick={() => setFormId(null)}
        className="custom-button back-button"
        style={{ background: 'transparent', border: 'none' }}
      >
        <FaArrowLeft size={20} />
      </Button>

      <Container className="my-5">
        <h1 className="form-title">Ata Multissetorial</h1>

        {/* Cabeçalho */}
      <Card className={`custom-card ${darkMode ? 'dark-mode' : 'light-mode'}`}>
        <Card.Header className="custom-card card-header">
          <h3>Cabeçalho</h3>
        </Card.Header>
        <Card.Body>
          <Row className="custom-row mb-3">
            <Col md={6} className="custom-col">
              <Form.Control
                className="custom-input"
                type="text"
                placeholder="Empresa"
                value={headerData.empresa}
                onChange={(e) => updateHeaderField('empresa', e.target.value)}
              />
            </Col>
            <Col md={6} className="custom-col">
              <Form.Control
                className="custom-input"
                type="text"
                placeholder="Local"
                value={headerData.local}
                onChange={(e) => updateHeaderField('local', e.target.value)}
              />
            </Col>
          </Row>
          <Row className="custom-row mb-3">
            <Col md={6} className="custom-col">
              <Form.Control
                className="custom-input"
                type="date"
                placeholder="Data"
                value={headerData.data}
                onChange={(e) => updateHeaderField('data', e.target.value)}
              />
            </Col>
            <Col md={6} className="custom-col">
              <Form.Control
                className="custom-input"
                type="text"
                placeholder="Participantes da Empresa"
                value={headerData.participantesEmpresa}
                onChange={(e) => updateHeaderField('participantesEmpresa', e.target.value)}
              />
            </Col>
          </Row>
          <Row className="custom-row mb-3">
            <Col md={12} className="custom-col">
              <Form.Control
                className="custom-input"
                type="text"
                placeholder="Participantes da Contabilidade"
                value={headerData.participantesContabilidade}
                onChange={(e) => updateHeaderField('participantesContabilidade', e.target.value)}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

        {/* Seção Fiscal */}
        <Section
          title="Fiscal"
          section={sections.fiscal}
          onAddBlock={() => addBlock('fiscal')}
          onComplete={() => completeSection('fiscal')}
          onReopen={() => reopenSection('fiscal')} // reabrir seção para edição
          onUpdate={(index, field, value) => updateBlock('fiscal', index, field, value)}
          onDelete={(index) => handleDeleteClick('fiscal', index)} // deletar bloco
        />

        {/* Seção DP */}
        <Section
          title="Departamento Pessoal"
          section={sections.dp}
          onAddBlock={() => addBlock('dp')}
          onComplete={() => completeSection('dp')}
          onReopen={() => reopenSection('dp')}
          onUpdate={(index, field, value) => updateBlock('dp', index, field, value)}
          onDelete={(index) => handleDeleteClick('dp', index)}
        />

        {/* Seção Contábil */}
        <Section
          title="Contábil"
          section={sections.contabil}
          onAddBlock={() => addBlock('contabil')}
          onComplete={() => completeSection('contabil')}
          onReopen={() => reopenSection('contabil')}
          onUpdate={(index, field, value) => updateBlock('contabil', index, field, value)}
          onDelete={(index) => handleDeleteClick('contabil', index)}
        />

        {/* Botão finalizar */}
          <div className="text-center mt-4">
            <Button 
              variant="success"
              onClick={() => setShowGenerateModal(true)}
              disabled={downloadLoading} //  desabilita o botão durante o loading
            >
              {downloadLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>

                  <span className="ms-2">Gerando...</span>
                </>
              ) : (
                "Gerar Documentos"
              )}
              
            </Button>
          </div>
      </Container>

      {/* modal de confirmação de exclusão */}
      <Modal show={showDeleteModal} onHide={cancelDelete}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Exclusão</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Tem certeza que deseja excluir este bloco?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelDelete}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Excluir
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Modal de Confirmação para Gerar Documento */}
      <Modal show={showGenerateModal} onHide={() => setShowGenerateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Geração</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          O documento será gerado e o formulário será apagado. Revise as informações caso necessário.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGenerateModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => { 
            setShowGenerateModal(false); 
            generateDocuments(); 
          }}>
            Confirmar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['clean']
  ],
  clipboard: {
    matchVisual: false, // Melhor preservação ao colar conteúdo
  }
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'indent',
  'align',
];

// componente de seção reutilizável
const Section = ({ title, section, onAddBlock, onComplete, onReopen, onUpdate, onDelete }) => {
  if (!section) {
    return <div>Erro: Seção não está definida.</div>;
  }

  return (
    <Card className={`custom-card ${section.completed ? 'completed' : ''}`}>
      <Card.Header className="custom-card card-header">
        <h3>{title}</h3>
        {!section.completed ? (
          <Button className="custom-button btn-primary" onClick={onAddBlock}>
            <FaPlus />
          </Button>
        ) : (
          <Button className="custom-button btn-warning" onClick={onReopen}>
            <FaEdit />
          </Button>
        )}
      </Card.Header>
      <Card.Body>
        {section.blocks.map((block, index) => (
          <Row key={index} className="custom-row mb-3">
            <Col md={6} className="custom-col">
              <Form.Control
                className="custom-input"
                type="text"
                placeholder="Título"
                value={block.title || ''}
                onChange={(e) => onUpdate(index, 'title', e.target.value)}
                disabled={section.completed}
              />
            </Col>
            <Col md={6} className="custom-col">
              <ReactQuill
                theme="snow"
                value={block.content || ''}
                onChange={(value) => onUpdate(index, 'content', value)}
                modules={modules}
                formats={formats}
                readOnly={section.completed}
              />
            </Col>
            <Col md={2} className="custom-col">
            <Button className="custom-button btn-danger" onClick={() => onDelete(index)}>
              <FaTrash />
            </Button>
            </Col>
          </Row>
        ))}
        {!section.completed && (
          <Button className="custom-button btn-outline-success" onClick={onComplete}>
            <FaCheck />
          </Button>
        )}
      </Card.Body>
    </Card>
  );
};

export default App;
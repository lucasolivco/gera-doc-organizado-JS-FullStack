import React, { useEffect, useState } from 'react';
import { Container, Card, Button, Form, Row, Col, Modal } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { FaSun, FaMoon } from 'react-icons/fa'; //  ícones de dark e light mode

function App() {
  const[darkMode, setDarkMode] = useState(false); // estado para controlar o modo da página
  const [sections, setSections] = useState(null); //  inicializa como null
  const [loading, setLoading] = useState(true); //  estado para controlar o carregamento
  const [showDeleteModal, setShowDeleteModal] = useState(false); // estado para controlar exibição do modal
  const [blockToDelete, setBlockToDelete] = useState({ section: null, index: null }); //  estado para armazenar o bloco a ser excluído

  // Carrega os dados ao iniciar a aplicação
  useEffect(() => {
    axios.get('http://localhost:3001/data')
      .then(response => {
        setSections(response.data); // Define os dados carregados do backend
      })
      .catch(error => {
        console.error('Erro ao carregar os dados:', error);
        // Se houver erro, inicializa com o estado padrão
        setSections({
          fiscal: { blocks: [{}], completed: false },
          dp: { blocks: [{}], completed: false },
          contabil: { blocks: [{}], completed: false }
        });
      })
      .finally(() => {
        setLoading(false); // Finaliza o carregamento
      });
  }, []);

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

    // Envia as alterações para o backend
    await axios.post('http://localhost:3001/update', { sections: updatedSections });
  };

  // Finaliza uma seção
  const completeSection = async (section) => {
    const updatedSections = {
      ...sections,
      [section]: { ...sections[section], completed: true }
    };

    setSections(updatedSections);

    await axios.post('http://localhost:3001/update', { sections: updatedSections });
  };

  //  function reabrir uma seção para edição
  const reopenSection = async (section) => {
    const updatedSections = {
      ...sections,
      [section]: { ...sections[section], completed: false}
    };

    setSections(updatedSections);

    await axios.post('http://localhost:3001/update', { sections: updatedSections });
  };

  // Adiciona um novo bloco
  const addBlock = async (section) => {
    const updatedSections = {
      ...sections,
      [section]: { ...sections[section], blocks: [...sections[section].blocks, {}] }
    };

    setSections(updatedSections);

    await axios.post('http://localhost:3001/update', { sections: updatedSections });
  };

  //  functions excluir bloco
  const deleteBlock = async (section, index) => {
    const updatedBlocks = [...sections[section].blocks];
    updatedBlocks.splice(index, 1); //  remove o bloco no índice específicado
    const updatedSections = {
      ...sections,
      [section]: { ...sections[section], blocks: updatedBlocks }
    };

    setSections(updatedSections);

    await axios.post('http://localhost:3001/update', { sections: updatedSections });
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

  //  verifica se todas as seções estão finalizadas
  const allCompleted = sections && Object.values(sections).every(s => s.completed);

  //  Função para resetar o formulário
  const resetForm = async () => {
    try {
      //  reseta o estado local
      setSections({
        fiscal: { blocks: [{}], completed: false },
        dp: { blocks: [{}], completed: false },
        contabil: { blocks: [{}], completed: false }
      });

      //   reseta o arquivo JSON no backend
      await axios.post('http://localhost:3001/reset');
    } catch (error) {
      console.error('Erro ao resetar o formulário:', error);
      alert('Erro ao resetar o formulário!');
    }
  };

  //  função para gerar documentos Word e PDF
  const generateDocuments = async () => {
    try {
      console.log('Dados enviados:', sections);
      const response = await axios.post('http://localhost:3001/generate', { sections });
      window.open(`http://localhost:3001/download/${response.data.filename}`, '_blank');
      resetForm(); // Reseta o formulário após gerar os documentos
    } catch (error) {
      console.error('Erro ao gerar documentos:', error);
      alert('Erro ao gerar documentos!'); // Exibe um alerta em caso de erro
    }
  };

  // Se os dados ainda estão sendo carregados, exibe uma mensagem de carregamento
  if (loading) {
    return <div>Carregando...</div>;
  }

  // Se sections ainda não foi carregado, exibe uma mensagem de erro
  if (!sections) {
    return <div>Erro ao carregar os dados.</div>;
  }

  return (
    <div className={darkMode ? 'dark-mode' : 'light-mode'}>
      {/* botão de alternância no canto superior direito */}
      <button onClick={toggleDarkMode} className="dark-mode-toggle">
        {darkMode ? <FaSun size={24} /> : <FaMoon size={24} />}
      </button>

      <Container className="my-5">
        <h1 className="form-title">Formulário Ata Reunião</h1>

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
          title="DP"
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
        {allCompleted && (
          <div className="text-center mt-4">
            <Button variant="success" onClick={generateDocuments}>
              Gerar PDF e Word
            </Button>
          </div>
        )}
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
    </div>
  );
}

// Componente de seção reutilizável
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
            Adicionar Bloco
          </Button>
        ) : (
          <Button className="custom-button btn-warning" onClick={onReopen}>
            Editar Seção
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
              <Form.Control
                className="custom-input"
                as="textarea"
                placeholder="Conteúdo"
                value={block.content || ''}
                onChange={(e) => onUpdate(index, 'content', e.target.value)}
                disabled={section.completed}
              />
            </Col>
            <Col md={2} className="custom-col">
              <Button className="custom-button btn-danger" onClick={() => onDelete(index)}>
                Excluir Bloco
              </Button>
            </Col>
          </Row>
        ))}
        {!section.completed && (
          <Button className="custom-button btn-outline-success" onClick={onComplete}>
            Finalizar Seção
          </Button>
        )}
      </Card.Body>
    </Card>
  );
};

export default App;
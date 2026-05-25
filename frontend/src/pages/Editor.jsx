import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

import { workflowsAPI } from '../api';
import { 
  StartNode, 
  DelayNode, 
  ConditionNode, 
  LogNode, 
  SaveFileNode, 
  PythonScriptNode, 
  EndNode 
} from '../components/CustomNodes';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Save, 
  ArrowLeft, 
  Clock, 
  GitFork, 
  Terminal, 
  FileText, 
  ChevronRight, 
  X,
  Loader2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

const nodeTypes = {
  start: StartNode,
  delay: DelayNode,
  condition: ConditionNode,
  log: LogNode,
  save_file: SaveFileNode,
  python_script: PythonScriptNode,
  end: EndNode
};

// Node Palette Items
const paletteItems = [
  { type: 'delay', name: 'Aguardar (Delay)', desc: 'Pausa a execução por tempo', icon: Clock, color: 'bg-brand-secondary' },
  { type: 'condition', name: 'Condição (If)', desc: 'Desvia o fluxo baseada em lógica', icon: GitFork, color: 'bg-brand-warning' },
  { type: 'log', name: 'Registrar Log', desc: 'Gera logs na execução', icon: Terminal, color: 'bg-brand-primary' },
  { type: 'save_file', name: 'Salvar Arquivo', desc: 'Salva TXT/JSON localmente', icon: FileText, color: 'bg-cyan-500' },
  { type: 'python_script', name: 'Script Python', desc: 'Executa código de forma isolada', icon: Terminal, color: 'bg-purple-500' },
];

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const reactFlowInstance = useReactFlow();

  const [workflow, setWorkflow] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  
  // Selection & Panels
  const [selectedNode, setSelectedNode] = useState(null);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [executionStatus, setExecutionStatus] = useState(null);

  const wsRef = useRef(null);
  const logsEndRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [executionLogs]);

  // Load Workflow
  useEffect(() => {
    const loadWf = async () => {
      try {
        setLoading(true);
        const data = await workflowsAPI.get(id);
        setWorkflow(data);
        
        // Map nodes
        const mappedNodes = data.nodes.map(n => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data
        }));
        setNodes(mappedNodes);

        // Map edges
        const mappedEdges = data.edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          animated: true,
          style: { stroke: '#4B5563' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#4B5563'
          }
        }));
        setEdges(mappedEdges);
      } catch (err) {
        console.error(err);
        alert('Erro ao carregar workflow do banco de dados.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    loadWf();
  }, [id, setNodes, setEdges, navigate]);

  // WebSocket connection cleaner
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Handle Connections
  const onConnect = useCallback((params) => {
    // Determine connection style depending on source handle
    const isCondition = nodes.find(n => n.id === params.source)?.type === 'condition';
    const edgeStyle = {
      ...params,
      animated: true,
      style: { stroke: isCondition ? (params.sourceHandle === 'true' ? '#10B981' : '#EF4444') : '#6366F1' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isCondition ? (params.sourceHandle === 'true' ? '#10B981' : '#EF4444') : '#6366F1'
      }
    };
    setEdges((eds) => addEdge(edgeStyle, eds));
  }, [nodes, setEdges]);

  // Clean selected node when removed from nodes list or clicked canvas
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  // Update properties input helper
  const updateNodeData = (key, value) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              [key]: value
            }
          };
          // Update local selection context so input fields update dynamically
          setSelectedNode(updatedNode);
          return updatedNode;
        }
        return node;
      })
    );
  };

  // Remove Node
  const handleDeleteNode = (nodeId) => {
    if (nodes.find(n => n.id === nodeId)?.type === 'start') {
      alert('Não é possível deletar o Start Node.');
      return;
    }
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  // HTML5 Drag and Drop handlers
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      // Project client position to react flow coordinates
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Generate unique ID
      const newId = `${type}_${Date.now()}`;
      
      // Default node configurations
      let initialData = {};
      if (type === 'delay') {
        initialData = { duration: 5, unit: 'seconds' };
      } else if (type === 'condition') {
        initialData = { value1: '', operator: '==', value2: '' };
      } else if (type === 'log') {
        initialData = { message: 'Workflow executando step...' };
      } else if (type === 'save_file') {
        initialData = { file_type: 'TXT', filename: 'arquivo.txt', content: 'Log data: {{last_output}}' };
      } else if (type === 'python_script') {
        initialData = { code: "# Acesso ao context dict:\nprint(f'Workflow ativo: {context.get(\"workflow_name\")}')\n" };
      }

      const newNode = {
        id: newId,
        type,
        position,
        data: initialData,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // Save Flow to backend DB
  const handleSaveFlow = async () => {
    setSaving(true);
    try {
      // Map nodes to Backend format schema
      const mappedNodes = nodes.map(n => ({
        id: n.id,
        type: n.type,
        data: n.data,
        position: { x: n.position.x, y: n.position.y }
      }));

      // Map edges to Backend format schema
      const mappedEdges = edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null
      }));

      const updated = await workflowsAPI.update(id, {
        name: workflow.name,
        nodes: mappedNodes,
        edges: mappedEdges
      });
      setWorkflow(updated);
      alert('Workflow salvo com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar workflow no servidor.');
    } finally {
      setSaving(false);
    }
  };

  // Execute manual run + open WebSockets log streaming
  const handleRunFlow = async () => {
    // Auto-save before running to ensure backend executes the current layout
    await handleSaveFlow();

    setRunning(true);
    setExecutionStatus('running');
    setExecutionLogs([]);
    setShowLogsDrawer(true);

    try {
      // Open WebSocket connection first to prepare listener
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(`ws://localhost:8000/ws/${id}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WS Connection established');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'log') {
            setExecutionLogs((prev) => [...prev, payload]);
          } else if (payload.type === 'status') {
            setExecutionStatus(payload.status);
            if (payload.status === 'success' || payload.status === 'failed') {
              setRunning(false);
            }
          }
        } catch (err) {
          console.error(err);
        }
      };

      ws.onerror = (err) => {
        console.error('WS Error:', err);
      };

      ws.onclose = () => {
        console.log('WS Connection closed');
      };

      // Trigger run on backend REST endpoint
      await workflowsAPI.run(id);

    } catch (err) {
      console.error(err);
      alert('Erro ao disparar execução.');
      setRunning(false);
      setExecutionStatus('failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
        <p className="text-dark-muted text-sm font-medium animate-pulse">Carregando canvas...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
      {/* Editor Top Menu */}
      <header className="h-16 border-b border-dark-border bg-dark-card/50 backdrop-blur-md px-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-dark-input hover:bg-dark-border text-dark-muted hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-white leading-none">{workflow?.name}</h2>
            <p className="text-[11px] text-dark-muted mt-1">
              Gatilho:{' '}
              <span className="text-brand-secondary font-semibold uppercase">
                {workflow?.trigger_type}
              </span>
            </p>
          </div>
        </div>

        {/* Editor actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLogsDrawer(!showLogsDrawer)}
            className={`font-semibold py-2 px-4 rounded-xl text-xs transition-colors border ${
              showLogsDrawer
                ? 'bg-brand-primary/10 border-brand-primary/40 text-brand-primary'
                : 'bg-dark-input border-dark-border text-dark-muted hover:text-white'
            }`}
          >
            Terminal Logs
          </button>
          <button
            onClick={handleSaveFlow}
            disabled={saving}
            className="bg-dark-input hover:bg-dark-border text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-2 border border-dark-border disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Salvar</span>
          </button>
          <button
            onClick={handleRunFlow}
            disabled={running}
            className="bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-2 shadow-glow-accent disabled:opacity-50 hover:scale-[1.02] transition-transform"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white/10" />}
            <span>Testar Fluxo</span>
          </button>
        </div>
      </header>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Node Palette */}
        <div className="w-64 border-r border-dark-border bg-dark-card/30 flex flex-col p-4 z-10">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-brand-primary" />
            <span>Blocos de Ação</span>
          </h3>
          <p className="text-[10px] text-dark-muted mb-4">Arraste os nós para o canvas para adicioná-los ao workflow.</p>
          
          <div className="space-y-3 overflow-y-auto pr-1">
            {paletteItems.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={(event) => onDragStart(event, item.type)}
                className="bg-dark-card border border-dark-border hover:border-brand-primary/40 rounded-xl p-3 cursor-grab hover:shadow-glow-primary active:cursor-grabbing transition-all select-none"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`p-1.5 rounded-lg ${item.color} bg-opacity-10 border border-white/5`}>
                    <item.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h4 className="text-xs font-bold text-white">{item.name}</h4>
                </div>
                <p className="text-[10px] text-dark-muted leading-tight">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Center: React Flow Canvas */}
        <div className="flex-1 h-full relative" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
          >
            <Controls />
            <MiniMap 
              nodeStrokeColor={(n) => {
                if (n.type === 'start') return '#10B981';
                if (n.type === 'delay') return '#3B82F6';
                if (n.type === 'condition') return '#F59E0B';
                if (n.type === 'log') return '#6366F1';
                if (n.type === 'save_file') return '#06B6D4';
                if (n.type === 'python_script') return '#A855F7';
                return '#4B5563';
              }}
              nodeColor={() => '#131B2E'}
              nodeBorderRadius={8}
            />
            <Background variant="dots" gap={16} size={1} />
          </ReactFlow>
        </div>

        {/* Right Panel: Properties Editor / Live Logs Drawer */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-80 border-l border-dark-border bg-dark-card/95 backdrop-blur-md flex flex-col z-20 absolute right-0 top-0 bottom-0 shadow-2xl"
            >
              {/* Properties Header */}
              <div className="px-5 py-4 border-b border-dark-border flex justify-between items-center bg-dark-input/20">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Configurar Bloco</h3>
                  <p className="text-[10px] text-dark-muted font-mono leading-none mt-1">ID: {selectedNode.id}</p>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-dark-muted hover:text-white p-1 rounded-lg hover:bg-dark-input transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Properties Form Fields */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {selectedNode.type === 'start' && (
                  <div className="text-center py-6 text-dark-muted">
                    <Play className="w-10 h-10 mx-auto text-brand-accent/50 mb-3" />
                    <p className="text-xs font-bold text-white mb-1">Gatilho de Início</p>
                    <p className="text-[10px] leading-relaxed">Este bloco representa o ponto de entrada manual. Não possui parâmetros customizáveis.</p>
                  </div>
                )}

                {selectedNode.type === 'end' && (
                  <div className="text-center py-6 text-dark-muted">
                    <CheckCircle className="w-10 h-10 mx-auto text-slate-500/50 mb-3" />
                    <p className="text-xs font-bold text-white mb-1">Bloco de Fim</p>
                    <p className="text-[10px] leading-relaxed">Representa o término da execução sequencial deste ramal.</p>
                  </div>
                )}

                {selectedNode.type === 'delay' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-muted uppercase tracking-wider mb-2">Tempo de Pausa</label>
                      <input
                        type="number"
                        min="1"
                        value={selectedNode.data.duration || ''}
                        onChange={(e) => updateNodeData('duration', parseInt(e.target.value) || 1)}
                        className="w-full bg-dark-input border border-dark-border rounded-xl py-2 px-3 text-white focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-muted uppercase tracking-wider mb-2">Unidade</label>
                      <select
                        value={selectedNode.data.unit || 'seconds'}
                        onChange={(e) => updateNodeData('unit', e.target.value)}
                        className="w-full bg-dark-input border border-dark-border rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-brand-primary"
                      >
                        <option value="seconds">Segundos</option>
                        <option value="minutes">Minutos</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'condition' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-muted uppercase tracking-wider mb-2">Valor 1</label>
                      <input
                        type="text"
                        value={selectedNode.data.value1 || ''}
                        onChange={(e) => updateNodeData('value1', e.target.value)}
                        placeholder="Ex: {{last_output}} ou 10"
                        className="w-full bg-dark-input border border-dark-border rounded-xl py-2 px-3 text-white focus:outline-none focus:border-brand-primary text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-muted uppercase tracking-wider mb-2">Operador</label>
                      <select
                        value={selectedNode.data.operator || '=='}
                        onChange={(e) => updateNodeData('operator', e.target.value)}
                        className="w-full bg-dark-input border border-dark-border rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-brand-primary"
                      >
                        <option value="==">Igual (==)</option>
                        <option value=">">Maior que (&gt;)</option>
                        <option value="<">Menor que (&lt;)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-muted uppercase tracking-wider mb-2">Valor 2</label>
                      <input
                        type="text"
                        value={selectedNode.data.value2 || ''}
                        onChange={(e) => updateNodeData('value2', e.target.value)}
                        placeholder="Ex: 10"
                        className="w-full bg-dark-input border border-dark-border rounded-xl py-2 px-3 text-white focus:outline-none focus:border-brand-primary text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.type === 'log' && (
                  <div>
                    <label className="block text-[10px] font-semibold text-dark-muted uppercase tracking-wider mb-2">Mensagem do Log</label>
                    <textarea
                      value={selectedNode.data.message || ''}
                      onChange={(e) => updateNodeData('message', e.target.value)}
                      placeholder="Use {{last_output}} para exibir retornos anteriores."
                      rows={4}
                      className="w-full bg-dark-input border border-dark-border rounded-xl py-2 px-3 text-white focus:outline-none focus:border-brand-primary text-xs font-medium"
                    />
                  </div>
                )}

                {selectedNode.type === 'save_file' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-muted uppercase tracking-wider mb-2">Formato</label>
                      <select
                        value={selectedNode.data.file_type || 'TXT'}
                        onChange={(e) => updateNodeData('file_type', e.target.value)}
                        className="w-full bg-dark-input border border-dark-border rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-brand-primary"
                      >
                        <option value="TXT">TXT</option>
                        <option value="JSON">JSON</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-muted uppercase tracking-wider mb-2">Nome do Arquivo</label>
                      <input
                        type="text"
                        value={selectedNode.data.filename || ''}
                        onChange={(e) => updateNodeData('filename', e.target.value)}
                        placeholder="Ex: resultado.txt"
                        className="w-full bg-dark-input border border-dark-border rounded-xl py-2 px-3 text-white focus:outline-none focus:border-brand-primary text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-muted uppercase tracking-wider mb-2">Conteúdo do Arquivo</label>
                      <textarea
                        value={selectedNode.data.content || ''}
                        onChange={(e) => updateNodeData('content', e.target.value)}
                        placeholder="Insira dados. Suporta templates {{last_output}} ou {{started_at}}."
                        rows={6}
                        className="w-full bg-dark-input border border-dark-border rounded-xl py-2 px-3 text-white focus:outline-none focus:border-brand-primary text-xs font-medium"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.type === 'python_script' && (
                  <div>
                    <label className="block text-[10px] font-semibold text-dark-muted uppercase tracking-wider mb-2">Script Python</label>
                    <textarea
                      value={selectedNode.data.code || ''}
                      onChange={(e) => updateNodeData('code', e.target.value)}
                      placeholder="print('AutoFlow script')"
                      rows={12}
                      className="w-full bg-dark-input border border-dark-border rounded-xl py-3 px-3 text-white focus:outline-none focus:border-brand-primary text-[10px] font-mono leading-relaxed"
                    />
                    <p className="text-[10px] text-dark-muted mt-2">
                      Variáveis de execução são recebidas no dict <code className="text-purple-400">context</code>. Capture outputs imprimindo na stdout via <code className="text-purple-400">print()</code>.
                    </p>
                  </div>
                )}
              </div>

              {/* Properties Footer */}
              <div className="p-4 border-t border-dark-border bg-dark-input/10">
                <button
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-error/10 hover:bg-brand-error/20 text-brand-error font-semibold rounded-xl text-xs transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Bloco</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Logs Drawer */}
        <AnimatePresence>
          {showLogsDrawer && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-96 border-l border-dark-border bg-[#05070B] flex flex-col z-20 absolute right-0 top-0 bottom-0 shadow-2xl"
              style={{ top: '64px' }} // Positioned below header
            >
              {/* Logs Header */}
              <div className="px-5 py-4 border-b border-dark-border flex justify-between items-center bg-dark-card/50">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${running ? 'bg-brand-accent animate-pulse' : (executionStatus === 'failed' ? 'bg-brand-error' : 'bg-dark-muted')}`}></div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Logs de Execução</h3>
                </div>
                <button
                  onClick={() => setShowLogsDrawer(false)}
                  className="text-dark-muted hover:text-white p-1 rounded-lg hover:bg-dark-input transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Logs Content Terminal */}
              <div className="flex-1 overflow-y-auto p-5 font-mono text-[10px] leading-relaxed space-y-3 bg-[#020406]">
                {executionLogs.length === 0 ? (
                  <div className="text-center py-20 text-dark-muted">
                    <Terminal className="w-8 h-8 mx-auto text-dark-muted/40 mb-2 animate-pulse" />
                    <span>Nenhum log gerado ainda.</span>
                    <p className="text-[9px] mt-1">Dispare um "Testar Fluxo" para visualizar logs em tempo real via WebSocket.</p>
                  </div>
                ) : (
                  executionLogs.map((log, i) => {
                    const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('pt-BR') : '';
                    const isError = log.log_level === 'error';
                    const isWarning = log.log_level === 'warning';
                    
                    return (
                      <div key={i} className="flex gap-2">
                        <span className="text-dark-muted shrink-0">[{time}]</span>
                        <span className={`shrink-0 font-bold ${isError ? 'text-brand-error' : (isWarning ? 'text-brand-warning' : 'text-brand-accent')}`}>
                          [{log.log_level.toUpperCase()}]
                        </span>
                        <span className="text-white break-all">{log.message}</span>
                      </div>
                    );
                  })
                )}
                <div ref={logsEndRef}></div>
              </div>

              {/* Logs Footer */}
              <div className="p-4 border-t border-dark-border bg-dark-card/30 flex justify-between items-center text-[10px]">
                <span className="text-dark-muted">Status: <strong className="text-white uppercase">{executionStatus || 'Inativo'}</strong></span>
                {running && (
                  <div className="flex items-center gap-1 text-brand-primary">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Escutando WebSocket...</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const EditorWrapper = () => {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
};

export default EditorWrapper;

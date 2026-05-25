import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workflowsAPI } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Edit2, 
  Trash2, 
  Plus, 
  Workflow, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Zap,
  Power,
  X,
  Loader2,
  FileText
} from 'lucide-react';

const Dashboard = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWfName, setNewWfName] = useState('');
  const [newWfDesc, setNewWfDesc] = useState('');
  const [newWfTrigger, setNewWfTrigger] = useState('manual'); // 'manual', 'cron'
  const [newWfCron, setNewWfCron] = useState('');
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const data = await workflowsAPI.list();
      setWorkflows(data);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar workflows do servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleToggleActive = async (wf) => {
    try {
      const updated = await workflowsAPI.update(wf.id, {
        is_active: !wf.is_active
      });
      setWorkflows(workflows.map(item => item.id === wf.id ? updated : item));
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status do workflow.');
    }
  };

  const handleRunWorkflow = async (wf) => {
    try {
      await workflowsAPI.run(wf.id);
      alert(`Workflow '${wf.name}' iniciado no backend! Abra o editor para visualizar os logs em tempo real.`);
    } catch (err) {
      console.error(err);
      alert('Erro ao executar o workflow.');
    }
  };

  const handleDeleteWorkflow = async (id) => {
    if (!window.confirm('Tem certeza de que deseja excluir este workflow?')) return;
    try {
      await workflowsAPI.delete(id);
      setWorkflows(workflows.filter(item => item.id !== id));
    } catch (err) {
      console.error(err);
      alert('Erro ao deletar workflow.');
    }
  };

  const handleCreateWorkflow = async (e) => {
    e.preventDefault();
    if (!newWfName.trim()) return;

    setCreating(true);
    try {
      // Standard initial nodes for Vite React Flow: Start Node (x:100, y:200) and End Node (x:600, y:200)
      const initialNodes = [
        { id: 'start_1', type: 'start', position: { x: 100, y: 200 }, data: {} },
        { id: 'end_1', type: 'end', position: { x: 600, y: 200 }, data: {} }
      ];
      // An edge connecting them
      const initialEdges = [
        { id: 'estart_1-end_1', source: 'start_1', target: 'end_1', sourceHandle: null, targetHandle: null }
      ];

      const newWf = await workflowsAPI.create({
        name: newWfName,
        description: newWfDesc,
        trigger_type: newWfTrigger,
        cron_expression: newWfTrigger === 'cron' ? newWfCron : null,
        is_active: true,
        nodes: initialNodes,
        edges: initialEdges
      });

      setIsModalOpen(false);
      // Reset form
      setNewWfName('');
      setNewWfDesc('');
      setNewWfTrigger('manual');
      setNewWfCron('');

      // Redirect to editor
      navigate(`/editor/${newWf.id}`);
    } catch (err) {
      console.error(err);
      alert('Erro ao criar workflow. Verifique os dados inseridos.');
    } finally {
      setCreating(false);
    }
  };

  // Compile stats
  const totalWorkflows = workflows.length;
  const activeWorkflows = workflows.filter(w => w.is_active).length;
  const scheduledWorkflows = workflows.filter(w => w.trigger_type === 'cron').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-slide-in">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Dashboard</h1>
          <p className="text-sm text-dark-muted mt-1">Gerencie suas automações e fluxos ativos.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-primary hover:bg-brand-primary/95 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-glow-primary hover:scale-[1.02]"
        >
          <Plus className="w-5 h-5" />
          <span>Criar Workflow</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Total Workflows', value: totalWorkflows, desc: 'Criados na plataforma', icon: Workflow, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
          { title: 'Workflows Ativos', value: activeWorkflows, desc: 'Executando ou agendados', icon: Power, color: 'text-brand-accent', bg: 'bg-brand-accent/10' },
          { title: 'Agendamentos Cron', value: scheduledWorkflows, desc: 'Executam periodicamente', icon: Calendar, color: 'text-brand-secondary', bg: 'bg-brand-secondary/10' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -4 }}
            className="bg-dark-card border border-dark-border p-6 rounded-2xl shadow-glass flex justify-between items-center"
          >
            <div>
              <p className="text-sm font-medium text-dark-muted uppercase tracking-wider">{stat.title}</p>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-sans">{stat.value}</h3>
              <p className="text-xs text-dark-muted mt-1">{stat.desc}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} border border-white/5`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Workflows Section */}
      <div className="bg-dark-card border border-dark-border rounded-2xl shadow-glass overflow-hidden">
        <div className="px-6 py-5 border-b border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Meus Workflows</h2>
          <button 
            onClick={fetchWorkflows} 
            className="text-xs font-semibold text-brand-primary hover:underline"
          >
            Atualizar Lista
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
            <p className="text-dark-muted text-sm font-medium">Carregando automações...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-brand-error gap-2">
            <AlertTriangle className="w-8 h-8" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-20">
            <Workflow className="w-12 h-12 text-dark-muted/40 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white">Nenhum workflow encontrado</h3>
            <p className="text-sm text-dark-muted max-w-sm mx-auto mt-1">Crie seu primeiro workflow visual usando blocos de arrastar e soltar agora mesmo.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-5 bg-dark-input border border-dark-border text-white hover:bg-dark-border transition-colors font-semibold py-2 px-4 rounded-xl text-sm"
            >
              Começar Agora
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-input/50 text-dark-muted text-xs font-semibold uppercase tracking-wider border-b border-dark-border">
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Gatilho</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Criado em</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-sm">
                {workflows.map((wf) => (
                  <tr key={wf.id} className="hover:bg-dark-input/20 transition-colors">
                    <td className="px-6 py-5">
                      <div className="font-semibold text-white">{wf.name}</div>
                      <div className="text-xs text-dark-muted truncate max-w-xs mt-0.5">{wf.description || 'Sem descrição'}</div>
                    </td>
                    <td className="px-6 py-5">
                      {wf.trigger_type === 'cron' ? (
                        <div className="flex items-center gap-1.5 text-brand-secondary font-medium">
                          <Calendar className="w-4 h-4" />
                          <span>Cron ({wf.cron_expression})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-dark-muted">
                          <Zap className="w-4 h-4 text-brand-warning" />
                          <span>Manual</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <button
                        onClick={() => handleToggleActive(wf)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                          wf.is_active 
                            ? 'bg-brand-accent/10 border-brand-accent/30 text-brand-accent' 
                            : 'bg-dark-input border-dark-border text-dark-muted'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{wf.is_active ? 'Ativo' : 'Inativo'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-5 text-dark-muted">
                      {new Date(wf.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-5 text-right space-x-2">
                      <button
                        onClick={() => handleRunWorkflow(wf)}
                        title="Executar workflow"
                        className="bg-brand-accent/10 border border-brand-accent/20 hover:bg-brand-accent/20 text-brand-accent p-2 rounded-xl transition-colors"
                      >
                        <Play className="w-4 h-4 fill-brand-accent/20" />
                      </button>
                      <button
                        onClick={() => navigate(`/editor/${wf.id}`)}
                        title="Editar no Canvas"
                        className="bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/20 text-brand-primary p-2 rounded-xl transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorkflow(wf.id)}
                        title="Excluir"
                        className="bg-brand-error/10 border border-brand-error/20 hover:bg-brand-error/20 text-brand-error p-2 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal - Create Workflow */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            ></motion.div>

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-dark-card border border-dark-border w-full max-w-lg rounded-2xl shadow-glass overflow-hidden relative z-10"
            >
              <div className="px-6 py-5 border-b border-dark-border flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-brand-primary" />
                  <h3 className="text-lg font-bold text-white">Novo Workflow</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-dark-muted hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateWorkflow} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-2">Nome</label>
                  <input
                    type="text"
                    required
                    value={newWfName}
                    onChange={(e) => setNewWfName(e.target.value)}
                    placeholder="Ex: Enviar e-mail de Boas Vindas"
                    className="w-full bg-dark-input border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-2">Descrição (Opcional)</label>
                  <textarea
                    value={newWfDesc}
                    onChange={(e) => setNewWfDesc(e.target.value)}
                    placeholder="Descreva brevemente o objetivo deste fluxo"
                    rows={2}
                    className="w-full bg-dark-input border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-2">Tipo de Gatilho</label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setNewWfTrigger('manual')}
                      className={`py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        newWfTrigger === 'manual'
                          ? 'bg-brand-primary/10 border-brand-primary text-white'
                          : 'bg-dark-input border-dark-border text-dark-muted hover:text-white'
                      }`}
                    >
                      <Zap className="w-4 h-4 text-brand-warning" />
                      <span>Manual (Botão)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewWfTrigger('cron')}
                      className={`py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        newWfTrigger === 'cron'
                          ? 'bg-brand-primary/10 border-brand-primary text-white'
                          : 'bg-dark-input border-dark-border text-dark-muted hover:text-white'
                      }`}
                    >
                      <Calendar className="w-4 h-4 text-brand-secondary" />
                      <span>Cron (Agendador)</span>
                    </button>
                  </div>
                </div>

                {newWfTrigger === 'cron' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider">Expressão Cron</label>
                    <input
                      type="text"
                      required
                      value={newWfCron}
                      onChange={(e) => setNewWfCron(e.target.value)}
                      placeholder="Ex: */5 * * * * (a cada 5 minutos)"
                      className="w-full bg-dark-input border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand-primary"
                    />
                    <p className="text-xs text-dark-muted">Siga o padrão clássico do Linux Cron: <code className="text-brand-secondary font-mono">minuto hora dia_do_mês mês dia_da_semana</code>.</p>
                  </motion.div>
                )}

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-dark-input hover:bg-dark-border text-white font-semibold py-3 rounded-xl transition-colors text-sm border border-dark-border"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-glow-primary"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Criando...</span>
                      </>
                    ) : (
                      <span>Começar no Builder</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;

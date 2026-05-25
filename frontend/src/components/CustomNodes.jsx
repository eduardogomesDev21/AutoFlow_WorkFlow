import React from 'react';
import { Handle, Position } from 'reactflow';
import { 
  Play, 
  Clock, 
  GitFork, 
  Terminal, 
  FileJson, 
  FileText, 
  CheckCircle,
  HelpCircle,
  Hash
} from 'lucide-react';

const NodeWrapper = ({ title, icon: Icon, color, selected, children }) => {
  return (
    <div className={`autoflow-node ${selected ? 'border-brand-primary shadow-glow-primary' : ''}`}>
      {/* Accent Top Bar */}
      <div className={`h-1.5 ${color}`}></div>
      {/* Node Header */}
      <div className="p-3 border-b border-dark-border/40 flex items-center gap-2 bg-dark-input/20">
        <div className={`p-1.5 rounded-lg ${color} bg-opacity-10 border border-white/5`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-white truncate">{title}</h4>
        </div>
      </div>
      {/* Node Body */}
      <div className="p-3 text-[11px] text-dark-muted font-medium bg-dark-card">
        {children}
      </div>
    </div>
  );
};

export const StartNode = ({ selected }) => {
  return (
    <NodeWrapper title="Início" icon={Play} color="bg-brand-accent" selected={selected}>
      <p className="text-brand-accent/90 flex items-center gap-1 font-semibold">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>Gatilho manual</span>
      </p>
      <Handle type="source" position={Position.Right} />
    </NodeWrapper>
  );
};

export const DelayNode = ({ data, selected }) => {
  const duration = data.duration || 0;
  const unit = data.unit || 'seconds';
  const unitLabel = unit === 'minutes' ? 'minuto(s)' : 'segundo(s)';

  return (
    <NodeWrapper title="Aguardar (Delay)" icon={Clock} color="bg-brand-secondary" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <div className="space-y-1">
        <p className="text-white/90">Pausa na execução</p>
        <p className="text-dark-muted text-[10px] font-mono bg-dark-input px-1.5 py-0.5 rounded inline-block">
          {duration} {unitLabel}
        </p>
      </div>
      <Handle type="source" position={Position.Right} />
    </NodeWrapper>
  );
};

export const ConditionNode = ({ data, selected }) => {
  const val1 = data.value1 !== undefined ? data.value1 : '';
  const op = data.operator || '==';
  const val2 = data.value2 !== undefined ? data.value2 : '';

  return (
    <NodeWrapper title="Condição (If)" icon={GitFork} color="bg-brand-warning" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <div className="space-y-1">
        <p className="text-white/80">Avaliar expressão:</p>
        <p className="text-brand-warning font-mono bg-dark-input px-1.5 py-0.5 rounded text-[10px] truncate max-w-[190px]">
          {val1 || 'var'} {op} {val2 || 'valor'}
        </p>
        <div className="flex justify-between items-center text-[9px] text-dark-muted mt-2 pt-1 border-t border-dark-border/20">
          <span>Verdadeiro ➔ (D)</span>
          <span>Falso ➔ (B)</span>
        </div>
      </div>
      {/* True Handle on the Right */}
      <Handle type="source" position={Position.Right} id="true" title="Verdadeiro" />
      {/* False Handle at the Bottom */}
      <Handle type="source" position={Position.Bottom} id="false" title="Falso" />
    </NodeWrapper>
  );
};

export const LogNode = ({ data, selected }) => {
  const message = data.message || '';

  return (
    <NodeWrapper title="Registrar Log" icon={Terminal} color="bg-brand-primary" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <div className="space-y-1">
        <p className="text-white/90 truncate max-w-[190px]" title={message}>
          {message ? `Msg: "${message}"` : 'Mensagem vazia'}
        </p>
      </div>
      <Handle type="source" position={Position.Right} />
    </NodeWrapper>
  );
};

export const SaveFileNode = ({ data, selected }) => {
  const fileType = data.file_type || 'TXT';
  const filename = data.filename || '';
  const isJson = fileType.toUpperCase() === 'JSON';

  return (
    <NodeWrapper title="Salvar Arquivo" icon={isJson ? FileJson : FileText} color="bg-cyan-500" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <div className="space-y-1">
        <p className="text-white/90 truncate max-w-[190px]">{filename || 'sem_nome.txt'}</p>
        <p className="text-dark-muted text-[9px] uppercase font-bold bg-dark-input px-1.5 py-0.5 rounded inline-block">
          Formato: {fileType}
        </p>
      </div>
      <Handle type="source" position={Position.Right} />
    </NodeWrapper>
  );
};

export const PythonScriptNode = ({ data, selected }) => {
  const code = data.code || '';
  const lines = code.trim().split('\n');
  const preview = lines[0] ? lines[0].substring(0, 25) + (lines.length > 1 ? '...' : '') : 'print(...)';

  return (
    <NodeWrapper title="Script Python" icon={Terminal} color="bg-purple-500" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <div className="space-y-1">
        <p className="text-white/90 font-mono text-[10px] bg-dark-input p-1 rounded overflow-hidden truncate max-w-[190px]">
          {preview}
        </p>
        <p className="text-dark-muted text-[9px]">Execução em subprocesso</p>
      </div>
      <Handle type="source" position={Position.Right} />
    </NodeWrapper>
  );
};

export const EndNode = ({ selected }) => {
  return (
    <NodeWrapper title="Fim" icon={CheckCircle} color="bg-slate-500" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <p className="text-dark-muted text-[10px]">Fim do workflow</p>
    </NodeWrapper>
  );
};

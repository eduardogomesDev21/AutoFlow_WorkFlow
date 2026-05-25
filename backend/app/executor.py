import asyncio
import os
import sys
import json
import re
import tempfile
import subprocess
import base64
from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from .config import settings
from .database import SessionLocal
from .models import Workflow, WorkflowNode, WorkflowEdge, WorkflowExecution, ExecutionLog
from .ws_manager import manager

def resolve_value(val: Any, context: dict) -> Any:
    if not isinstance(val, str):
        return val
    # If val is exactly like "{{var}}", return the variable from context
    if val.startswith("{{") and val.endswith("}}"):
        var_name = val[2:-2].strip()
        return context.get(var_name, "")
    # Otherwise replace all occurrences of {{var}} in the string
    def replacer(match):
        var_name = match.group(1).strip()
        return str(context.get(var_name, match.group(0)))
    return re.sub(r"\{\{([^}]+)\}\}", replacer, val)

def run_python_script(script_code: str, context: dict) -> tuple[int, str, str]:
    # Serialize context and encode as base64 to avoid syntax/escaping issues with quotes
    context_json = json.dumps(context)
    context_b64 = base64.b64encode(context_json.encode('utf-8')).decode('utf-8')
    prelude = f"""
import json
import base64
context = json.loads(base64.b64decode('{context_b64}').decode('utf-8'))
"""
    full_code = prelude + "\n" + script_code
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(full_code)
        temp_name = f.name
        
    try:
        res = subprocess.run(
            [sys.executable, temp_name],
            capture_output=True,
            text=True,
            timeout=10
        )
        return res.returncode, res.stdout, res.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Script execution timed out (limit: 10s)"
    except Exception as e:
        return -2, "", str(e)
    finally:
        try:
            os.remove(temp_name)
        except Exception:
            pass

async def emit_log(db: Session, execution_id: int, workflow_id: int, node_id: Optional[str], level: str, message: str):
    # Save log to database
    log = ExecutionLog(
        execution_id=execution_id,
        node_id=node_id,
        log_level=level,
        message=message
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # Broadcast to WebSocket subscribers of this workflow
    log_payload = {
        "type": "log",
        "workflow_id": workflow_id,
        "execution_id": execution_id,
        "node_id": node_id,
        "log_level": level,
        "message": message,
        "timestamp": log.timestamp.isoformat()
    }
    await manager.broadcast_to_workflow(str(workflow_id), log_payload)

async def emit_status(db: Session, execution_id: int, workflow_id: int, status: str, completed_at: Optional[datetime] = None):
    # Broadcast status change to WebSocket
    status_payload = {
        "type": "status",
        "workflow_id": workflow_id,
        "execution_id": execution_id,
        "status": status,
        "completed_at": completed_at.isoformat() if completed_at else None
    }
    await manager.broadcast_to_workflow(str(workflow_id), status_payload)

async def execute_workflow(workflow_id: int, execution_id: int):
    db = SessionLocal()
    try:
        # Get execution and workflow
        execution = db.query(WorkflowExecution).filter(WorkflowExecution.id == execution_id).first()
        if not execution:
            print(f"Execution {execution_id} not found in database.")
            return

        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow:
            execution.status = "failed"
            execution.completed_at = datetime.utcnow()
            db.commit()
            return

        # Fetch nodes and edges
        nodes = db.query(WorkflowNode).filter(WorkflowNode.workflow_id == workflow_id).all()
        edges = db.query(WorkflowEdge).filter(WorkflowEdge.workflow_id == workflow_id).all()

        nodes_by_id = {node.node_id: node for node in nodes}
        
        # Build connections mapping: source_node -> list of edges
        edges_from_source = {}
        for edge in edges:
            if edge.source_node_id not in edges_from_source:
                edges_from_source[edge.source_node_id] = []
            edges_from_source[edge.source_node_id].append(edge)

        # Find Start Node
        start_node = next((n for n in nodes if n.type == "start"), None)
        if not start_node:
            await emit_log(db, execution_id, workflow_id, None, "error", "Erro: O workflow não possui um Start Node.")
            execution.status = "failed"
            execution.completed_at = datetime.utcnow()
            db.commit()
            await emit_status(db, execution_id, workflow_id, "failed", execution.completed_at)
            return

        # Initialize context
        context = {
            "workflow_name": workflow.name,
            "started_at": execution.started_at.isoformat(),
            "last_output": ""
        }

        current_node = start_node
        await emit_log(db, execution_id, workflow_id, current_node.node_id, "info", f"Workflow '{workflow.name}' iniciado.")

        # Main execution loop
        while current_node:
            node_id = current_node.node_id
            node_type = current_node.type
            node_data = current_node.data or {}

            # Execute node logic
            if node_type == "start":
                # Start node is just an entrypoint
                await emit_log(db, execution_id, workflow_id, node_id, "info", "[Start] Iniciando fluxo.")
                next_handle = None

            elif node_type == "delay":
                duration = float(node_data.get("duration", 0))
                unit = node_data.get("unit", "seconds") # "seconds", "minutes"
                seconds = duration * 60 if unit == "minutes" else duration
                
                await emit_log(db, execution_id, workflow_id, node_id, "info", f"[Delay] Pausando por {duration} {unit}...")
                await asyncio.sleep(seconds)
                await emit_log(db, execution_id, workflow_id, node_id, "info", "[Delay] Concluído.")
                next_handle = None

            elif node_type == "condition":
                val1 = resolve_value(node_data.get("value1", ""), context)
                operator = node_data.get("operator", "==")
                val2 = resolve_value(node_data.get("value2", ""), context)

                # Try numeric conversion
                try:
                    num1 = float(val1)
                    num2 = float(val2)
                    is_numeric = True
                except ValueError:
                    num1, num2 = val1, val2
                    is_numeric = False

                result = False
                if operator == "==":
                    result = str(val1) == str(val2)
                elif operator == ">":
                    if is_numeric:
                        result = num1 > num2
                    else:
                        result = str(val1) > str(val2)
                elif operator == "<":
                    if is_numeric:
                        result = num1 < num2
                    else:
                        result = str(val1) < str(val2)

                await emit_log(db, execution_id, workflow_id, node_id, "info", f"[Condition] Avaliando: '{val1}' {operator} '{val2}' -> Resultado: {result}")
                next_handle = "true" if result else "false"

            elif node_type == "log":
                raw_message = node_data.get("message", "")
                resolved_message = resolve_value(raw_message, context)
                await emit_log(db, execution_id, workflow_id, node_id, "info", f"[Log] {resolved_message}")
                next_handle = None

            elif node_type == "save_file":
                file_type = node_data.get("file_type", "TXT").upper() # "TXT", "JSON"
                filename_template = node_data.get("filename", "output.txt")
                content_template = node_data.get("content", "")

                filename = resolve_value(filename_template, context)
                content = resolve_value(content_template, context)

                # Simple extension cleanup
                if file_type == "JSON" and not filename.endswith(".json"):
                    filename = filename.split(".")[0] + ".json"
                elif file_type == "TXT" and not filename.endswith(".txt"):
                    filename = filename.split(".")[0] + ".txt"

                file_path = os.path.join(settings.GENERATED_DIR, filename)
                
                try:
                    with open(file_path, "w") as f:
                        if file_type == "JSON":
                            # Try to parse content as JSON first to format it nicely
                            try:
                                parsed = json.loads(content)
                                json.dump(parsed, f, indent=2)
                            except ValueError:
                                # Write raw string
                                f.write(content)
                        else:
                            f.write(content)

                    await emit_log(db, execution_id, workflow_id, node_id, "info", f"[Save File] Arquivo '{filename}' salvo com sucesso em /generated.")
                    context["saved_file"] = file_path
                except Exception as e:
                    await emit_log(db, execution_id, workflow_id, node_id, "error", f"[Save File] Erro ao salvar arquivo: {str(e)}")
                next_handle = None

            elif node_type == "python_script":
                code = node_data.get("code", "print('Hello AutoFlow')")
                await emit_log(db, execution_id, workflow_id, node_id, "info", "[Python Script] Executando script...")
                
                code_status, stdout, stderr = run_python_script(code, context)
                
                # Combine output for logs
                if stdout:
                    for line in stdout.splitlines():
                        if line.strip():
                            await emit_log(db, execution_id, workflow_id, node_id, "info", f"[Python Script stdout] {line}")
                if stderr:
                    for line in stderr.splitlines():
                        if line.strip():
                            await emit_log(db, execution_id, workflow_id, node_id, "error", f"[Python Script stderr] {line}")

                if code_status == 0:
                    await emit_log(db, execution_id, workflow_id, node_id, "info", "[Python Script] Script executado com sucesso.")
                    context["last_output"] = stdout.strip()
                else:
                    await emit_log(db, execution_id, workflow_id, node_id, "error", f"[Python Script] Script retornou erro (código {code_status}).")
                    context["last_output"] = f"Error: {stderr.strip()}"
                
                next_handle = None

            elif node_type == "end":
                await emit_log(db, execution_id, workflow_id, node_id, "info", "[End] Fluxo finalizado.")
                break

            else:
                await emit_log(db, execution_id, workflow_id, node_id, "warning", f"Tipo de nó desconhecido: '{node_type}'. Ignorando.")
                next_handle = None

            # Find next node based on edges
            node_edges = edges_from_source.get(node_id, [])
            next_node = None

            if node_type == "condition":
                # Must match source_handle ("true" or "false")
                condition_edge = next((e for e in node_edges if e.source_handle == next_handle), None)
                if condition_edge:
                    next_node = nodes_by_id.get(condition_edge.target_node_id)
            else:
                # Follow the first edge out of this node
                if node_edges:
                    next_node = nodes_by_id.get(node_edges[0].target_node_id)

            current_node = next_node

        # Mark execution as success
        execution.status = "success"
        execution.completed_at = datetime.utcnow()
        db.commit()
        await emit_log(db, execution_id, workflow_id, None, "info", "Workflow executado com sucesso.")
        await emit_status(db, execution_id, workflow_id, "success", execution.completed_at)

    except Exception as e:
        import traceback
        error_msg = f"Erro fatal durante execução do workflow: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        try:
            execution.status = "failed"
            execution.completed_at = datetime.utcnow()
            db.commit()
            await emit_log(db, execution_id, workflow_id, None, "error", f"Erro fatal: {str(e)}")
            await emit_status(db, execution_id, workflow_id, "failed", execution.completed_at)
        except Exception as db_err:
            print(f"Erro ao salvar falha no DB: {db_err}")
    finally:
        db.close()

import asyncio
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import settings
from .database import engine, Base, get_db
from .models import User, Workflow, WorkflowNode, WorkflowEdge, WorkflowExecution, ExecutionLog
from .schemas import (
    UserCreate, UserOut, UserLogin, Token,
    WorkflowCreate, WorkflowOut, WorkflowUpdate,
    WorkflowExecutionOut, WorkflowExecutionDetail, ExecutionLogOut,
    ReactFlowNode, ReactFlowEdge, ReactFlowPosition
)
from .auth import get_password_hash, verify_password, create_access_token, get_current_user
from .ws_manager import manager
from .executor import execute_workflow
from .scheduler import init_scheduler, shutdown_scheduler, schedule_workflow_job, remove_workflow_job

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AutoFlow API", version="1.0.0")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup and shutdown lifecycles
@app.on_event("startup")
def on_startup():
    init_scheduler()

@app.on_event("shutdown")
def on_shutdown():
    shutdown_scheduler()


# --- AUTHENTICATION API ---

@app.post("/api/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado."
        )
    
    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(email=user_data.email, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email, "user_id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


# --- WORKFLOW API ---

def db_workflow_to_schema(wf: Workflow) -> WorkflowOut:
    nodes = [
        ReactFlowNode(
            id=node.node_id,
            type=node.type,
            data=node.data,
            position=ReactFlowPosition(x=node.position_x, y=node.position_y)
        ) for node in wf.nodes
    ]
    edges = [
        ReactFlowEdge(
            id=f"e{edge.source_node_id}-{edge.target_node_id}",
            source=edge.source_node_id,
            target=edge.target_node_id,
            sourceHandle=edge.source_handle,
            targetHandle=edge.target_handle
        ) for edge in wf.edges
    ]
    return WorkflowOut(
        id=wf.id,
        name=wf.name,
        description=wf.description,
        user_id=wf.user_id,
        is_active=wf.is_active,
        trigger_type=wf.trigger_type,
        cron_expression=wf.cron_expression,
        created_at=wf.created_at,
        updated_at=wf.updated_at,
        nodes=nodes,
        edges=edges
    )

@app.get("/api/workflows", response_model=List[WorkflowOut])
def list_workflows(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workflows = db.query(Workflow).filter(Workflow.user_id == current_user.id).order_by(Workflow.id.desc()).all()
    return [db_workflow_to_schema(wf) for wf in workflows]

@app.post("/api/workflows", response_model=WorkflowOut)
def create_workflow(wf_data: WorkflowCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Create workflow base
    new_wf = Workflow(
        name=wf_data.name,
        description=wf_data.description,
        user_id=current_user.id,
        is_active=wf_data.is_active,
        trigger_type=wf_data.trigger_type,
        cron_expression=wf_data.cron_expression
    )
    db.add(new_wf)
    db.commit()
    db.refresh(new_wf)

    # Create nodes
    for node in wf_data.nodes:
        db_node = WorkflowNode(
            workflow_id=new_wf.id,
            node_id=node.id,
            type=node.type,
            data=node.data,
            position_x=node.position.x,
            position_y=node.position.y
        )
        db.add(db_node)

    # Create edges
    for edge in wf_data.edges:
        db_edge = WorkflowEdge(
            workflow_id=new_wf.id,
            source_node_id=edge.source,
            target_node_id=edge.target,
            source_handle=edge.sourceHandle,
            target_handle=edge.targetHandle
        )
        db.add(db_edge)

    db.commit()
    db.refresh(new_wf)

    # Schedule if active and cron
    if new_wf.is_active and new_wf.trigger_type == "cron" and new_wf.cron_expression:
        schedule_workflow_job(new_wf.id, new_wf.cron_expression)

    return db_workflow_to_schema(new_wf)

@app.get("/api/workflows/{wf_id}", response_model=WorkflowOut)
def get_workflow(wf_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.user_id == current_user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow não encontrado.")
    return db_workflow_to_schema(wf)

@app.put("/api/workflows/{wf_id}", response_model=WorkflowOut)
def update_workflow(wf_id: int, wf_data: WorkflowUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.user_id == current_user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow não encontrado.")

    # Update base fields
    if wf_data.name is not None:
        wf.name = wf_data.name
    if wf_data.description is not None:
        wf.description = wf_data.description
    if wf_data.is_active is not None:
        wf.is_active = wf_data.is_active
    if wf_data.trigger_type is not None:
        wf.trigger_type = wf_data.trigger_type
    if wf_data.cron_expression is not None:
        wf.cron_expression = wf_data.cron_expression

    # Update nodes if provided
    if wf_data.nodes is not None:
        # Delete existing nodes
        db.query(WorkflowNode).filter(WorkflowNode.workflow_id == wf_id).delete()
        # Add new nodes
        for node in wf_data.nodes:
            db_node = WorkflowNode(
                workflow_id=wf_id,
                node_id=node.id,
                type=node.type,
                data=node.data,
                position_x=node.position.x,
                position_y=node.position.y
            )
            db.add(db_node)

    # Update edges if provided
    if wf_data.edges is not None:
        # Delete existing edges
        db.query(WorkflowEdge).filter(WorkflowEdge.workflow_id == wf_id).delete()
        # Add new edges
        for edge in wf_data.edges:
            db_edge = WorkflowEdge(
                workflow_id=wf_id,
                source_node_id=edge.source,
                target_node_id=edge.target,
                source_handle=edge.sourceHandle,
                target_handle=edge.targetHandle
            )
            db.add(db_edge)

    db.commit()
    db.refresh(wf)

    # Update scheduler
    if wf.is_active and wf.trigger_type == "cron" and wf.cron_expression:
        schedule_workflow_job(wf.id, wf.cron_expression)
    else:
        remove_workflow_job(wf.id)

    return db_workflow_to_schema(wf)

@app.delete("/api/workflows/{wf_id}")
def delete_workflow(wf_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.user_id == current_user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow não encontrado.")

    db.delete(wf)
    db.commit()

    # Remove scheduled job
    remove_workflow_job(wf_id)
    return {"message": "Workflow deletado com sucesso."}


# --- EXECUTION & RUN API ---

@app.post("/api/workflows/{wf_id}/run", response_model=WorkflowExecutionOut)
async def run_workflow_manually(wf_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.user_id == current_user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow não encontrado.")

    # Create execution record
    execution = WorkflowExecution(
        workflow_id=wf_id,
        status="running",
        trigger_source="manual"
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    # Run execution engine in background task
    asyncio.create_task(execute_workflow(wf_id, execution.id))

    return execution

@app.get("/api/workflows/{wf_id}/executions", response_model=List[WorkflowExecutionOut])
def list_workflow_executions(wf_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.user_id == current_user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow não encontrado.")

    executions = db.query(WorkflowExecution).filter(
        WorkflowExecution.workflow_id == wf_id
    ).order_by(WorkflowExecution.id.desc()).all()
    return executions

@app.get("/api/executions/{exec_id}", response_model=WorkflowExecutionDetail)
def get_execution_details(exec_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify execution exists and user owns the workflow
    execution = db.query(WorkflowExecution).join(Workflow).filter(
        WorkflowExecution.id == exec_id,
        Workflow.user_id == current_user.id
    ).first()
    
    if not execution:
        raise HTTPException(status_code=404, detail="Execução não encontrada.")

    return execution


# --- WEBOCkET REAL-TIME LOGS ---

@app.websocket("/ws/{workflow_id}")
async def websocket_logs(websocket: WebSocket, workflow_id: str):
    # Register connection to this workflow channel
    await manager.connect(workflow_id, websocket)
    try:
        while True:
            # We keep the connection open by receiving messages
            data = await websocket.receive_text()
            # Simple ping-pong or echo if needed
            await websocket.send_json({"type": "pong", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(workflow_id, websocket)
    except Exception:
        manager.disconnect(workflow_id, websocket)

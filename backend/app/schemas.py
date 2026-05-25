from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Token & Authentication ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None


# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- React Flow Node Mapping ---
class ReactFlowPosition(BaseModel):
    x: float
    y: float

class ReactFlowNode(BaseModel):
    id: str  # maps to node_id
    type: str
    data: Dict[str, Any]
    position: ReactFlowPosition

class ReactFlowEdge(BaseModel):
    id: Optional[str] = None
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


# --- Workflow Schemas ---
class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: Optional[bool] = True
    trigger_type: Optional[str] = "manual"  # "manual", "cron"
    cron_expression: Optional[str] = None

class WorkflowCreate(WorkflowBase):
    nodes: List[ReactFlowNode] = []
    edges: List[ReactFlowEdge] = []

class WorkflowUpdate(WorkflowBase):
    name: Optional[str] = None
    nodes: Optional[List[ReactFlowNode]] = None
    edges: Optional[List[ReactFlowEdge]] = None

class WorkflowOut(WorkflowBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    nodes: List[ReactFlowNode] = []
    edges: List[ReactFlowEdge] = []

    class Config:
        from_attributes = True


# --- Execution and Log Schemas ---
class ExecutionLogOut(BaseModel):
    id: int
    execution_id: int
    node_id: Optional[str] = None
    log_level: str
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True

class WorkflowExecutionOut(BaseModel):
    id: int
    workflow_id: int
    status: str
    trigger_source: str
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class WorkflowExecutionDetail(WorkflowExecutionOut):
    logs: List[ExecutionLogOut] = []

    class Config:
        from_attributes = True

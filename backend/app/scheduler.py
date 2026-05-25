import asyncio
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.jobstores.base import JobLookupError
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import Workflow, WorkflowExecution
from .executor import execute_workflow

# Initialize BackgroundScheduler
scheduler = BackgroundScheduler()

def run_scheduled_workflow(workflow_id: int):
    # APScheduler runs this in a background thread
    db = SessionLocal()
    try:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow or not workflow.is_active:
            # If workflow was deactivated or deleted, skip
            return

        # Create new execution record
        execution = WorkflowExecution(
            workflow_id=workflow_id,
            status="running",
            trigger_source="scheduled"
        )
        db.add(execution)
        db.commit()
        db.refresh(execution)

        # Run the workflow executor in a new event loop for this thread
        asyncio.run(execute_workflow(workflow_id, execution.id))
    except Exception as e:
        print(f"Error running scheduled workflow {workflow_id}: {e}")
    finally:
        db.close()

def schedule_workflow_job(workflow_id: int, cron_expression: str):
    """
    Schedules or reschedules a workflow execution job.
    """
    job_id = f"workflow_{workflow_id}"
    
    # Remove existing job if it exists
    try:
        scheduler.remove_job(job_id)
    except JobLookupError:
        pass
        
    if not cron_expression:
        return

    try:
        # Standard 5-field cron parsing (min hour day_of_month month day_of_week)
        trigger = CronTrigger.from_crontab(cron_expression)
        
        scheduler.add_job(
            run_scheduled_workflow,
            trigger=trigger,
            args=[workflow_id],
            id=job_id,
            replace_existing=True
        )
        print(f"Workflow {workflow_id} scheduled with expression: {cron_expression}")
    except Exception as e:
        print(f"Failed to schedule workflow {workflow_id} with cron '{cron_expression}': {e}")

def remove_workflow_job(workflow_id: int):
    job_id = f"workflow_{workflow_id}"
    try:
        scheduler.remove_job(job_id)
        print(f"Workflow {workflow_id} removed from scheduler.")
    except JobLookupError:
        pass

def init_scheduler():
    """
    Starts the scheduler and registers all active cron workflows.
    """
    if not scheduler.running:
        scheduler.start()
        print("APScheduler started.")
        
    db = SessionLocal()
    try:
        active_cron_workflows = db.query(Workflow).filter(
            Workflow.is_active == True,
            Workflow.trigger_type == "cron",
            Workflow.cron_expression != None,
            Workflow.cron_expression != ""
        ).all()
        
        for workflow in active_cron_workflows:
            schedule_workflow_job(workflow.id, workflow.cron_expression)
    except Exception as e:
        print(f"Error loading active workflows into scheduler: {e}")
    finally:
        db.close()

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("APScheduler shut down.")

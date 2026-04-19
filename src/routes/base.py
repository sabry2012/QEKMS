from fastapi import APIRouter
from fastapi.responses import FileResponse
import os

baseRouter = APIRouter()

@baseRouter.get("/", include_in_schema=False)
async def read_root():
    """Serve the premium QEKMS landing page."""
    # Corrected path to the built-in static frontend
    index_path = os.path.join(os.getcwd(), "src", "assets", "static", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Welcome to QEKMS (Landing Page missing)"}

@baseRouter.get("/health")
async def health_check():
    """Simple health check for production monitoring."""
    return {"status": "healthy", "service": "QEKMS"}
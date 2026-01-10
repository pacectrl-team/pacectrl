from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.config import settings

router = APIRouter(tags=["widget-assets"])

_PROJECT_ROOT = Path(__file__).resolve().parents[4]
_WIDGET_BUNDLE = _PROJECT_ROOT / "widget" / "dist" / "widget.js"


@router.get("/widget.js")
def serve_widget_bundle():
    """Serve the embeddable widget bundle with cache headers."""
    if not _WIDGET_BUNDLE.exists():
        raise HTTPException(status_code=404, detail="Widget bundle not found")

    headers = {"Cache-Control": f"public, max-age={settings.widget_cache_seconds}"}
    return FileResponse(
        _WIDGET_BUNDLE,
        media_type="application/javascript",
        filename="widget.js",
        headers=headers,
    )

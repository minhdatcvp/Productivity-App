from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.ai import router as ai_router
from app.routers.auth import router as auth_router
from app.routers.catalog import router as catalog_router
from app.routers.goals import router as goals_router
from app.routers.learn_ai import router as learn_ai_router
from app.routers.learn_v2 import router as learn_router
from app.routers.notifications import router as notifications_router
from app.routers.streaks import router as streaks_router
from app.routers.tasks import router as tasks_router
from app.routers.templates import router as templates_router

app = FastAPI(title="Productivity API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(goals_router)
app.include_router(tasks_router)
app.include_router(streaks_router)
app.include_router(ai_router)
app.include_router(notifications_router)
app.include_router(catalog_router)
app.include_router(templates_router)
app.include_router(learn_router)
app.include_router(learn_ai_router)


@app.get("/health")
async def health():
    return {"status": "ok"}

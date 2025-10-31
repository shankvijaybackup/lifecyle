from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.check_eol import router as check_eol_router

app = FastAPI(title="Lifecycle EoL API", version="0.1.0")

# CORS - adjust origins for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(check_eol_router, prefix="/api")

@app.get("/")
def root():
    return {"ok": True, "service": "Lifecycle EoL API"}

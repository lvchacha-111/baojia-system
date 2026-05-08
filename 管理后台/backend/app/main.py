from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent))

from app.models.request import CalculateRequest
from app.services.calculator import FreightCalculator
from app.api.admin import router as admin_router

app = FastAPI(title="运费计算系统")

app.include_router(admin_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件目录
static_path = Path(__file__).parent.parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

calculator = FreightCalculator()


@app.get("/")
def read_root():
    return {"message": "运费计算系统 API", "endpoints": {
        "业务员端": "/calculator",
        "管理员端": "/admin",
        "API文档": "/docs"
    }}


@app.get("/calculator")
def calculator_page():
    """业务员计算器页面"""
    return RedirectResponse(url="/static/index.html")


@app.get("/admin")
def admin_page():
    """管理员后台页面"""
    return RedirectResponse(url="/static/admin.html")


@app.post("/api/calculate")
def calculate_freight(request: CalculateRequest):
    try:
        results = calculator.calculate(
            destination=request.destination,
            length=request.length,
            width=request.width,
            height=request.height,
            weight=request.weight
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/countries")
def get_countries():
    try:
        countries = calculator.get_countries()
        return countries
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Header
from fastapi.responses import FileResponse
import json
from pathlib import Path
from typing import Dict, Any, Optional
import shutil
import hashlib

router = APIRouter(prefix="/api/admin", tags=["admin"])

DATA_PATH = Path("backend/data/prices.json")
ADMIN_PASSWORD_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"  # 默认密码: admin


def verify_admin_token(authorization: Optional[str] = Header(None)):
    """验证管理员权限"""
    if not authorization:
        raise HTTPException(status_code=401, detail="未授权访问")

    try:
        token = authorization.replace("Bearer ", "")
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        if token_hash != ADMIN_PASSWORD_HASH:
            raise HTTPException(status_code=401, detail="密码错误")
    except:
        raise HTTPException(status_code=401, detail="未授权访问")


@router.post("/login")
def admin_login(credentials: Dict[str, str]):
    """管理员登录"""
    password = credentials.get("password", "")
    password_hash = hashlib.sha256(password.encode()).hexdigest()

    if password_hash == ADMIN_PASSWORD_HASH:
        return {"token": password, "message": "登录成功"}
    else:
        raise HTTPException(status_code=401, detail="密码错误")


def load_data() -> dict:
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_data(data: dict):
    with open(DATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@router.get("/parameters", dependencies=[Depends(verify_admin_token)])
def get_parameters():
    data = load_data()
    return data


@router.put("/parameters", dependencies=[Depends(verify_admin_token)])
def update_parameters(params: Dict[str, float]):
    data = load_data()
    data["carriers"]["DHL"]["parameters"].update(params)
    save_data(data)
    return {"message": "参数更新成功"}


@router.post("/upload-excel", dependencies=[Depends(verify_admin_token)])
async def upload_excel(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="只支持 Excel 文件")

    upload_path = Path("backend/data/uploads") / file.filename
    upload_path.parent.mkdir(parents=True, exist_ok=True)

    with open(upload_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    from app.services.excel_parser import parse_excel_to_json
    parse_excel_to_json(str(upload_path), str(DATA_PATH))

    return {"message": "Excel 文件导入成功"}


@router.get("/export-excel", dependencies=[Depends(verify_admin_token)])
def export_excel():
    from openpyxl import Workbook

    data = load_data()
    dhl_data = data["carriers"]["DHL"]

    wb = Workbook()
    ws = wb.active
    ws.title = "DHL价格表"

    ws.append(["重量(kg)", "1区", "2区", "3区", "4区", "5区", "6区", "7区", "8区", "9区"])

    price_table = dhl_data["price_table"]
    for weight in sorted([float(k) for k in price_table.keys()]):
        row = [weight]
        for i in range(1, 10):
            row.append(price_table[str(weight)].get(f"zone{i}", 0))
        ws.append(row)

    ws2 = wb.create_sheet("国家分区")
    ws2.append(["国家", "分区", "旺季附加费"])

    for country, info in sorted(dhl_data["country_zones"].items()):
        ws2.append([country, info["zone"], info["peak_surcharge"]])

    export_path = Path("backend/data/dhl_export.xlsx")
    wb.save(export_path)

    return FileResponse(export_path, filename="dhl_prices.xlsx")


@router.get("/price-table/{carrier}", dependencies=[Depends(verify_admin_token)])
def get_price_table(carrier: str):
    data = load_data()
    if carrier not in data["carriers"]:
        raise HTTPException(status_code=404, detail="快递公司不存在")
    return data["carriers"][carrier]


@router.put("/price-table/{carrier}", dependencies=[Depends(verify_admin_token)])
def update_price_table(carrier: str, update_data: Dict[str, Any]):
    data = load_data()
    if carrier not in data["carriers"]:
        raise HTTPException(status_code=404, detail="快递公司不存在")

    data["carriers"][carrier]["price_table"] = update_data["price_table"]
    save_data(data)
    return {"message": "价格表更新成功"}


@router.get("/countries", dependencies=[Depends(verify_admin_token)])
def get_countries():
    data = load_data()
    return data["carriers"]["DHL"]


@router.post("/countries", dependencies=[Depends(verify_admin_token)])
def add_country(country_data: Dict[str, Any]):
    data = load_data()
    country = country_data["country"]
    data["carriers"]["DHL"]["country_zones"][country] = {
        "zone": country_data["zone"],
        "peak_surcharge": country_data["peak_surcharge"]
    }
    save_data(data)
    return {"message": "国家添加成功"}


@router.delete("/countries/{country}", dependencies=[Depends(verify_admin_token)])
def delete_country(country: str):
    data = load_data()
    if country in data["carriers"]["DHL"]["country_zones"]:
        del data["carriers"]["DHL"]["country_zones"][country]
        save_data(data)
        return {"message": "国家删除成功"}
    raise HTTPException(status_code=404, detail="国家不存在")

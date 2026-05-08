from pydantic import BaseModel
from typing import Optional


class CalculateRequest(BaseModel):
    destination: str
    length: float
    width: float
    height: float
    weight: Optional[float] = None

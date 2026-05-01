from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.services.bill_parser import ALLOWED_TYPES, parse_bill

router = APIRouter(tags=["bill"])


class BillParseResponse(BaseModel):
    monthly_kwh: float
    estimated: bool


@router.post("/bill/upload", response_model=BillParseResponse)
async def upload_bill(file: UploadFile = File(...)) -> BillParseResponse:
    if not file.content_type:
        raise HTTPException(
            415,
            f"Content type missing. Accepted: {', '.join(sorted(ALLOWED_TYPES))}",
        )
    result = parse_bill(await file.read(), file.content_type)
    return BillParseResponse(monthly_kwh=result.monthly_kwh, estimated=result.estimated)

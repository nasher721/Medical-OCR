from __future__ import annotations

import os
from datetime import datetime
from typing import Any, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI(title="Medical OCR Annotation Service")


class UploadPayload(BaseModel):
    org_id: str
    filename: str
    storage_path: str
    mime_type: str = "application/pdf"
    doc_type: str = "medical"


class AnnotationPayload(BaseModel):
    document_id: str
    page_number: int
    field_key: str
    value: str
    bbox: dict
    status: str = "accepted"


class FeedbackPayload(BaseModel):
    document_id: str
    annotation_id: Optional[str] = None
    action: str
    previous_value: Optional[str] = None
    corrected_value: Optional[str] = None


class StructuredOutputPayload(BaseModel):
    document_id: str
    payload: dict


@app.post("/document/upload")
def upload_document(payload: UploadPayload) -> dict[str, Any]:
    response = (
        supabase.table("documents")
        .insert(
            {
                "org_id": payload.org_id,
                "filename": payload.filename,
                "storage_path": payload.storage_path,
                "mime_type": payload.mime_type,
                "doc_type": payload.doc_type,
                "status": "uploaded",
            }
        )
        .execute()
    )
    if response.error:
        raise HTTPException(status_code=500, detail=response.error.message)
    return {"document": response.data[0]}


@app.post("/annotation/save")
def save_annotation(payload: AnnotationPayload) -> dict[str, Any]:
    response = (
        supabase.table("annotations")
        .insert(
            {
                "document_id": payload.document_id,
                "page_number": payload.page_number,
                "field_key": payload.field_key,
                "value": payload.value,
                "bbox": payload.bbox,
                "status": payload.status,
            }
        )
        .execute()
    )
    if response.error:
        raise HTTPException(status_code=500, detail=response.error.message)
    return {"annotation": response.data[0]}


@app.get("/suggestions/{document_id}")
def get_suggestions(document_id: str) -> dict[str, Any]:
    tokens_response = supabase.table("ocr_tokens").select("*").eq("document_id", document_id).execute()
    if tokens_response.error:
        raise HTTPException(status_code=500, detail=tokens_response.error.message)
    tokens = tokens_response.data or []

    doc_response = supabase.table("documents").select("org_id").eq("id", document_id).single().execute()
    if doc_response.error:
        raise HTTPException(status_code=500, detail=doc_response.error.message)
    org_id = doc_response.data["org_id"]

    schema_response = supabase.table("field_schema").select("*").eq("org_id", org_id).execute()
    if schema_response.error:
        raise HTTPException(status_code=500, detail=schema_response.error.message)
    schema = schema_response.data or []

    suggestions: List[dict[str, Any]] = []
    for field in schema:
        hints = [field["key"]] + field.get("synonyms", [])
        for index, token in enumerate(tokens):
            if not any(hint.lower() in token["text"].lower() for hint in hints):
                continue
            value_tokens = tokens[index + 1 : index + 4]
            if not value_tokens:
                continue
            min_x = min(t["bbox"]["x"] for t in value_tokens + [token])
            min_y = min(t["bbox"]["y"] for t in value_tokens + [token])
            max_x = max(t["bbox"]["x"] + t["bbox"]["w"] for t in value_tokens + [token])
            max_y = max(t["bbox"]["y"] + t["bbox"]["h"] for t in value_tokens + [token])
            suggestions.append(
                {
                    "id": f"{field['key']}-{token['id']}",
                    "field_key": field["key"],
                    "value": " ".join([t["text"] for t in value_tokens]).strip(),
                    "confidence": 0.72,
                    "page_number": token["page_number"],
                    "bbox": {
                        "x": min_x,
                        "y": min_y,
                        "w": max_x - min_x,
                        "h": max_y - min_y,
                    },
                    "source": "pattern",
                }
            )
    return {"suggestions": suggestions}


@app.post("/feedback")
def record_feedback(payload: FeedbackPayload) -> dict[str, Any]:
    response = (
        supabase.table("model_feedback")
        .insert(
            {
                "document_id": payload.document_id,
                "annotation_id": payload.annotation_id,
                "action": payload.action,
                "previous_value": payload.previous_value,
                "corrected_value": payload.corrected_value,
            }
        )
        .execute()
    )
    if response.error:
        raise HTTPException(status_code=500, detail=response.error.message)
    return {"feedback": response.data[0]}


@app.get("/structured-output/{document_id}")
def structured_output(document_id: str) -> dict[str, Any]:
    response = supabase.table("structured_results").select("*").eq("document_id", document_id).execute()
    if response.error:
        raise HTTPException(status_code=500, detail=response.error.message)
    if response.data:
        return {"structured": response.data[0]["payload"]}
    return {"structured": {}}


@app.post("/structured-output")
def upsert_structured_output(payload: StructuredOutputPayload) -> dict[str, Any]:
    response = (
        supabase.table("structured_results")
        .upsert(
            {
                "document_id": payload.document_id,
                "payload": payload.payload,
                "updated_at": datetime.utcnow().isoformat(),
            }
        )
        .execute()
    )
    if response.error:
        raise HTTPException(status_code=500, detail=response.error.message)
    return {"structured": response.data[0]["payload"]}


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok"}

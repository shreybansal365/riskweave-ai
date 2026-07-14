from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    """Strict base model shared by the public business API."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)


class PaginationMeta(ApiModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
    total_items: int = Field(ge=0)
    total_pages: int = Field(ge=0)

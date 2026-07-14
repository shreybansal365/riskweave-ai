from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.api.dependencies import CurrentUser, DatabaseSession
from app.schemas.context import AccountContextResponse, CustomerContextResponse
from app.services.customer_context import ContextNotFoundError, CustomerContextService

router = APIRouter(prefix="/api", tags=["customer context"])


@router.get("/customers/{customer_id}", response_model=CustomerContextResponse)
def customer_context(
    customer_id: UUID,
    _: CurrentUser,
    session: DatabaseSession,
) -> CustomerContextResponse:
    try:
        return CustomerContextService().customer(session, customer_id)
    except ContextNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Customer not found") from exc


@router.get("/accounts/{account_id}", response_model=AccountContextResponse)
def account_context(
    account_id: UUID,
    _: CurrentUser,
    session: DatabaseSession,
) -> AccountContextResponse:
    try:
        return CustomerContextService().account(session, account_id)
    except ContextNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Account not found") from exc

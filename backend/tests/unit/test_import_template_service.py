import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services import import_template as svc


@pytest.mark.asyncio
async def test_create_template():
    session = AsyncMock()
    session.add = MagicMock()
    session.flush = AsyncMock()

    household_id = uuid.uuid4()
    from app.schemas.import_template import ImportTemplateCreate
    data = ImportTemplateCreate(
        name="CIB CSV",
        format="csv",
        columns={"date": "Date", "debit": "Withdrawal"},
        date_format="DD/MM/YYYY",
        encoding="utf-8",
        skip_rows=0,
    )
    template = await svc.create_template(session, household_id, data)
    session.add.assert_called_once()
    session.flush.assert_called_once()
    assert template.name == "CIB CSV"

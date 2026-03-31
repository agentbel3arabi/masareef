"""Import template CRUD service."""
import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.import_template import AccountImportTemplate, ImportTemplate
from app.schemas.import_template import ImportTemplateCreate, ImportTemplateUpdate


async def list_templates(
    session: AsyncSession, household_id: uuid.UUID
) -> list[ImportTemplate]:
    result = await session.execute(
        select(ImportTemplate)
        .where(ImportTemplate.household_id == household_id)
        .order_by(ImportTemplate.id)
    )
    return list(result.scalars().all())


async def get_template(
    session: AsyncSession, household_id: uuid.UUID, template_id: int
) -> ImportTemplate | None:
    result = await session.execute(
        select(ImportTemplate).where(
            ImportTemplate.id == template_id,
            ImportTemplate.household_id == household_id,
        )
    )
    return result.scalar_one_or_none()


async def create_template(
    session: AsyncSession, household_id: uuid.UUID, data: ImportTemplateCreate
) -> ImportTemplate:
    template = ImportTemplate(
        household_id=household_id,
        name=data.name,
        name_ar=data.name_ar,
        format=data.format,
        columns=data.columns,
        date_format=data.date_format,
        encoding=data.encoding,
        skip_rows=data.skip_rows,
        sheet_name=data.sheet_name,
        notes=data.notes,
    )
    session.add(template)
    await session.flush()

    if data.link_to_account_id:
        await link_template(session, template.id, data.link_to_account_id)

    return template


async def update_template(
    session: AsyncSession, template: ImportTemplate, data: ImportTemplateUpdate
) -> ImportTemplate:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(template, field, value)
    await session.flush()
    return template


async def delete_template(session: AsyncSession, template: ImportTemplate) -> None:
    # Remove all account links first
    await session.execute(
        delete(AccountImportTemplate).where(
            AccountImportTemplate.template_id == template.id
        )
    )
    await session.delete(template)
    await session.flush()


async def link_template(
    session: AsyncSession, template_id: int, account_id: int
) -> AccountImportTemplate:
    # Upsert: delete existing link for this account, then create new one
    await session.execute(
        delete(AccountImportTemplate).where(
            AccountImportTemplate.account_id == account_id
        )
    )
    link = AccountImportTemplate(account_id=account_id, template_id=template_id)
    session.add(link)
    await session.flush()
    return link


async def unlink_template(
    session: AsyncSession, template_id: int, account_id: int
) -> None:
    await session.execute(
        delete(AccountImportTemplate).where(
            AccountImportTemplate.account_id == account_id,
            AccountImportTemplate.template_id == template_id,
        )
    )
    await session.flush()


async def get_linked_template(
    session: AsyncSession, account_id: int
) -> ImportTemplate | None:
    """Return the default import template linked to an account, or None."""
    result = await session.execute(
        select(ImportTemplate)
        .join(
            AccountImportTemplate,
            AccountImportTemplate.template_id == ImportTemplate.id,
        )
        .where(AccountImportTemplate.account_id == account_id)
    )
    return result.scalar_one_or_none()


async def get_linked_account_ids(
    session: AsyncSession, template_id: int
) -> list[int]:
    result = await session.execute(
        select(AccountImportTemplate.account_id).where(
            AccountImportTemplate.template_id == template_id
        )
    )
    return list(result.scalars().all())

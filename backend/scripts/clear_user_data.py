"""Clear all user-entered data while preserving seed/system data.

Removes: accounts, transactions, splits, debts, payments, persons,
installment plans, import templates, reconciliation records, and
custom categories/institutions. Keeps: predefined categories,
system categories, predefined financial institutions, exchange rates,
households, and memberships.

Usage:
    cd backend
    uv run python -m scripts.clear_user_data
    uv run python -m scripts.clear_user_data --dry-run
    uv run python -m scripts.clear_user_data --household-id <uuid>
"""

import argparse
import asyncio
from uuid import UUID

from sqlalchemy import text

from app.database import async_session_factory, engine


def _build_steps(household_id: str | None) -> list[tuple[str, str, str]]:
    """Build (name, count_sql, delete_sql) tuples, scoped to household if given."""
    hid = " WHERE household_id = :hid" if household_id else ""
    hid_and = " AND household_id = :hid" if household_id else ""

    # Subqueries for tables without household_id
    debt_sub = (
        f"(SELECT id FROM debts WHERE household_id = :hid)"
        if household_id
        else "(SELECT id FROM debts)"
    )
    txn_sub = (
        f"(SELECT id FROM transactions WHERE household_id = :hid)"
        if household_id
        else "(SELECT id FROM transactions)"
    )
    acct_sub = (
        f"(SELECT id FROM accounts WHERE household_id = :hid)"
        if household_id
        else "(SELECT id FROM accounts)"
    )

    return [
        (
            "reconciliation_records",
            f"SELECT COUNT(*) FROM reconciliation_records{hid}",
            f"DELETE FROM reconciliation_records{hid}",
        ),
        (
            "account_import_templates",
            f"SELECT COUNT(*) FROM account_import_templates "
            f"WHERE account_id IN {acct_sub}",
            f"DELETE FROM account_import_templates "
            f"WHERE account_id IN {acct_sub}",
        ),
        (
            "import_templates",
            f"SELECT COUNT(*) FROM import_templates{hid}",
            f"DELETE FROM import_templates{hid}",
        ),
        (
            "p2p_debt_splits",
            f"SELECT COUNT(*) FROM p2p_debt_splits WHERE debt_id IN {debt_sub}",
            f"DELETE FROM p2p_debt_splits WHERE debt_id IN {debt_sub}",
        ),
        (
            "debt_payments",
            f"SELECT COUNT(*) FROM debt_payments WHERE debt_id IN {debt_sub}",
            f"DELETE FROM debt_payments WHERE debt_id IN {debt_sub}",
        ),
        (
            "transaction_splits",
            f"SELECT COUNT(*) FROM transaction_splits WHERE transaction_id IN {txn_sub}",
            f"DELETE FROM transaction_splits WHERE transaction_id IN {txn_sub}",
        ),
        (
            "transactions",
            f"SELECT COUNT(*) FROM transactions{hid}",
            f"DELETE FROM transactions{hid}",
        ),
        (
            "installment_plans",
            f"SELECT COUNT(*) FROM installment_plans{hid}",
            f"DELETE FROM installment_plans{hid}",
        ),
        (
            "debts",
            f"SELECT COUNT(*) FROM debts{hid}",
            f"DELETE FROM debts{hid}",
        ),
        (
            "persons",
            f"SELECT COUNT(*) FROM persons{hid}",
            f"DELETE FROM persons{hid}",
        ),
        (
            "accounts",
            f"SELECT COUNT(*) FROM accounts{hid}",
            f"DELETE FROM accounts{hid}",
        ),
        (
            "categories (custom)",
            f"SELECT COUNT(*) FROM categories WHERE is_predefined = FALSE AND is_system = FALSE{hid_and}",
            f"DELETE FROM categories WHERE is_predefined = FALSE AND is_system = FALSE{hid_and}",
        ),
        (
            "financial_institutions (custom)",
            f"SELECT COUNT(*) FROM financial_institutions WHERE is_predefined = FALSE{hid_and}",
            f"DELETE FROM financial_institutions WHERE is_predefined = FALSE{hid_and}",
        ),
    ]


async def clear_data(household_id: str | None, dry_run: bool) -> None:
    scope = f"household {household_id}" if household_id else "all households"
    params: dict = {"hid": household_id} if household_id else {}
    steps = _build_steps(household_id)

    print(f"Clearing user data for: {scope}")
    if dry_run:
        print("(DRY RUN - no changes will be made)\n")

    async with async_session_factory() as session:
        async with session.begin():
            total = 0
            for table_name, count_sql, delete_sql in steps:
                result = await session.execute(text(count_sql), params)
                count = result.scalar()
                total += count
                if count > 0:
                    action = "would delete" if dry_run else "deleted"
                    print(f"  {table_name}: {action} {count} row(s)")
                    if not dry_run:
                        await session.execute(text(delete_sql), params)

            print(f"\nTotal: {'would affect' if dry_run else 'affected'} {total} row(s)")
            if dry_run:
                print("\n--- DRY RUN: no changes made ---")
            else:
                print("\nDone. Seed data preserved.")

    await engine.dispose()


def main():
    parser = argparse.ArgumentParser(
        description="Clear user-entered data, keeping seed/system data intact"
    )
    parser.add_argument(
        "--household-id",
        type=str,
        default=None,
        help="Only clear data for this household (UUID). Omit to clear all.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without making changes",
    )
    args = parser.parse_args()

    if args.household_id:
        try:
            UUID(args.household_id)
        except ValueError:
            print(f"Invalid UUID: {args.household_id}")
            return

    asyncio.run(clear_data(args.household_id, args.dry_run))


if __name__ == "__main__":
    main()

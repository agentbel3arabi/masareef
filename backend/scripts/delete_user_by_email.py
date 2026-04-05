"""Delete ALL data for a user identified by email address.

Removes the user's household (if sole member) or just their membership,
plus all household-scoped data. Does NOT touch seed/predefined data.

Usage:
    cd backend
    uv run python -m scripts.delete_user_by_email user@example.com
    uv run python -m scripts.delete_user_by_email user@example.com --dry-run
"""

import argparse
import asyncio

from sqlalchemy import text

from app.database import async_session_factory, engine


# Delete order: children before parents, respecting FK constraints.
# Tuples of (table_name, count_sql, delete_sql) with :hid parameter.
DELETE_STEPS: list[tuple[str, str, str]] = [
    (
        "reconciliation_records",
        "SELECT COUNT(*) FROM reconciliation_records WHERE household_id = :hid",
        "DELETE FROM reconciliation_records WHERE household_id = :hid",
    ),
    (
        "account_import_templates",
        "SELECT COUNT(*) FROM account_import_templates ait "
        "JOIN accounts a ON a.id = ait.account_id WHERE a.household_id = :hid",
        "DELETE FROM account_import_templates "
        "WHERE account_id IN (SELECT id FROM accounts WHERE household_id = :hid)",
    ),
    (
        "import_templates",
        "SELECT COUNT(*) FROM import_templates WHERE household_id = :hid",
        "DELETE FROM import_templates WHERE household_id = :hid",
    ),
    (
        "p2p_debt_splits",
        "SELECT COUNT(*) FROM p2p_debt_splits "
        "WHERE debt_id IN (SELECT id FROM debts WHERE household_id = :hid)",
        "DELETE FROM p2p_debt_splits "
        "WHERE debt_id IN (SELECT id FROM debts WHERE household_id = :hid)",
    ),
    (
        "debt_payments",
        "SELECT COUNT(*) FROM debt_payments "
        "WHERE debt_id IN (SELECT id FROM debts WHERE household_id = :hid)",
        "DELETE FROM debt_payments "
        "WHERE debt_id IN (SELECT id FROM debts WHERE household_id = :hid)",
    ),
    (
        "transaction_splits",
        "SELECT COUNT(*) FROM transaction_splits "
        "WHERE transaction_id IN (SELECT id FROM transactions WHERE household_id = :hid)",
        "DELETE FROM transaction_splits "
        "WHERE transaction_id IN (SELECT id FROM transactions WHERE household_id = :hid)",
    ),
    (
        "transactions",
        "SELECT COUNT(*) FROM transactions WHERE household_id = :hid",
        "DELETE FROM transactions WHERE household_id = :hid",
    ),
    (
        "installment_plans",
        "SELECT COUNT(*) FROM installment_plans WHERE household_id = :hid",
        "DELETE FROM installment_plans WHERE household_id = :hid",
    ),
    (
        "debts",
        "SELECT COUNT(*) FROM debts WHERE household_id = :hid",
        "DELETE FROM debts WHERE household_id = :hid",
    ),
    (
        "persons",
        "SELECT COUNT(*) FROM persons WHERE household_id = :hid",
        "DELETE FROM persons WHERE household_id = :hid",
    ),
    (
        "accounts",
        "SELECT COUNT(*) FROM accounts WHERE household_id = :hid",
        "DELETE FROM accounts WHERE household_id = :hid",
    ),
    (
        "categories (custom)",
        "SELECT COUNT(*) FROM categories "
        "WHERE household_id = :hid AND is_predefined = FALSE AND is_system = FALSE",
        "DELETE FROM categories "
        "WHERE household_id = :hid AND is_predefined = FALSE AND is_system = FALSE",
    ),
    (
        "financial_institutions (custom)",
        "SELECT COUNT(*) FROM financial_institutions "
        "WHERE household_id = :hid AND is_predefined = FALSE",
        "DELETE FROM financial_institutions "
        "WHERE household_id = :hid AND is_predefined = FALSE",
    ),
]


async def find_user_by_email(session, email: str) -> dict | None:
    result = await session.execute(
        text("SELECT id, email FROM auth.users WHERE email = :email"),
        {"email": email},
    )
    row = result.first()
    if row:
        return {"id": row.id, "email": row.email}
    return None


async def get_household_ids(session, user_id) -> list:
    result = await session.execute(
        text("SELECT household_id FROM household_members WHERE user_id = :uid"),
        {"uid": str(user_id)},
    )
    return [row.household_id for row in result.fetchall()]


async def count_household_members(session, household_id) -> int:
    result = await session.execute(
        text("SELECT COUNT(*) FROM household_members WHERE household_id = :hid"),
        {"hid": str(household_id)},
    )
    return result.scalar()


async def delete_user(email: str, dry_run: bool) -> None:
    async with async_session_factory() as session:
        async with session.begin():
            user = await find_user_by_email(session, email)
            if not user:
                print(f"No user found with email: {email}")
                return

            user_id = user["id"]
            print(f"Found user: {user['email']} (id: {user_id})")

            household_ids = await get_household_ids(session, user_id)
            if not household_ids:
                print("User has no household memberships.")
                return

            print(f"User belongs to {len(household_ids)} household(s)")

            for hid in household_ids:
                member_count = await count_household_members(session, hid)
                print(f"\nHousehold {hid} ({member_count} member(s)):")

                params = {"hid": str(hid)}
                for table_name, count_sql, delete_sql in DELETE_STEPS:
                    result = await session.execute(text(count_sql), params)
                    count = result.scalar()
                    if count > 0:
                        action = "would delete" if dry_run else "deleted"
                        print(f"  {table_name}: {action} {count} row(s)")
                        if not dry_run:
                            await session.execute(text(delete_sql), params)

                if not dry_run:
                    await session.execute(
                        text(
                            "DELETE FROM household_members "
                            "WHERE household_id = :hid AND user_id = :uid"
                        ),
                        {"hid": str(hid), "uid": str(user_id)},
                    )
                    print("  Removed user from household")

                    if member_count == 1:
                        await session.execute(
                            text("DELETE FROM households WHERE id = :hid"),
                            {"hid": str(hid)},
                        )
                        print("  Deleted empty household")
                else:
                    if member_count == 1:
                        print("  Would remove user and delete household (sole member)")
                    else:
                        print(
                            f"  Would remove user from household "
                            f"({member_count - 1} other member(s) remain)"
                        )

            if dry_run:
                print("\n--- DRY RUN: no changes made ---")
            else:
                print("\nDone. All user data deleted.")

    await engine.dispose()


def main():
    parser = argparse.ArgumentParser(
        description="Delete all data for a user by email address"
    )
    parser.add_argument("email", help="Email address of the user to delete")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without making changes",
    )
    args = parser.parse_args()
    asyncio.run(delete_user(args.email, args.dry_run))


if __name__ == "__main__":
    main()

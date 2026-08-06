"""Fija que ninguna colección con datos de usuario se quede fuera de las rutas
del RGPD, y que la migración de esquema del diario recupere el importe original.

Estas dos familias de bug tienen la misma causa: **listas escritas a mano**.

- G-15: `trading_plans` guardaba `user_id` pero no estaba en la lista de
  `delete_account`, ni en la purga por retención, ni en el export. Borrar la
  cuenta dejaba los planes en la base de datos.
- BUG-039: dos esquemas conviviendo en `db.trades` porque nada obligaba a que
  hubiera uno solo.

Lo que fija este fichero no es "que la lista de hoy sea correcta" —eso se
arregla una vez y se vuelve a romper— sino **que las listas deriven unas de
otras**, que es lo que impide olvidarse de la siguiente colección.
"""
import os

import pytest

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server  # noqa: E402
from performance import (  # noqa: E402
    LEGACY_TRADE_KEYS,
    compute_trade_pnl,
    is_legacy_trade,
    normalize_trade_schema,
)


class TestGdprListsDeriveFromOneSource:
    def test_everything_purged_is_also_deleted(self):
        """Lo que la purga por impago borra tiene que irse también con la cuenta."""
        assert set(server._USER_DATA_COLLECTIONS) <= set(server._ALL_USER_COLLECTIONS)

    def test_everything_deleted_is_exportable_except_security_artefacts(self):
        """RGPD art. 20: lo que se borra se puede llevar. La única excepción son
        los tokens y revocaciones — mandárselos al usuario sería una regresión
        de seguridad, no portabilidad."""
        deleted = set(server._ALL_USER_COLLECTIONS)
        exportable = set(server._EXPORTABLE_COLLECTIONS)
        allowed_gap = (
            set(server._SECURITY_ARTEFACT_COLLECTIONS)
            | set(server._BILLING_COLLECTIONS)          # se exporta resumido, como `payments`
            | set(server._INTERNAL_DUPLICATE_COLLECTIONS)  # ya viaja bajo `trades`
        )
        missing = deleted - exportable - allowed_gap
        assert not missing, f"se borran pero no se pueden exportar: {sorted(missing)}"

    def test_the_backup_is_deleted_and_purged_even_though_it_is_not_exported(self):
        """No exportarlo no lo exime de borrarse: contiene operaciones reales."""
        for c in server._INTERNAL_DUPLICATE_COLLECTIONS:
            assert c in server._USER_DATA_COLLECTIONS, f"{c} no se purga"
            assert c in server._ALL_USER_COLLECTIONS, f"{c} no se borra"
            assert c not in server._EXPORTABLE_COLLECTIONS

    def test_trading_plans_is_in_all_three_routes(self):
        """G-15 explícito: es el que se quedó fuera de las tres."""
        assert "trading_plans" in server._USER_DATA_COLLECTIONS
        assert "trading_plans" in server._ALL_USER_COLLECTIONS
        assert "trading_plans" in server._EXPORTABLE_COLLECTIONS

    @pytest.mark.parametrize("collection", sorted(set(
        server._USER_DATA_COLLECTIONS
        + server._USER_NON_PURGED_COLLECTIONS
        + server._SECURITY_ARTEFACT_COLLECTIONS
    )))
    def test_every_declared_collection_has_a_table(self, collection):
        """El shim NO autocrea tablas: una colección declarada en las rutas del
        RGPD pero ausente de `known` falla en la primera consulta — justo cuando
        alguien borra su cuenta."""
        src = open(server.__file__, encoding="utf-8").read()
        known_block = src.split("known = [", 1)[1].split("]", 1)[0]
        assert f'"{collection}"' in known_block, (
            f"`{collection}` está en las rutas del RGPD pero no en `known`"
        )

    def test_billing_is_not_purged_on_lapse(self):
        """Quien deja de pagar conserva su histórico de facturación: la purga
        borra datos de trading, no la contabilidad."""
        assert not (set(server._BILLING_COLLECTIONS) & set(server._USER_DATA_COLLECTIONS))

    def test_referrals_survive_the_lapse_purge(self):
        """Los referidos son créditos ya ganados, no datos de trading."""
        assert "referrals" not in server._USER_DATA_COLLECTIONS
        assert "referrals" in server._ALL_USER_COLLECTIONS


def _legacy_trade(**over):
    """Documento tal y como lo guardaba el diario legado (camelCase)."""
    base = {
        "id": "t1", "user_id": "u1", "symbol": "AAPL", "direction": "long",
        "entryPrice": 100.0, "exitPrice": 110.0, "quantity": 1.0,
        "leverage": 1.0, "status": "closed", "pnl": 10.0, "roe": 10.0,
        "created_at": "2026-01-05T10:00:00+00:00",
    }
    base.update(over)
    return base


class TestLegacySchemaRecovery:
    def test_the_original_bug_is_fixed(self):
        """El P&L guardado por /journal se leía como 0.0 desde analítica."""
        t = _legacy_trade()
        assert compute_trade_pnl(t)["pnl"] == t["pnl"] == 10.0

    @pytest.mark.parametrize("leverage,expected", [(1.0, 10.0), (5.0, 50.0), (10.0, 100.0)])
    def test_leverage_maps_to_multiplier_exactly(self, leverage, expected):
        """`leverage` y `multiplier` ocupan el mismo lugar en la fórmula, así que
        la traducción reproduce el importe EXACTO, no una aproximación."""
        t = _legacy_trade(leverage=leverage, pnl=expected)
        assert compute_trade_pnl(t)["pnl"] == expected

    def test_short_direction_recovers_too(self):
        t = _legacy_trade(direction="short", entryPrice=110.0, exitPrice=100.0)
        out = compute_trade_pnl(t)
        assert out["side"] == "short"
        assert out["pnl"] == 10.0

    def test_normalisation_is_idempotent(self):
        once = normalize_trade_schema(_legacy_trade())
        assert normalize_trade_schema(once) == once

    def test_canonical_documents_pass_through_untouched(self):
        canonical = {"id": "x", "side": "long", "entry_price": 10.0,
                     "exit_price": 12.0, "quantity": 1.0, "multiplier": 1.0}
        assert normalize_trade_schema(canonical) is canonical

    def test_legacy_keys_are_dropped(self):
        """Dejarlas es lo que mantiene vivos dos esquemas en una colección."""
        out = normalize_trade_schema(_legacy_trade())
        assert not (set(out) & set(LEGACY_TRADE_KEYS))

    def test_canonical_wins_when_both_schemas_are_present(self):
        """Un documento a medio migrar no debe retroceder al valor viejo."""
        mixed = _legacy_trade(entry_price=999.0)
        assert normalize_trade_schema(mixed)["entry_price"] == 999.0

    def test_entry_date_is_filled_from_created_at(self):
        """Sin `entry_date` el documento se hunde al fondo de todo orden
        cronológico, que es el defecto que acabamos de arreglar."""
        out = normalize_trade_schema(_legacy_trade())
        assert out["entry_date"] == "2026-01-05T10:00:00+00:00"

    def test_open_legacy_trade_has_no_pnl_invented(self):
        t = _legacy_trade(exitPrice=None, status="open", pnl=None)
        out = compute_trade_pnl(t)
        assert out["pnl"] == 0.0
        assert out["r_multiple"] is None

    def test_detection_does_not_fire_on_canonical(self):
        assert is_legacy_trade(_legacy_trade())
        assert not is_legacy_trade({"entry_price": 1.0, "side": "long"})


class TestMigrationScript:
    """El script vive en `migrate_trades_schema.py`; aquí se fija su criterio de
    clasificación, que es lo que decide qué se toca y qué se deja quieto."""

    def test_classifies_canonical_as_skip(self):
        from migrate_trades_schema import classify
        assert classify({"entry_price": 1.0, "side": "long"}) == "skip"

    def test_classifies_recoverable_legacy_as_ok(self):
        from migrate_trades_schema import classify
        assert classify(_legacy_trade()) == "ok"

    def test_flags_for_review_when_the_amount_does_not_match(self):
        """Si el importe recalculado no cuadra con el guardado, el documento NO
        se toca: migrarlo escribiría una cifra que el usuario nunca vio."""
        from migrate_trades_schema import classify
        assert classify(_legacy_trade(pnl=999.0)) == "review"

    def test_rounding_of_a_cent_is_not_suspicious(self):
        from migrate_trades_schema import classify
        assert classify(_legacy_trade(pnl=10.01)) == "ok"

#!/usr/bin/env python3
"""Añade las claves del diario multiproducto a los diez idiomas.

Se ejecuta UNA vez y se queda en el repo como registro de qué se añadió y con
qué texto en cada idioma; `i18n-check.js` es quien vigila a partir de ahí.

Regla del proyecto que se respeta aquí: **los términos del sector no se
traducen**. CFD, forex, spot, funding, swap, pip, tick, lote, R:B, delta y
volatilidad implícita se dicen igual en las diez versiones porque es como los
dice quien opera; traducir "funding" por "financiación" en alemán o en japonés
no ayuda a nadie a reconocer el cargo en su extracto.
"""
from __future__ import annotations

import io
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
I18N = os.path.join(ROOT, "frontend", "src", "lib", "i18n")
LANGS = ["es", "en", "de", "fr", "ru", "zh", "ja", "ar", "pt", "it"]

# clave → [es, en, de, fr, ru, zh, ja, ar, pt, it]
KEYS: dict[str, list[str]] = {
    # ── Productos ────────────────────────────────────────────────
    "prodStock": ["Acciones", "Stocks", "Aktien", "Actions", "Акции", "股票", "株式", "الأسهم", "Ações", "Azioni"],
    "prodCfd": ["CFD", "CFD", "CFD", "CFD", "CFD", "差价合约", "CFD", "CFD", "CFD", "CFD"],
    "prodFutures": ["Futuros", "Futures", "Futures", "Futures", "Фьючерсы", "期货", "先物", "العقود الآجلة", "Futuros", "Futures"],
    "prodForex": ["Forex", "Forex", "Forex", "Forex", "Форекс", "外汇", "FX", "الفوركس", "Forex", "Forex"],
    "prodCryptoSpot": ["Cripto spot", "Crypto spot", "Krypto Spot", "Crypto spot", "Крипто спот", "现货加密", "現物クリプト", "كريبتو فوري", "Cripto spot", "Cripto spot"],
    "prodCryptoPerp": ["Cripto perpetuo", "Crypto perp", "Krypto Perp", "Crypto perp", "Крипто перп", "永续合约", "無期限クリプト", "كريبتو دائم", "Cripto perpétuo", "Cripto perpetuo"],
    "prodOption": ["Opciones", "Options", "Optionen", "Options", "Опционы", "期权", "オプション", "الخيارات", "Opções", "Opzioni"],
    "prodSpot": ["Spot", "Spot", "Spot", "Spot", "Спот", "现货", "スポット", "فوري", "Spot", "Spot"],

    # ── Unidad de tamaño ─────────────────────────────────────────
    "sizingShares": ["Acciones", "Shares", "Aktien", "Actions", "Акции", "股数", "株数", "عدد الأسهم", "Ações", "Azioni"],
    "sizingCoins": ["Monedas", "Coins", "Coins", "Unités", "Монеты", "币数", "コイン数", "العملات", "Moedas", "Monete"],
    "sizingContracts": ["Contratos", "Contracts", "Kontrakte", "Contrats", "Контракты", "合约数", "枚数", "العقود", "Contratos", "Contratti"],
    "sizingLots": ["Lotes", "Lots", "Lots", "Lots", "Лоты", "手数", "ロット", "اللوتات", "Lotes", "Lotti"],
    "sizingUnits": ["Unidades", "Units", "Einheiten", "Unités", "Единицы", "单位", "数量", "الوحدات", "Unidades", "Unità"],
    "lot_standard": ["Lote estándar", "Standard lot", "Standardlot", "Lot standard", "Стандартный лот", "标准手", "標準ロット", "لوت قياسي", "Lote padrão", "Lotto standard"],
    "lot_mini": ["Mini lote", "Mini lot", "Minilot", "Mini lot", "Мини-лот", "迷你手", "ミニロット", "لوت مصغر", "Mini lote", "Mini lotto"],
    "lot_micro": ["Micro lote", "Micro lot", "Mikrolot", "Micro lot", "Микро-лот", "微型手", "マイクロロット", "لوت ميكرو", "Micro lote", "Micro lotto"],
    "lot_nano": ["Nano lote", "Nano lot", "Nanolot", "Nano lot", "Нано-лот", "纳米手", "ナノロット", "لوت نانو", "Nano lote", "Nano lotto"],
    "lot_units": ["Unidades", "Units", "Einheiten", "Unités", "Единицы", "单位", "数量", "الوحدات", "Unidades", "Unità"],

    # ── Unidades de medida del stop y del objetivo ───────────────
    "unitPrice": ["Precio", "Price", "Preis", "Prix", "Цена", "价格", "価格", "السعر", "Preço", "Prezzo"],
    "unitPips": ["Pips", "Pips", "Pips", "Pips", "Пипсы", "点 (pips)", "pips", "نقاط", "Pips", "Pips"],
    "unitTicks": ["Ticks", "Ticks", "Ticks", "Ticks", "Тики", "跳动点", "ティック", "تيك", "Ticks", "Tick"],
    "unitPoints": ["Puntos", "Points", "Punkte", "Points", "Пункты", "点数", "ポイント", "نقاط", "Pontos", "Punti"],
    "unitPct": ["% del precio", "% of price", "% des Preises", "% du prix", "% от цены", "价格百分比", "価格の%", "% من السعر", "% do preço", "% del prezzo"],
    "unitMoney": ["Importe fijo", "Fixed amount", "Fester Betrag", "Montant fixe", "Фикс. сумма", "固定金额", "固定額", "مبلغ ثابت", "Valor fixo", "Importo fisso"],
    "unitPctBalance": ["% de la cuenta", "% of account", "% des Kontos", "% du compte", "% от счёта", "账户百分比", "口座の%", "% من الحساب", "% da conta", "% del conto"],
    "unitR": ["Múltiplos de R", "R multiples", "R-Vielfache", "Multiples de R", "Кратные R", "R 倍数", "Rの倍数", "مضاعفات R", "Múltiplos de R", "Multipli di R"],
    "tfUnit": ["Unidad", "Unit", "Einheit", "Unité", "Единица", "单位", "単位", "الوحدة", "Unidade", "Unità"],
    "tfLevelUnresolved": [
        "Faltan datos para convertirlo a precio",
        "Not enough data to turn this into a price",
        "Zu wenig Daten für einen Preis",
        "Données insuffisantes pour obtenir un prix",
        "Недостаточно данных, чтобы перевести в цену",
        "数据不足，无法换算成价格",
        "価格に換算するデータが足りません",
        "لا توجد بيانات كافية للتحويل إلى سعر",
        "Faltam dados para converter em preço",
        "Dati insufficienti per convertirlo in prezzo",
    ],

    # ── Bloques del formulario ───────────────────────────────────
    "tfProduct": ["Producto", "Product", "Produkt", "Produit", "Продукт", "产品", "商品", "المنتج", "Produto", "Prodotto"],
    "tfProductHint": [
        "decide el tamaño de contrato, el apalancamiento y los costes",
        "sets contract size, leverage and costs",
        "bestimmt Kontraktgröße, Hebel und Kosten",
        "définit la taille de contrat, le levier et les coûts",
        "определяет размер контракта, плечо и издержки",
        "决定合约规模、杠杆与成本",
        "契約サイズ・レバレッジ・コストを決める",
        "يحدد حجم العقد والرافعة والتكاليف",
        "define o tamanho de contrato, a alavancagem e os custos",
        "definisce dimensione del contratto, leva e costi",
    ],
    "tfPositionBlock": ["La posición", "The position", "Die Position", "La position", "Позиция", "持仓", "ポジション", "المركز", "A posição", "La posizione"],
    "tfPositionBlockHint": [
        "activo, entrada, tamaño, apalancamiento y saldo",
        "asset, entry, size, leverage and balance",
        "Asset, Einstieg, Größe, Hebel und Kontostand",
        "actif, entrée, taille, levier et solde",
        "актив, вход, размер, плечо и баланс",
        "标的、入场、规模、杠杆与余额",
        "銘柄・エントリー・数量・レバレッジ・残高",
        "الأصل، الدخول، الحجم، الرافعة والرصيد",
        "ativo, entrada, tamanho, alavancagem e saldo",
        "asset, ingresso, dimensione, leva e saldo",
    ],
    "tfLiveBlock": ["Lo que tienes delante", "What you're facing", "Was vor dir liegt", "Ce que tu as en face", "Что перед тобой", "你面对的规模", "いま抱える規模", "ما أمامك", "O que tens à frente", "Quello che hai davanti"],
    "tfLiveBlockHint": [
        "se recalcula mientras escribes",
        "recalculated as you type",
        "wird beim Tippen neu berechnet",
        "recalculé pendant la saisie",
        "пересчитывается по мере ввода",
        "输入时实时重算",
        "入力しながら再計算",
        "يُعاد حسابه أثناء الكتابة",
        "recalcula-se enquanto escreves",
        "si ricalcola mentre scrivi",
    ],
    "tfLevelsBlock": ["Stop, objetivo y estado", "Stop, target and status", "Stop, Ziel und Status", "Stop, objectif et statut", "Стоп, цель и статус", "止损、目标与状态", "ストップ・目標・状態", "الوقف والهدف والحالة", "Stop, objetivo e estado", "Stop, obiettivo e stato"],
    "tfLevelsBlockHint": [
        "en la unidad que tú uses",
        "in whatever unit you use",
        "in deiner Einheit",
        "dans ton unité",
        "в твоих единицах",
        "用你习惯的单位",
        "自分の単位で",
        "بالوحدة التي تستخدمها",
        "na unidade que usares",
        "nell'unità che usi",
    ],
    "tfContextBlock": ["Setup, emoción y notas", "Setup, emotion and notes", "Setup, Emotion und Notizen", "Setup, émotion et notes", "Сетап, эмоция и заметки", "策略、情绪与笔记", "セットアップ・感情・メモ", "الإعداد والحالة والملاحظات", "Setup, emoção e notas", "Setup, emozione e note"],
    "tfContextBlockHint": [
        "por qué entraste — es lo que después se puede medir",
        "why you entered — this is what can be measured later",
        "warum du eingestiegen bist — das lässt sich später messen",
        "pourquoi tu es entré — c'est ce qui se mesure ensuite",
        "почему ты вошёл — именно это потом измеряется",
        "你为什么进场——这是之后能衡量的",
        "なぜ入ったか — 後で測れるのはここ",
        "لماذا دخلت — هذا ما يمكن قياسه لاحقًا",
        "porque entraste — é o que depois se pode medir",
        "perché sei entrato — è ciò che poi si può misurare",
    ],
    "tfExcursionBlock": ["Excursión (MAE / MFE)", "Excursion (MAE / MFE)", "Excursion (MAE / MFE)", "Excursion (MAE / MFE)", "Экскурсия (MAE / MFE)", "极值行程 (MAE / MFE)", "エクスカーション (MAE / MFE)", "الانحراف (MAE / MFE)", "Excursão (MAE / MFE)", "Escursione (MAE / MFE)"],
    "tfExcursionBlockHint": [
        "hasta dónde fue en tu contra y a favor: calibra el stop y el objetivo",
        "how far it went against and for you: calibrates stop and target",
        "wie weit es gegen und für dich lief: kalibriert Stop und Ziel",
        "jusqu'où c'est allé contre et pour toi : calibre stop et objectif",
        "как далеко ушло против и в твою пользу: калибрует стоп и цель",
        "逆行与顺行的极值：校准止损与目标",
        "逆行と順行の最大幅：ストップと目標の較正",
        "إلى أي مدى تحرك ضدك ومعك: يعاير الوقف والهدف",
        "até onde foi contra e a favor: calibra o stop e o objetivo",
        "fin dove è andato contro e a favore: calibra stop e obiettivo",
    ],

    # ── Tamaño de contrato y apalancamiento ──────────────────────
    "tfContractSize": ["Tamaño de contrato", "Contract size", "Kontraktgröße", "Taille de contrat", "Размер контракта", "合约规模", "契約サイズ", "حجم العقد", "Tamanho do contrato", "Dimensione contratto"],
    "tfContractSizeHint": [
        "del catálogo; se puede cambiar",
        "from the catalogue; editable",
        "aus dem Katalog; änderbar",
        "issu du catalogue ; modifiable",
        "из каталога; можно изменить",
        "取自目录，可修改",
        "カタログから。変更可",
        "من الكتالوج؛ قابل للتعديل",
        "do catálogo; pode mudar-se",
        "dal catalogo; modificabile",
    ],
    "tfContractSizeMissing": [
        "Este símbolo no está en el catálogo: escríbelo tú",
        "This symbol isn't in the catalogue: type it in",
        "Dieses Symbol fehlt im Katalog: bitte eintragen",
        "Ce symbole n'est pas au catalogue : saisis-le",
        "Этого символа нет в каталоге: впиши сам",
        "该代码不在目录中：请自行填写",
        "この銘柄はカタログにありません。入力してください",
        "هذا الرمز ليس في الكتالوج: أدخله بنفسك",
        "Este símbolo não está no catálogo: escreve-o tu",
        "Questo simbolo non è a catalogo: scrivilo tu",
    ],
    "tfContractSizeUnknown": ["desconocido", "unknown", "unbekannt", "inconnu", "неизвестно", "未知", "不明", "غير معروف", "desconhecido", "sconosciuto"],
    "tfLeverage": ["Apalancamiento", "Leverage", "Hebel", "Levier", "Плечо", "杠杆", "レバレッジ", "الرافعة المالية", "Alavancagem", "Leva"],
    "tfLeverageHint": [
        "no multiplica el P&L: multiplica el margen",
        "doesn't multiply P&L: it multiplies margin",
        "multipliziert nicht den P&L, sondern die Margin",
        "ne multiplie pas le P&L : il multiplie la marge",
        "не умножает P&L — умножает маржу",
        "不放大盈亏，放大的是保证金",
        "損益ではなく証拠金を倍にする",
        "لا تضاعف الأرباح بل الهامش",
        "não multiplica o P&L: multiplica a margem",
        "non moltiplica il P&L: moltiplica il margine",
    ],
    "tfLeverageTypical": [
        "típico hasta {max}× · no multiplica el P&L",
        "typically up to {max}× · doesn't multiply P&L",
        "üblich bis {max}× · multipliziert nicht den P&L",
        "typiquement jusqu'à {max}× · ne multiplie pas le P&L",
        "обычно до {max}× · не умножает P&L",
        "常见上限 {max}× · 不放大盈亏",
        "通常 {max}× まで · 損益は倍にならない",
        "عادةً حتى {max}× · لا تضاعف الأرباح",
        "típico até {max}× · não multiplica o P&L",
        "tipico fino a {max}× · non moltiplica il P&L",
    ],
    "tfLeverageNA": [
        "Sin apalancamiento en este producto",
        "No leverage on this product",
        "Bei diesem Produkt kein Hebel",
        "Pas de levier sur ce produit",
        "У этого продукта нет плеча",
        "该产品无杠杆",
        "この商品にレバレッジはありません",
        "لا رافعة في هذا المنتج",
        "Sem alavancagem neste produto",
        "Nessuna leva su questo prodotto",
    ],
    "tfBalanceHint": [
        "el saldo con el que operaste",
        "the balance you traded with",
        "der Kontostand beim Trade",
        "le solde avec lequel tu as tradé",
        "баланс, с которым ты торговал",
        "交易时的账户余额",
        "取引時の残高",
        "الرصيد الذي تداولت به",
        "o saldo com que operaste",
        "il saldo con cui hai operato",
    ],
}


def _load(path: str) -> str:
    with io.open(path, encoding="utf-8") as fh:
        return fh.read()


def apply(extra: dict[str, list[str]]) -> None:
    """Inserta las claves antes del `}` final de cada diccionario."""
    for idx, lang in enumerate(LANGS):
        path = os.path.join(I18N, f"{lang}.js")
        src = _load(path)
        present = set(re.findall(r'^\s*"([A-Za-z0-9_]+)":', src, re.M))
        lines = []
        for key, values in extra.items():
            if key in present:
                continue
            value = values[idx].replace("\\", "\\\\").replace('"', '\\"')
            lines.append(f'  "{key}": "{value}",')
        if not lines:
            print(f"  {lang}: sin cambios")
            continue
        marker = src.rstrip()
        assert marker.endswith("}"), f"{lang}.js no termina en }}"
        body = marker[:-1].rstrip()
        if not body.endswith(","):
            body += ","
        with io.open(path, "w", encoding="utf-8") as fh:
            fh.write(body + "\n" + "\n".join(lines) + "\n}\n")
        print(f"  {lang}: +{len(lines)} claves")


if __name__ == "__main__":
    from i18n_multiproduct_part2 import KEYS as KEYS2  # noqa: E402

    print("i18n multiproducto — añadiendo claves")
    apply({**KEYS, **KEYS2})

"""Alcance de la analítica: sobre qué producto está calculada y cuándo mezcla cuentas.

Orden de los idiomas: es, en, de, fr, ru, zh, ja, ar, pt, it.
"""
from __future__ import annotations

KEYS: dict[str, list[str]] = {
    "analyticsScope": [
        "Calculado sobre", "Computed over", "Berechnet über", "Calculé sur",
        "Рассчитано по", "统计范围", "集計対象", "محسوب على",
        "Calculado sobre", "Calcolato su",
    ],
    "analyticsScopeAll": [
        "Todo", "Everything", "Alles", "Tout", "Всё", "全部", "すべて", "الكل",
        "Tudo", "Tutto",
    ],
    "analyticsMixedAccounts": [
        "Parece que estas operaciones vienen de más de una cuenta.",
        "These trades look like they come from more than one account.",
        "Diese Trades scheinen aus mehr als einem Konto zu stammen.",
        "Ces opérations semblent venir de plus d'un compte.",
        "Похоже, эти сделки из нескольких счетов.",
        "这些交易看起来来自不止一个账户。",
        "これらの取引は複数の口座にまたがっているようです。",
        "يبدو أن هذه الصفقات تأتي من أكثر من حساب.",
        "Parece que estas operações vêm de mais de uma conta.",
        "Sembra che queste operazioni vengano da più di un conto.",
    ],
    "analyticsMixedAccountsFix": [
        "La curva, el drawdown y el % de rentabilidad se construyen sobre una sola cuenta, así que ahora mismo están sumando saldos distintos. El R, el acierto y el desglose por producto sí son válidos. Filtra por producto arriba para ver una curva que signifique algo.",
        "The equity curve, the drawdown and the % return are built on a single account, so right now they are adding up different balances. R, win rate and the per-product breakdown are still valid. Filter by product above to get a curve that means something.",
        "Equity-Kurve, Drawdown und Prozentrendite basieren auf einem einzigen Konto und addieren gerade verschiedene Salden. R, Trefferquote und die Aufschlüsselung je Produkt bleiben gültig. Filtere oben nach Produkt für eine aussagekräftige Kurve.",
        "La courbe, le drawdown et le % de rentabilité se construisent sur un seul compte : ils additionnent donc des soldes différents. Le R, le taux de réussite et la ventilation par produit restent valables. Filtre par produit ci-dessus pour une courbe qui veut dire quelque chose.",
        "Кривая, просадка и доходность в % строятся по одному счёту, а сейчас складывают разные балансы. R, процент побед и разбивка по продуктам остаются верными. Отфильтруй по продукту выше, чтобы получить осмысленную кривую.",
        "资金曲线、回撤和收益率都基于单一账户，现在它们把不同的余额加在了一起。R、胜率和按产品的拆分仍然有效。请在上方按产品筛选，才能得到有意义的曲线。",
        "資産曲線・ドローダウン・％リターンは単一口座を前提としており、いまは異なる残高を合算しています。R、勝率、商品別の内訳は有効です。上で商品を絞ると意味のある曲線になります。",
        "منحنى رأس المال والتراجع ونسبة العائد تُبنى على حساب واحد، وهي الآن تجمع أرصدة مختلفة. أما R ونسبة النجاح والتفصيل حسب المنتج فتبقى صحيحة. صفِّ حسب المنتج بالأعلى للحصول على منحنى ذي معنى.",
        "A curva, o drawdown e a % de rentabilidade constroem-se sobre uma só conta, por isso estão a somar saldos diferentes. O R, a taxa de acerto e o detalhe por produto continuam válidos. Filtra por produto acima para veres uma curva que signifique algo.",
        "La curva, il drawdown e la % di rendimento si costruiscono su un solo conto, quindi ora stanno sommando saldi diversi. R, percentuale di successo e dettaglio per prodotto restano validi. Filtra per prodotto sopra per una curva che significhi qualcosa.",
    ],
}

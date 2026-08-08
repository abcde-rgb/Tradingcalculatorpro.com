"""Claves del escáner: de cuándo es el precio y cuándo se leyó.

`structPriceNow` («Precio ahora») prometía una cotización en vivo. Lo que hay es
el cierre de la última vela escaneada, que en diario puede tener días. Se separa
en dos etiquetas —según la vela esté cerrada o formándose— y se añade la
antigüedad de la lectura, que es lo que distingue «al día» de «congelado».

Orden de los idiomas: es, en, de, fr, ru, zh, ja, ar, pt, it.
"""
from __future__ import annotations

KEYS: dict[str, list[str]] = {
    "structPriceLastClose": [
        "Último cierre", "Last close", "Letzter Schluss", "Dernière clôture",
        "Последнее закрытие", "最新收盘", "直近の終値", "آخر إغلاق",
        "Último fecho", "Ultima chiusura",
    ],
    "structPriceForming": [
        "Vela en curso", "Bar forming", "Laufende Kerze", "Bougie en cours",
        "Текущая свеча", "当前K线", "形成中の足", "شمعة قيد التكوّن",
        "Vela em curso", "Candela in corso",
    ],
    "structScannedJustNow": [
        "leído hace menos de un minuto", "read less than a minute ago",
        "vor weniger als einer Minute gelesen", "lu il y a moins d'une minute",
        "прочитано меньше минуты назад", "读取于不到一分钟前",
        "1分未満前に取得", "قُرئ قبل أقل من دقيقة",
        "lido há menos de um minuto", "letto meno di un minuto fa",
    ],
    "structScannedAgo": [
        "leído hace {n} min", "read {n} min ago", "vor {n} Min gelesen",
        "lu il y a {n} min", "прочитано {n} мин назад", "读取于 {n} 分钟前",
        "{n}分前に取得", "قُرئ قبل {n} دقيقة",
        "lido há {n} min", "letto {n} min fa",
    ],
}

"""Aviso de backend anterior al catálogo de productos.

Se añade aparte porque no es del diario: es de la **ventana de despliegue**. El
frontend se publica solo al mergear y el backend se sube a mano, así que hay un
rato en el que el navegador va por delante del servidor, y la interfaz tiene que
saber decirlo en vez de ofrecer algo que va a dar 422.

Orden de los idiomas: es, en, de, fr, ru, zh, ja, ar, pt, it.
"""
from __future__ import annotations

KEYS: dict[str, list[str]] = {
    "tfProductsRestricted": [
        "El servidor todavía no conoce los productos nuevos, así que de momento sólo se pueden registrar operaciones de spot y de opciones. Es cosa del despliegue, no de tus datos: en cuanto se actualice el backend aparecen CFD, futuros, forex y cripto sin que tengas que tocar nada.",
        "The server doesn't know the new products yet, so for now only spot and options trades can be logged. That's a deployment matter, not your data: as soon as the backend is updated, CFDs, futures, forex and crypto show up with nothing for you to do.",
        "Der Server kennt die neuen Produkte noch nicht, daher lassen sich vorerst nur Spot- und Optionstrades erfassen. Das ist eine Frage des Deployments, nicht deiner Daten: sobald das Backend aktualisiert ist, erscheinen CFDs, Futures, Forex und Krypto von selbst.",
        "Le serveur ne connaît pas encore les nouveaux produits : pour l'instant, seules les opérations spot et options peuvent être enregistrées. C'est une question de déploiement, pas de tes données : dès que le backend sera à jour, les CFD, futures, forex et crypto apparaîtront tout seuls.",
        "Сервер пока не знает о новых продуктах, поэтому сейчас можно записывать только спот и опционы. Это вопрос деплоя, а не твоих данных: как только бэкенд обновят, CFD, фьючерсы, форекс и крипта появятся сами.",
        "服务器还不认识新产品，所以目前只能记录现货和期权交易。这是部署问题，与你的数据无关：后端更新后，差价合约、期货、外汇和加密会自动出现。",
        "サーバーがまだ新しい商品を認識していないため、現時点ではスポットとオプションの取引のみ記録できます。これはデプロイの問題でデータの問題ではありません。バックエンドが更新されれば、CFD・先物・FX・暗号資産が自動で現れます。",
        "الخادم لا يعرف المنتجات الجديدة بعد، لذا يمكن حاليًا تسجيل صفقات الفوري والخيارات فقط. هذه مسألة نشر وليست مسألة بياناتك: بمجرد تحديث الواجهة الخلفية ستظهر عقود الفروقات والعقود الآجلة والفوركس والكريبتو من تلقاء نفسها.",
        "O servidor ainda não conhece os produtos novos, por isso de momento só se podem registar operações de spot e de opções. É uma questão de deploy, não dos teus dados: assim que o backend for atualizado, aparecem CFD, futuros, forex e cripto sem teres de fazer nada.",
        "Il server non conosce ancora i nuovi prodotti, quindi per ora si possono registrare solo operazioni spot e di opzioni. È una questione di deploy, non dei tuoi dati: appena il backend sarà aggiornato compariranno CFD, futures, forex e cripto da soli.",
    ],
}

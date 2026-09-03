"""Tests del foro de la comunidad (`forum.py`), sin red y sin PostgreSQL.

Dos capas:

1. **Funciones puras** — saneado, seudónimos, R:R y ORDEN. El orden se prueba
   aquí porque el fallo que puede aparecer es silencioso: el shim ordena con
   `ORDER BY (data->>'campo')`, que es orden de TEXTO, y por ahí un hilo con
   9 me gusta va por delante de otro con 10. Un test que sólo comprobara «sale
   una lista» pasaría con el orden mal.

2. **Rutas**, contra una base de datos en memoria (`test_forum_rutas_unit.py`).

Los caracteres de control del test bidi van como escapes (`\\u202e`) y no
literales a propósito: un carácter invisible dentro del fichero de test es
justo lo que nadie ve al revisarlo.
"""
import os
import re

import pytest

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import forum  # noqa: E402
from forum import (  # noqa: E402
    analisis_normalizado,
    clave_de_vista,
    handle_admisible,
    normalizar_etiquetas,
    normalizar_handle,
    normalizar_simbolo,
    ordenar_hilos,
    puntuacion_tendencia,
    sanitizar_texto,
    vista_publica_hilo,
    vista_publica_perfil,
)


# ═══════════════════════════════════════════════════════════════════════════
# 1 · Saneado del texto
# ═══════════════════════════════════════════════════════════════════════════

class TestSaneado:
    def test_quita_etiquetas(self):
        assert "<script>" not in sanitizar_texto("<script>alert(1)</script>hola", 100)

    def test_una_entidad_codificada_no_vuelve_a_ser_etiqueta(self):
        """`&lt;script&gt;` decodificado ES una etiqueta. Si se quitan etiquetas
        ANTES de decodificar, el texto guardado la reconstruye al pintarse."""
        salida = sanitizar_texto("&lt;img src=x onerror=alert(1)&gt;", 200)
        assert "<" not in salida and "onerror" not in salida

    def test_doble_codificacion(self):
        """`&amp;lt;` → `&lt;` → `<`. Una sola pasada de decodificación no basta."""
        salida = sanitizar_texto("&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;", 200)
        assert "<script" not in salida

    def test_quita_controles_invisibles(self):
        """Los controles de dirección bidi permiten enseñar un texto al revés
        de como está guardado: algo que se lee inocente y dice otra cosa.

        Van como escapes y no como caracteres literales a propósito: un
        carácter invisible dentro del fichero de test es justo lo que nadie ve
        al revisarlo — y además rompe el `ast.parse` de pytest si cuela un NUL.
        """
        entrada = "hola\u202emundo\u200b\u0000\ufeff!"
        salida = sanitizar_texto(entrada, 100)
        for invisible in ("\u202e", "\u200b", "\u0000", "\ufeff"):
            assert invisible not in salida
        assert "hola" in salida and "mundo" in salida and salida.endswith("!")

    def test_respeta_el_tope(self):
        assert len(sanitizar_texto("x" * 5000, 160)) == 160

    def test_conserva_el_texto_legitimo(self):
        """Sanear no puede destrozar un mensaje normal con signos."""
        original = "Compré a 1,0842 y el stop en 1,0808 (34 pips). ¿R:R de 2?"
        assert sanitizar_texto(original, 500) == original

    def test_conserva_los_saltos_de_parrafo(self):
        assert sanitizar_texto("uno\n\ndos", 100) == "uno\n\ndos"


# ═══════════════════════════════════════════════════════════════════════════
# 2 · Seudónimos
# ═══════════════════════════════════════════════════════════════════════════

class TestSeudonimo:
    @pytest.mark.parametrize("entrada,esperado", [
        ("  Marta Iglesias ", "marta_iglesias"),
        ("Álvaro-R", "alvaro_r"),
        ("swing__trader", "swing_trader"),
        ("__ana__", "ana"),
    ])
    def test_normaliza(self, entrada, esperado):
        assert normalizar_handle(entrada) == esperado

    @pytest.mark.parametrize("reservado", ["admin", "moderador", "soporte", "tradingcalculatorpro"])
    def test_rechaza_los_reservados(self, reservado):
        """Suplantar a la moderación es el fraude más barato de un foro."""
        ok, motivo = handle_admisible(reservado)
        assert not ok and motivo == "reservado"

    def test_rechaza_los_cortos_y_los_largos(self):
        assert not handle_admisible("ab")[0]
        assert not handle_admisible("a" * 25)[0]

    def test_acepta_uno_normal(self):
        assert handle_admisible("swing_trader")[0]

    def test_un_correo_no_pasa_como_seudonimo(self):
        """El seudónimo existe para NO enseñar el correo. Que uno con arroba
        llegue a `handle_admisible` sólo puede pasar si alguien salta la
        normalización, y por eso la comprobación está en las dos capas."""
        assert not handle_admisible("marta@correo.com")[0]


# ═══════════════════════════════════════════════════════════════════════════
# 3 · El análisis adjunto y el R:R
# ═══════════════════════════════════════════════════════════════════════════

class TestAnalisisAdjunto:
    def test_calcula_el_rr(self):
        a = analisis_normalizado({"symbol": "XAUUSD", "side": "long",
                                  "entry": 2412.30, "stop": 2398.00, "target": 2441.00})
        assert a["rr"] == 2.01
        assert a["rrUndefinedReason"] is None

    def test_sin_stop_el_rr_es_none_y_no_cero(self):
        """Invariante de honestidad del producto: un R indefinido contado como
        0 arrastra la media de la comunidad y falsea la distribución."""
        a = analisis_normalizado({"symbol": "EURUSD", "entry": 1.0842, "target": 1.0910})
        assert a["rr"] is None
        assert a["rr"] != 0
        assert a["rrUndefinedReason"] == "sin_stop"

    def test_niveles_incoherentes_no_producen_un_numero(self):
        """Un largo con el objetivo por debajo de la entrada no tiene R:R; dar
        uno sería publicar una cifra que no significa nada."""
        a = analisis_normalizado({"symbol": "EURUSD", "side": "long",
                                  "entry": 1.0842, "stop": 1.0808, "target": 1.0800})
        assert a["rr"] is None and a["rrUndefinedReason"] == "niveles_incoherentes"

    def test_stop_en_la_entrada(self):
        a = analisis_normalizado({"symbol": "EURUSD", "side": "long",
                                  "entry": 1.0842, "stop": 1.0842, "target": 1.0910})
        assert a["rr"] is None and a["rrUndefinedReason"] == "stop_en_la_entrada"

    def test_el_corto_tambien_calcula(self):
        a = analisis_normalizado({"symbol": "EURUSD", "side": "short",
                                  "entry": 1.0842, "stop": 1.0876, "target": 1.0791})
        assert a["rr"] == 1.5

    def test_sin_simbolo_no_hay_analisis(self):
        assert analisis_normalizado({"entry": 1.0, "stop": 0.9, "target": 1.2}) is None

    def test_el_rr_del_cliente_se_ignora(self):
        """El cliente manda precios; el R:R lo calcula el servidor. Si se
        aceptara el suyo, cualquiera publicaría un 8,0 sobre una operación de 1,4."""
        a = analisis_normalizado({"symbol": "XAUUSD", "side": "long", "rr": 99.0,
                                  "entry": 2412.30, "stop": 2398.00, "target": 2441.00})
        assert a["rr"] == 2.01

    def test_un_producto_inventado_se_descarta(self):
        """El producto sale del catálogo real (`instruments.PRODUCT_IDS`)."""
        a = analisis_normalizado({"symbol": "EURUSD", "product": "chiringuito"})
        assert a["product"] is None


# ═══════════════════════════════════════════════════════════════════════════
# 4 · Orden — el fallo silencioso
# ═══════════════════════════════════════════════════════════════════════════

def _hilo(hid, **kw):
    base = {"id": hid, "author_id": "u1", "created_at": "2026-09-01T10:00:00+00:00",
            "views": 0, "likes": 0, "replies": 0}
    base.update(kw)
    return base


class TestOrden:
    def test_por_likes_es_numerico_y_no_alfabetico(self):
        """9 > 10 como TEXTO. Éste es exactamente el fallo que introduciría
        delegar el orden en el `.sort()` del shim."""
        hilos = [_hilo("a", likes=9), _hilo("b", likes=10), _hilo("c", likes=100)]
        assert [h["id"] for h in ordenar_hilos(hilos, "likes")] == ["c", "b", "a"]

    def test_por_vistas_es_numerico(self):
        hilos = [_hilo("a", views=9), _hilo("b", views=1000), _hilo("c", views=90)]
        assert [h["id"] for h in ordenar_hilos(hilos, "vistas")] == ["b", "c", "a"]

    def test_por_respuestas(self):
        hilos = [_hilo("a", replies=2), _hilo("b", replies=30)]
        assert [h["id"] for h in ordenar_hilos(hilos, "respuestas")] == ["b", "a"]

    def test_nuevo_ordena_por_fecha_descendente(self):
        hilos = [_hilo("viejo", created_at="2026-01-01T00:00:00+00:00"),
                 _hilo("nuevo", created_at="2026-09-02T00:00:00+00:00")]
        assert [h["id"] for h in ordenar_hilos(hilos, "nuevo")] == ["nuevo", "viejo"]

    def test_los_seguidos_van_primero_sin_romper_el_orden_pedido(self):
        """Seguir a alguien sube sus hilos, pero DENTRO del orden elegido: si
        pediste «más likes», entre los seguidos sigue mandando el número."""
        hilos = [
            _hilo("ajeno_top", author_id="ux", likes=500),
            _hilo("seguido_bajo", author_id="us", likes=1),
            _hilo("seguido_alto", author_id="us", likes=50),
        ]
        orden = [h["id"] for h in ordenar_hilos(hilos, "likes", seguidos={"us"})]
        assert orden == ["seguido_alto", "seguido_bajo", "ajeno_top"]

    def test_la_tendencia_decae_con_la_edad(self):
        """Sin decaimiento, el hilo más comentado de la historia ocupa la
        portada para siempre y la comunidad deja de tener novedades."""
        from datetime import datetime, timezone
        viejo = _hilo("v", likes=100, replies=50, created_at="2026-01-01T00:00:00+00:00")
        nuevo = _hilo("n", likes=10, replies=5, created_at="2026-09-03T09:00:00+00:00")
        ref = datetime(2026, 9, 3, 12, 0, tzinfo=timezone.utc)
        assert puntuacion_tendencia(nuevo, ref) > puntuacion_tendencia(viejo, ref)

    def test_un_orden_desconocido_no_revienta(self):
        assert len(ordenar_hilos([_hilo("a")], "loquesea")) == 1

    def test_una_fecha_ilegible_no_tumba_la_lista(self):
        hilos = [_hilo("a", created_at="no-es-una-fecha"), _hilo("b")]
        assert len(ordenar_hilos(hilos, "nuevo")) == 2


# ═══════════════════════════════════════════════════════════════════════════
# 5 · Privacidad: qué NO sale por la API
# ═══════════════════════════════════════════════════════════════════════════

PROHIBIDO = ("author_id", "user_id", "email", "name", "picture", "viewer_key")


class TestPrivacidad:
    def test_la_vista_publica_no_lleva_identidad_real(self):
        hilo = _hilo("h1", title="T", body="B", author_id="u-secreto",
                     email="marta@correo.com", name="Marta Iglesias")
        salida = vista_publica_hilo(hilo, {"handle": "marta_i", "user_id": "u-secreto"})
        plano = repr(salida)
        for campo in PROHIBIDO:
            assert campo not in salida
        assert "u-secreto" not in plano
        assert "marta@correo.com" not in plano
        assert "Marta Iglesias" not in plano
        assert salida["author"]["handle"] == "marta_i"

    def test_el_perfil_publico_tampoco(self):
        p = vista_publica_perfil({"handle": "kenji", "user_id": "u9",
                                  "email": "k@x.com", "followers": 3})
        assert "user_id" not in p and "email" not in p
        assert p["handle"] == "kenji" and p["followers"] == 3

    def test_la_huella_de_vista_no_contiene_la_identidad(self):
        clave = clave_de_vista("ft_1", "a:203.0.113.7", "sal-secreta", dia="2026-09-03")
        assert "203.0.113.7" not in clave
        assert re.fullmatch(r"[0-9a-f]{32}", clave)

    def test_la_huella_cambia_cada_dia(self):
        """Si no cambiara, serviría para seguir a una persona entre jornadas."""
        a = clave_de_vista("ft_1", "a:1.2.3.4", "sal", dia="2026-09-03")
        b = clave_de_vista("ft_1", "a:1.2.3.4", "sal", dia="2026-09-04")
        assert a != b

    def test_la_huella_depende_de_la_sal(self):
        """Sin sal, cualquiera puede recalcular la huella de una IP concreta."""
        a = clave_de_vista("ft_1", "a:1.2.3.4", "sal-A", dia="2026-09-03")
        b = clave_de_vista("ft_1", "a:1.2.3.4", "sal-B", dia="2026-09-03")
        assert a != b


class TestNormalizadores:
    def test_etiquetas(self):
        assert normalizar_etiquetas(["Oro", "  swing  ", "oro"]) == ["oro", "swing"]

    def test_tope_de_etiquetas(self):
        assert len(normalizar_etiquetas([f"e{i}" for i in range(20)])) == forum.MAX_ETIQUETAS

    def test_etiquetas_no_es_una_lista(self):
        assert normalizar_etiquetas("oro") == []

    @pytest.mark.parametrize("entrada,esperado", [
        ("eurusd", "EURUSD"), (" xauusd ", "XAUUSD"), ("ES=F", "ES=F"),
        ("<script>", None), ("", None), ("simbolo con espacios", None),
    ])
    def test_simbolo(self, entrada, esperado):
        assert normalizar_simbolo(entrada) == esperado

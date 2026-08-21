"""GENERADO POR scripts/gen-pine-twin.py — NO EDITAR A MANO.

Traducción mecánica del bloque puro de
`tradingview/tcp_structure_scanner.pine` (Pine Script v6) a Python, para
poder ejecutarlo fuera de TradingView y compararlo con `backend/price_action.py`.

Si esto y el backend discrepan, el que está mal es el indicador.
"""
# flake8: noqa
import math as _math

NA = float("nan")


def _is_na(x):
    return x is None or (isinstance(x, float) and _math.isnan(x))


def _nz(x, repl=0):
    return repl if _is_na(x) else x


def _arr_new(size=None, init=NA):
    return [] if size is None else [init] * int(size)


def _arr_push(a, v):
    a.append(v)


def _arr_get(a, i):
    return a[i]


def _arr_set(a, i, v):
    a[i] = v


def _arr_size(a):
    return len(a)


def _arr_clear(a):
    a.clear()


def _arr_shift(a):
    return a.pop(0)


def _arr_sort(a, orden="asc"):
    a.sort(reverse=(orden == "desc"))


def _arr_sort_indices(a, orden="asc"):
    return sorted(range(len(a)), key=lambda i: a[i], reverse=(orden == "desc"))


def _math_max(*xs):
    return NA if any(_is_na(x) for x in xs) else max(xs)


def _math_min(*xs):
    return NA if any(_is_na(x) for x in xs) else min(xs)


def _math_abs(x):
    return NA if _is_na(x) else abs(x)


def _math_floor(x):
    return NA if _is_na(x) else int(_math.floor(x))


def _math_round(x, precision=None):
    """math.round de Pine: mitad ALEJÁNDOSE del cero.

    Python redondea al par ('banker\'s rounding'), Pine no. La diferencia sólo
    aparece en el empate exacto, pero se emula igual: un gemelo que redondea
    distinto que el original deja de ser un gemelo.
    """
    if _is_na(x):
        return NA
    if precision is None:
        return int(_math.floor(x + 0.5)) if x >= 0 else int(_math.ceil(x - 0.5))
    f = 10.0 ** precision
    y = x * f
    y = _math.floor(y + 0.5) if y >= 0 else _math.ceil(y - 0.5)
    return y / f


def _rango(desde, hasta):
    """`for i = a to b` de Pine: si b < a, el bucle cuenta HACIA ATRÁS."""
    desde, hasta = int(desde), int(hasta)
    return range(desde, hasta + 1) if hasta >= desde else range(desde, hasta - 1, -1)

MAX_ANALYSED_LEVELS = 30
SESSION_GAP_FACTOR = 2.0
DAY_SECONDS = 86400
VOL_WINDOW = 20

class Win:
    __slots__ = ('o', 'h', 'l', 'c', 'v', 't',)
    def __init__(self, o=None, h=None, l=None, c=None, v=None, t=None):
        self.o = o
        self.h = h
        self.l = l
        self.c = c
        self.v = v
        self.t = t


class Swing:
    __slots__ = ('idx', 'price', 'isHigh', 'label',)
    def __init__(self, idx=NA, price=NA, isHigh=False, label=""):
        self.idx = idx
        self.price = price
        self.isHigh = isHigh
        self.label = label


class Ev:
    __slots__ = ('idx', 'price', 'bullish', 'isBos', 'repeat', 'repeatOf', 'score', 'confirmed', 'closeThroughAtr', 'rangeExpansion', 'volExpansion', 'followThrough', 'retested', 'reasons',)
    def __init__(self, idx=NA, price=NA, bullish=False, isBos=False, repeat=NA, repeatOf=NA, score=NA, confirmed=False, closeThroughAtr=NA, rangeExpansion=NA, volExpansion=NA, followThrough=False, retested=False, reasons=""):
        self.idx = idx
        self.price = price
        self.bullish = bullish
        self.isBos = isBos
        self.repeat = repeat
        self.repeatOf = repeatOf
        self.score = score
        self.confirmed = confirmed
        self.closeThroughAtr = closeThroughAtr
        self.rangeExpansion = rangeExpansion
        self.volExpansion = volExpansion
        self.followThrough = followThrough
        self.retested = retested
        self.reasons = reasons


class Lv:
    __slots__ = ('price', 'role', 'origin', 'flipped', 'distancePct', 'distanceAtr', 'touches', 'strength', 'zoneLow', 'zoneHigh', 'visits', 'held', 'broken', 'holdRatePct', 'barsSince', 'score', 'confirmed', 'inPlay', 'reasons', 'confluent', 'confluencePrice', 'confluenceTouches',)
    def __init__(self, price=NA, role="", origin="", flipped=False, distancePct=NA, distanceAtr=NA, touches=NA, strength=NA, zoneLow=NA, zoneHigh=NA, visits=NA, held=NA, broken=NA, holdRatePct=NA, barsSince=NA, score=NA, confirmed=False, inPlay=False, reasons="", confluent=False, confluencePrice=NA, confluenceTouches=NA):
        self.price = price
        self.role = role
        self.origin = origin
        self.flipped = flipped
        self.distancePct = distancePct
        self.distanceAtr = distanceAtr
        self.touches = touches
        self.strength = strength
        self.zoneLow = zoneLow
        self.zoneHigh = zoneHigh
        self.visits = visits
        self.held = held
        self.broken = broken
        self.holdRatePct = holdRatePct
        self.barsSince = barsSince
        self.score = score
        self.confirmed = confirmed
        self.inPlay = inPlay
        self.reasons = reasons
        self.confluent = confluent
        self.confluencePrice = confluencePrice
        self.confluenceTouches = confluenceTouches


class Fvg:
    __slots__ = ('idx', 'top', 'bottom', 'bullish', 'filled', 'sessionGap',)
    def __init__(self, idx=NA, top=NA, bottom=NA, bullish=False, filled=False, sessionGap=False):
        self.idx = idx
        self.top = top
        self.bottom = bottom
        self.bullish = bullish
        self.filled = filled
        self.sessionGap = sessionGap


class Brk:
    __slots__ = ('idx', 'level', 'bullish', 'isFakeout', 'confirmed', 'score',)
    def __init__(self, idx=NA, level=NA, bullish=False, isFakeout=False, confirmed=False, score=NA):
        self.idx = idx
        self.level = level
        self.bullish = bullish
        self.isFakeout = isFakeout
        self.confirmed = confirmed
        self.score = score


class Cluster:
    __slots__ = ('sum', 'count', 'highs', 'lows',)
    def __init__(self, sum=NA, count=NA, highs=NA, lows=NA):
        self.sum = sum
        self.count = count
        self.highs = highs
        self.lows = lows


class Ctx:
    __slots__ = ('roomAbovePct', 'roomBelowPct', 'roomAboveAtr', 'roomBelowAtr', 'rangeWidthPct', 'rangePositionPct',)
    def __init__(self, roomAbovePct=NA, roomBelowPct=NA, roomAboveAtr=NA, roomBelowAtr=NA, rangeWidthPct=NA, rangePositionPct=NA):
        self.roomAbovePct = roomAbovePct
        self.roomBelowPct = roomBelowPct
        self.roomAboveAtr = roomAboveAtr
        self.roomBelowAtr = roomBelowAtr
        self.rangeWidthPct = rangeWidthPct
        self.rangePositionPct = rangePositionPct


class Counts:
    __slots__ = ('swings', 'bos', 'choch', 'confirmedEvents', 'repeatedBreaks', 'levels', 'resistances', 'supports', 'flipped', 'confirmedLevels', 'confluent', 'fvgOpen', 'fvgSessionGap', 'breakouts', 'fakeouts',)
    def __init__(self, swings=NA, bos=NA, choch=NA, confirmedEvents=NA, repeatedBreaks=NA, levels=NA, resistances=NA, supports=NA, flipped=NA, confirmedLevels=NA, confluent=NA, fvgOpen=NA, fvgSessionGap=NA, breakouts=NA, fakeouts=NA):
        self.swings = swings
        self.bos = bos
        self.choch = choch
        self.confirmedEvents = confirmedEvents
        self.repeatedBreaks = repeatedBreaks
        self.levels = levels
        self.resistances = resistances
        self.supports = supports
        self.flipped = flipped
        self.confirmedLevels = confirmedLevels
        self.confluent = confluent
        self.fvgOpen = fvgOpen
        self.fvgSessionGap = fvgSessionGap
        self.breakouts = breakouts
        self.fakeouts = fakeouts


class Scan:
    __slots__ = ('rowsScanned', 'referencePrice', 'tolerance', 'atr', 'trend', 'swings', 'events', 'allLevels', 'levels', 'fvgs', 'breakouts', 'nearestResistance', 'nearestSupport', 'context', 'counts',)
    def __init__(self, rowsScanned=NA, referencePrice=NA, tolerance=NA, atr=NA, trend="", swings=None, events=None, allLevels=None, levels=None, fvgs=None, breakouts=None, nearestResistance=NA, nearestSupport=NA, context=NA, counts=NA):
        self.rowsScanned = rowsScanned
        self.referencePrice = referencePrice
        self.tolerance = tolerance
        self.atr = atr
        self.trend = trend
        self.swings = swings
        self.events = events
        self.allLevels = allLevels
        self.levels = levels
        self.fvgs = fvgs
        self.breakouts = breakouts
        self.nearestResistance = nearestResistance
        self.nearestSupport = nearestSupport
        self.context = context
        self.counts = counts



def sideOf(value, lo, hi):
    return ((1) if ((value > hi)) else ((((-1)) if ((value < lo)) else (0))))


def avgTrueRange(w, window):
    n = _arr_size(w.c)
    total = 0.0
    taken = 0
    if (n >= 2):
        start = _math_max(1, (n - window))
        for i in _rango(start, (n - 1)):
            pc = _arr_get(w.c, (i - 1))
            hi = _arr_get(w.h, i)
            lo = _arr_get(w.l, i)
            total += _math_max((hi - lo), _math_max(_math_abs((hi - pc)), _math_abs((lo - pc))))
            taken += 1
    return (((total / taken)) if ((taken > 0)) else (0.0))


def avgVolume(w, i, window):
    total = 0.0
    taken = 0
    startBar = _math_max(0, (i - window))
    if ((i - 1) >= startBar):
        for j in _rango(startBar, (i - 1)):
            vol = _arr_get(w.v, j)
            if (vol > 0):
                total += vol
                taken += 1
    return (((total / taken)) if ((taken > 0)) else (0.0))


def barSpacingSeconds(w):
    n = _arr_size(w.t)
    out = 0.0
    if (n >= 3):
        deltas = _arr_new()
        for i in _rango(1, (n - 1)):
            a = _arr_get(w.t, (i - 1))
            b = _arr_get(w.t, i)
            if (b > a):
                _arr_push(deltas, ((b - a) / 1000.0))
        if (_arr_size(deltas) > 0):
            _arr_sort(deltas, "asc")
            out = _arr_get(deltas, _math_floor((_arr_size(deltas) / 2)))
    return out


def detectSwings(w, strength):
    out = _arr_new()
    n = _arr_size(w.c)
    if (n >= ((2 * strength) + 1)):
        for i in _rango(strength, ((n - strength) - 1)):
            hi = _arr_get(w.h, i)
            lo = _arr_get(w.l, i)
            isHigh = True
            isLow = True
            for j in _rango((i - strength), (i + strength)):
                if (j != i):
                    if (_arr_get(w.h, j) > hi):
                        isHigh = False
                    if (_arr_get(w.l, j) < lo):
                        isLow = False
            if (isHigh and (not isLow)):
                _arr_push(out, Swing(i, _math_round(hi, 6), True, ''))
            else:
                if (isLow and (not isHigh)):
                    _arr_push(out, Swing(i, _math_round(lo, 6), False, ''))
    return out


def labelStructure(swings):
    lastHigh = NA
    lastLow = NA
    lastHighLabel = ''
    lastLowLabel = ''
    if (_arr_size(swings) > 0):
        for i in _rango(0, (_arr_size(swings) - 1)):
            s = _arr_get(swings, i)
            if s.isHigh:
                if (not _is_na(lastHigh)):
                    s.label = (('HH') if ((s.price > lastHigh)) else ('LH'))
                    lastHighLabel = s.label
                lastHigh = s.price
            else:
                if (not _is_na(lastLow)):
                    s.label = (('HL') if ((s.price > lastLow)) else ('LL'))
                    lastLowLabel = s.label
                lastLow = s.price
    trend = 'range'
    if ((lastHighLabel != '') and (lastLowLabel != '')):
        up = ((lastHighLabel == 'HH') and (lastLowLabel == 'HL'))
        down = ((lastHighLabel == 'LH') and (lastLowLabel == 'LL'))
        trend = (('uptrend') if (up) else ((('downtrend') if (down) else ('range'))))
    return trend


def detectEvents(w, swings):
    events = _arr_new()
    trend = ''
    lastSh = NA
    lastSl = NA
    si = 0
    n = _arr_size(w.c)
    total = _arr_size(swings)
    if (n > 0):
        for i in _rango(0, (n - 1)):
            while (si < total):
                s = _arr_get(swings, si)
                if (s.idx >= i):
                    break
                if s.isHigh:
                    lastSh = s.price
                else:
                    lastSl = s.price
                si += 1
            c = _arr_get(w.c, i)
            if ((not _is_na(lastSh)) and (c > lastSh)):
                _arr_push(events, Ev(i, _math_round(lastSh, 6), True, (trend == 'up'), 1, i, 0.0, False, NA, NA, NA, False, False, ''))
                trend = 'up'
                lastSh = NA
            else:
                if ((not _is_na(lastSl)) and (c < lastSl)):
                    _arr_push(events, Ev(i, _math_round(lastSl, 6), False, (trend == 'down'), 1, i, 0.0, False, NA, NA, NA, False, False, ''))
                    trend = 'down'
                    lastSl = NA
    return events


def clusterRepeatedEvents(events, tolerance):
    gPrice = _arr_new()
    gBull = _arr_new()
    gFirst = _arr_new()
    gCount = _arr_new()
    if (_arr_size(events) > 0):
        for i in _rango(0, (_arr_size(events) - 1)):
            ev = _arr_get(events, i)
            price = ((0.0) if (_is_na(ev.price)) else (ev.price))
            match = (-1)
            if ((price > 0) and (_arr_size(gPrice) > 0)):
                for g in _rango(0, (_arr_size(gPrice) - 1)):
                    if ((_arr_get(gBull, g) == ev.bullish) and ((_math_abs((price - _arr_get(gPrice, g))) / _arr_get(gPrice, g)) <= tolerance)):
                        match = g
                        break
            if (match == (-1)):
                _arr_push(gPrice, ((price) if ((price > 0)) else (1e-09)))
                _arr_push(gBull, ev.bullish)
                _arr_push(gFirst, ev.idx)
                _arr_push(gCount, 1)
                ev.repeat = 1
                ev.repeatOf = ev.idx
            else:
                _arr_set(gCount, match, (_arr_get(gCount, match) + 1))
                ev.repeat = _arr_get(gCount, match)
                ev.repeatOf = _arr_get(gFirst, match)
    return events


def detectSrLevels(swings, tolerance, minTouches, currentPrice):
    levels = _arr_new()
    total = _arr_size(swings)
    if (total > 0):
        prices = _arr_new()
        for i in _rango(0, (total - 1)):
            _arr_push(prices, _arr_get(swings, i).price)
        order_ = _arr_sort_indices(prices, "asc")
        clusters = _arr_new()
        for k in _rango(0, (total - 1)):
            s = _arr_get(swings, _arr_get(order_, k))
            placed = False
            if (_arr_size(clusters) > 0):
                for ci in _rango(0, (_arr_size(clusters) - 1)):
                    c = _arr_get(clusters, ci)
                    ref = (c.sum / c.count)
                    if ((_math_abs((s.price - ref)) / ref) <= tolerance):
                        c.sum = (c.sum + s.price)
                        c.count = (c.count + 1)
                        if s.isHigh:
                            c.highs = (c.highs + 1)
                        else:
                            c.lows = (c.lows + 1)
                        placed = True
                        break
            if (not placed):
                _arr_push(clusters, Cluster(s.price, 1, ((1) if (s.isHigh) else (0)), ((0) if (s.isHigh) else (1))))
        for ci in _rango(0, (_arr_size(clusters) - 1)):
            c = _arr_get(clusters, ci)
            if (c.count >= minTouches):
                price = _math_round((c.sum / c.count), 6)
                origin = (('highs') if ((c.highs > c.lows)) else ((('lows') if ((c.lows > c.highs)) else ('mixed'))))
                role = 'pivot'
                distancePct = NA
                flipped = False
                if ((not _is_na(currentPrice)) and (currentPrice > 0)):
                    role = (('resistance') if ((price > currentPrice)) else ((('support') if ((price < currentPrice)) else ('pivot'))))
                    distancePct = _math_round((((price - currentPrice) / currentPrice) * 100), 3)
                    flipped = (((origin == 'highs') and (role == 'support')) or ((origin == 'lows') and (role == 'resistance')))
                _arr_push(levels, Lv(price, role, origin, flipped, distancePct, NA, c.count, _math_min(5, c.count), _math_round((price * (1 - tolerance)), 6), _math_round((price * (1 + tolerance)), 6), 0, 0, 0, NA, NA, 0.0, False, False, '', False, NA, NA))
    return levels


def sortLevels(levels, byDistance):
    n = _arr_size(levels)
    if (n > 1):
        for i in _rango(1, (n - 1)):
            key = _arr_get(levels, i)
            j = (i - 1)
            while (j >= 0):
                cur = _arr_get(levels, j)
                greater = ((((_math_abs(cur.distancePct) > _math_abs(key.distancePct)) or ((_math_abs(cur.distancePct) == _math_abs(key.distancePct)) and (cur.touches < key.touches)))) if (byDistance) else (((cur.touches < key.touches) or ((cur.touches == key.touches) and (cur.price > key.price)))))
                if greater:
                    _arr_set(levels, (j + 1), cur)
                    j -= 1
                else:
                    break
            _arr_set(levels, (j + 1), key)
    return levels


def annotateLevels(w, levels, tolerance):
    n = _arr_size(w.c)
    if (_arr_size(levels) > 0):
        for li in _rango(0, (_arr_size(levels) - 1)):
            lv = _arr_get(levels, li)
            if ((n == 0) or _is_na(lv.price) or (lv.price <= 0)):
                lv.visits = 0
                lv.held = 0
                lv.broken = 0
                lv.holdRatePct = NA
                lv.barsSince = NA
                lv.score = 0.0
                lv.confirmed = False
                lv.reasons = 'noData'
            else:
                lowBand = (lv.price * (1 - tolerance))
                highBand = (lv.price * (1 + tolerance))
                visits = 0
                held = 0
                broken = 0
                lastEnd = NA
                inPlay = False
                openVisit = False
                openEntry = 0
                lastSide = 0
                for i in _rango(0, (n - 1)):
                    touching = ((_arr_get(w.h, i) >= lowBand) and (_arr_get(w.l, i) <= highBand))
                    closeSide = sideOf(_arr_get(w.c, i), lowBand, highBand)
                    if (touching and (not openVisit)):
                        openVisit = True
                        openEntry = lastSide
                    else:
                        if ((not touching) and openVisit):
                            visits += 1
                            lastEnd = (i - 1)
                            if (openEntry != 0):
                                if (closeSide == openEntry):
                                    held += 1
                                else:
                                    if (closeSide == (-openEntry)):
                                        broken += 1
                            openVisit = False
                    if (closeSide != 0):
                        lastSide = closeSide
                if openVisit:
                    visits += 1
                    lastEnd = (n - 1)
                    inPlay = True
                resolved = (held + broken)
                holdRate = ((((held * 1.0) / resolved)) if ((resolved > 0)) else (NA))
                barsSince = ((((n - 1) - lastEnd)) if ((visits > 0)) else (NA))
                reasons = ''
                score = _math_min(45, (15 * visits))
                if (visits >= 3):
                    reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'multiTest')
                if _is_na(holdRate):
                    score += 10
                    reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'untested')
                else:
                    score += _math_floor((30 * holdRate))
                    if (holdRate >= 0.66):
                        reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'held')
                    else:
                        if (holdRate < 0.4):
                            reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'weak')
                if (not _is_na(barsSince)):
                    if (barsSince <= _math_max(5, (n * 0.1))):
                        score += 15
                        reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'recent')
                    else:
                        if (barsSince <= (n * 0.35)):
                            score += 8
                        else:
                            reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'stale')
                if (lv.flipped and (broken >= 1)):
                    score += 10
                    reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'flip')
                if inPlay:
                    reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'inPlay')
                lv.visits = visits
                lv.held = held
                lv.broken = broken
                lv.holdRatePct = ((NA) if (_is_na(holdRate)) else (_math_round((holdRate * 100), 1)))
                lv.barsSince = barsSince
                lv.score = _math_max(0, _math_min(100, score))
                lv.inPlay = inPlay
                lv.reasons = reasons
                lv.confirmed = ((visits >= 2) and (lv.score >= 55))
    return levels


def annotateEvents(w, events, atr):
    n = _arr_size(w.c)
    hasVol = False
    if (n > 0):
        for vi in _rango(0, (n - 1)):
            if (_arr_get(w.v, vi) > 0):
                hasVol = True
                break
    if (_arr_size(events) > 0):
        for e in _rango(0, (_arr_size(events) - 1)):
            ev = _arr_get(events, e)
            i = ev.idx
            level = ((0.0) if (_is_na(ev.price)) else (ev.price))
            if ((i < 0) or (i >= n) or (level <= 0)):
                ev.score = 0.0
                ev.confirmed = False
                ev.reasons = 'noData'
            else:
                reasons = ''
                score = 0.0
                barClose = _arr_get(w.c, i)
                barHigh = _arr_get(w.h, i)
                barLow = _arr_get(w.l, i)
                throughAtr = ((_math_round((_math_abs((barClose - level)) / atr), 2)) if ((atr > 0)) else (NA))
                if ((not _is_na(throughAtr)) and (throughAtr >= 0.25)):
                    score += 25
                    reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'closedThrough')
                else:
                    score += 10
                follow = False
                if ((i + 1) < n):
                    nxt = _arr_get(w.c, (i + 1))
                    follow = (((nxt > level)) if (ev.bullish) else ((nxt < level)))
                if follow:
                    score += 25
                    reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'followThrough')
                expansion = ((_math_round(((barHigh - barLow) / atr), 2)) if ((atr > 0)) else (NA))
                if ((not _is_na(expansion)) and (expansion >= 1.2)):
                    score += 15
                    reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'expansion')
                avgV = ((avgVolume(w, i, VOL_WINDOW)) if (hasVol) else (0.0))
                volExp = ((_math_round((_arr_get(w.v, i) / avgV), 2)) if ((avgV > 0)) else (NA))
                if _is_na(volExp):
                    score += 8
                else:
                    if (volExp >= 1.3):
                        score += 15
                        reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'volume')
                retest = False
                if ((i + 1) <= (n - 1)):
                    for k in _rango((i + 1), (n - 1)):
                        rh = _arr_get(w.h, k)
                        rl = _arr_get(w.l, k)
                        rc = _arr_get(w.c, k)
                        if (ev.bullish and (rl <= level) and (rc > level)):
                            retest = True
                            break
                        if ((not ev.bullish) and (rh >= level) and (rc < level)):
                            retest = True
                            break
                if retest:
                    score += 20
                    reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'retest')
                ev.closeThroughAtr = throughAtr
                ev.rangeExpansion = expansion
                ev.volExpansion = volExp
                ev.followThrough = follow
                ev.retested = retest
                ev.score = _math_max(0, _math_min(100, score))
                ev.reasons = reasons
                ev.confirmed = (ev.score >= 50)
    return events


def detectFvgs(w):
    out = _arr_new()
    n = _arr_size(w.c)
    if (n >= 3):
        sufMinLow = _arr_new((n + 1), 0.0)
        sufMaxHigh = _arr_new((n + 1), 0.0)
        _arr_set(sufMinLow, n, 1e+308)
        _arr_set(sufMaxHigh, n, (-1e+308))
        for k in _rango((n - 1), 0):
            _arr_set(sufMinLow, k, _math_min(_arr_get(w.l, k), _arr_get(sufMinLow, (k + 1))))
            _arr_set(sufMaxHigh, k, _math_max(_arr_get(w.h, k), _arr_get(sufMaxHigh, (k + 1))))
        spacing = barSpacingSeconds(w)
        checkGaps = ((spacing > 0) and (spacing < DAY_SECONDS))
        gapThreshold = (spacing * SESSION_GAP_FACTOR)
        for i in _rango(1, (n - 2)):
            pHigh = _arr_get(w.h, (i - 1))
            pLow = _arr_get(w.l, (i - 1))
            cHigh = _arr_get(w.h, (i + 1))
            cLow = _arr_get(w.l, (i + 1))
            bull = (pHigh < cLow)
            bear = (pLow > cHigh)
            if (bull or bear):
                bottom = ((pHigh) if (bull) else (cHigh))
                top = ((cLow) if (bull) else (pLow))
                filled = (((_arr_get(sufMinLow, (i + 2)) <= top)) if (bull) else ((_arr_get(sufMaxHigh, (i + 2)) >= bottom)))
                sessionGap = False
                if checkGaps:
                    t0 = (_arr_get(w.t, (i - 1)) / 1000.0)
                    t1 = (_arr_get(w.t, i) / 1000.0)
                    t2 = (_arr_get(w.t, (i + 1)) / 1000.0)
                    sessionGap = (((t1 - t0) > gapThreshold) or ((t2 - t1) > gapThreshold))
                _arr_push(out, Fvg(i, _math_round(top, 6), _math_round(bottom, 6), bull, filled, sessionGap))
    return out


def detectBreakouts(w, levels, strength):
    out = _arr_new()
    n = _arr_size(w.c)
    if ((n >= ((2 * strength) + 2)) and (_arr_size(levels) > 0)):
        atr = avgTrueRange(w, 14)
        hasVol = False
        for vi in _rango(0, (n - 1)):
            if (_arr_get(w.v, vi) > 0):
                hasVol = True
                break
        for i in _rango(1, (n - 1)):
            prevC = _arr_get(w.c, (i - 1))
            c = _arr_get(w.c, i)
            h = _arr_get(w.h, i)
            lo = _arr_get(w.l, i)
            o = _arr_get(w.o, i)
            rng = _math_max((h - lo), 1e-09)
            for li in _rango(0, (_arr_size(levels) - 1)):
                lv = _arr_get(levels, li)
                L = lv.price
                if ((not _is_na(L)) and (L > 0)):
                    upCross = ((prevC <= L) and (L < c))
                    downCross = ((prevC >= L) and (L > c))
                    if (upCross or downCross):
                        margin = (_math_abs((c - L)) / L)
                        barOk = (((c > o)) if (upCross) else ((c < o)))
                        closePos = ((((c - lo) / rng)) if (upCross) else (((h - c) / rng)))
                        rangeExp = ((((h - lo) / atr)) if ((atr > 0)) else (1.0))
                        avgV = ((avgVolume(w, i, VOL_WINDOW)) if (hasVol) else (0.0))
                        volExp = (((_arr_get(w.v, i) / avgV)) if ((avgV > 0)) else (NA))
                        score = ((30) if ((margin >= 0.001)) else (10))
                        score += ((20) if (barOk) else (0))
                        score += _math_floor((20 * _math_min(1.0, _math_max(0.0, closePos))))
                        score += ((15) if ((rangeExp >= 1.2)) else (0))
                        score += ((8) if (_is_na(volExp)) else (((15) if ((volExp >= 1.5)) else (0))))
                        _arr_push(out, Brk(i, _math_round(L, 6), upCross, False, (score >= 50), _math_min(100, score)))
                    else:
                        if ((h > L) and (c < L) and (prevC < L)):
                            _arr_push(out, Brk(i, _math_round(L, 6), False, True, False, 0.0))
                        else:
                            if ((lo < L) and (c > L) and (prevC > L)):
                                _arr_push(out, Brk(i, _math_round(L, 6), True, True, False, 0.0))
    return out


def applyConfluence(levels, htfLevels, tolerance):
    matched = 0
    if ((_arr_size(levels) > 0) and (_arr_size(htfLevels) > 0)):
        for li in _rango(0, (_arr_size(levels) - 1)):
            lv = _arr_get(levels, li)
            if ((not _is_na(lv.price)) and (lv.price > 0)):
                bestGap = NA
                bestIdx = (-1)
                for hi in _rango(0, (_arr_size(htfLevels) - 1)):
                    hl = _arr_get(htfLevels, hi)
                    if ((not _is_na(hl.price)) and (hl.price > 0)):
                        gap = (_math_abs((hl.price - lv.price)) / lv.price)
                        if ((gap <= tolerance) and (_is_na(bestGap) or (gap < bestGap))):
                            bestGap = gap
                            bestIdx = hi
                if (bestIdx >= 0):
                    hl = _arr_get(htfLevels, bestIdx)
                    lv.confluent = True
                    lv.confluencePrice = hl.price
                    lv.confluenceTouches = hl.touches
                    matched += 1
    return matched


def summariseContext(currentPrice, resPrice, supPrice, atr):
    ctx = Ctx(NA, NA, NA, NA, NA, NA)
    if ((not _is_na(currentPrice)) and (currentPrice > 0)):
        if ((not _is_na(resPrice)) and (resPrice > currentPrice)):
            ctx.roomAbovePct = _math_round((((resPrice - currentPrice) / currentPrice) * 100), 2)
            if (atr > 0):
                ctx.roomAboveAtr = _math_round(((resPrice - currentPrice) / atr), 2)
        if ((not _is_na(supPrice)) and (supPrice < currentPrice)):
            ctx.roomBelowPct = _math_round((((currentPrice - supPrice) / currentPrice) * 100), 2)
            if (atr > 0):
                ctx.roomBelowAtr = _math_round(((currentPrice - supPrice) / atr), 2)
        if ((not _is_na(resPrice)) and (not _is_na(supPrice)) and (resPrice > supPrice)):
            ctx.rangeWidthPct = _math_round((((resPrice - supPrice) / currentPrice) * 100), 2)
            ctx.rangePositionPct = _math_round((((currentPrice - supPrice) / (resPrice - supPrice)) * 100), 1)
    return ctx


def autoTolerance(w):
    out = 0.008
    if (_arr_size(w.c) > 0):
        atr = avgTrueRange(w, 14)
        lastClose = _arr_get(w.c, (_arr_size(w.c) - 1))
        if ((atr > 0) and (lastClose > 0)):
            out = _math_max(0.0015, _math_min(0.025, ((atr / lastClose) * 0.5)))
    return out


def scanLevels(w, strength, minTouches):
    out = _arr_new()
    n = _arr_size(w.c)
    if (n >= ((2 * strength) + 1)):
        tol = autoTolerance(w)
        sw = detectSwings(w, strength)
        out = detectSrLevels(sw, tol, minTouches, _arr_get(w.c, (n - 1)))
        out = sortLevels(out, True)
    return out


def runScan(w, strength, tolOverride, minTouches, htfLevels, htfChecked):
    n = _arr_size(w.c)
    reference = ((_arr_get(w.c, (n - 1))) if ((n > 0)) else (NA))
    tol = ((autoTolerance(w)) if (_is_na(tolOverride)) else (tolOverride))
    atr = avgTrueRange(w, 14)
    swings = detectSwings(w, strength)
    trend = labelStructure(swings)
    events = annotateEvents(w, detectEvents(w, swings), atr)
    events = clusterRepeatedEvents(events, tol)
    allLevels = detectSrLevels(swings, tol, minTouches, reference)
    allLevels = sortLevels(allLevels, ((not _is_na(reference)) and (reference > 0)))
    if ((atr > 0) and (_arr_size(allLevels) > 0)):
        for i in _rango(0, (_arr_size(allLevels) - 1)):
            lv = _arr_get(allLevels, i)
            lv.distanceAtr = _math_round((_math_abs((lv.price - reference)) / atr), 2)
    levels = _arr_new()
    if (_arr_size(allLevels) > 0):
        for i in _rango(0, (_math_min(_arr_size(allLevels), MAX_ANALYSED_LEVELS) - 1)):
            _arr_push(levels, _arr_get(allLevels, i))
    levels = annotateLevels(w, levels, tol)
    fvgs = detectFvgs(w)
    breakouts = detectBreakouts(w, levels, strength)
    confluent = NA
    if htfChecked:
        confluent = applyConfluence(levels, htfLevels, tol)
    nearestRes = NA
    nearestSup = NA
    if (_arr_size(levels) > 0):
        for i in _rango(0, (_arr_size(levels) - 1)):
            lv = _arr_get(levels, i)
            if (_is_na(nearestRes) and (lv.role == 'resistance')):
                nearestRes = lv
            if (_is_na(nearestSup) and (lv.role == 'support')):
                nearestSup = lv
    ctx = summariseContext(reference, ((NA) if (_is_na(nearestRes)) else (nearestRes.price)), ((NA) if (_is_na(nearestSup)) else (nearestSup.price)), atr)
    cBos = 0
    cChoch = 0
    cConfirmedEvents = 0
    cRepeated = 0
    if (_arr_size(events) > 0):
        for i in _rango(0, (_arr_size(events) - 1)):
            ev = _arr_get(events, i)
            if ev.isBos:
                cBos += 1
            else:
                cChoch += 1
            if ev.confirmed:
                cConfirmedEvents += 1
            if (ev.repeat > 1):
                cRepeated += 1
    cRes = 0
    cSup = 0
    cFlipped = 0
    if (_arr_size(allLevels) > 0):
        for i in _rango(0, (_arr_size(allLevels) - 1)):
            lv = _arr_get(allLevels, i)
            if (lv.role == 'resistance'):
                cRes += 1
            if (lv.role == 'support'):
                cSup += 1
            if lv.flipped:
                cFlipped += 1
    cConfirmedLevels = 0
    if (_arr_size(levels) > 0):
        for i in _rango(0, (_arr_size(levels) - 1)):
            if _arr_get(levels, i).confirmed:
                cConfirmedLevels += 1
    cFvgOpen = 0
    cFvgSession = 0
    if (_arr_size(fvgs) > 0):
        for i in _rango(0, (_arr_size(fvgs) - 1)):
            g = _arr_get(fvgs, i)
            if ((not g.filled) and (not g.sessionGap)):
                cFvgOpen += 1
            if g.sessionGap:
                cFvgSession += 1
    cBreakouts = 0
    cFakeouts = 0
    if (_arr_size(breakouts) > 0):
        for i in _rango(0, (_arr_size(breakouts) - 1)):
            b = _arr_get(breakouts, i)
            if b.isFakeout:
                cFakeouts += 1
            else:
                if b.confirmed:
                    cBreakouts += 1
    counts = Counts(_arr_size(swings), cBos, cChoch, cConfirmedEvents, cRepeated, _arr_size(allLevels), cRes, cSup, cFlipped, cConfirmedLevels, confluent, cFvgOpen, cFvgSession, cBreakouts, cFakeouts)
    return Scan(n, reference, tol, atr, trend, swings, events, allLevels, levels, fvgs, breakouts, nearestRes, nearestSup, ctx, counts)

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


def _arr_includes(a, v):
    return v in a


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
    __slots__ = ('idx', 'price', 'bullish', 'isBos', 'repeat', 'repeatOf', 'score', 'confirmed', 'closeThroughAtr', 'rangeExpansion', 'volExpansion', 'followThrough', 'retested', 'reasons', 'invalidationPrice', 'invalidated', 'invalidatedAt',)
    def __init__(self, idx=NA, price=NA, bullish=False, isBos=False, repeat=NA, repeatOf=NA, score=NA, confirmed=False, closeThroughAtr=NA, rangeExpansion=NA, volExpansion=NA, followThrough=False, retested=False, reasons="", invalidationPrice=NA, invalidated=False, invalidatedAt=NA):
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
        self.invalidationPrice = invalidationPrice
        self.invalidated = invalidated
        self.invalidatedAt = invalidatedAt


class Lv:
    __slots__ = ('price', 'role', 'origin', 'flipped', 'distancePct', 'distanceAtr', 'touches', 'strength', 'zoneLow', 'zoneHigh', 'coreLow', 'coreHigh', 'touchSpreadPct', 'visits', 'held', 'broken', 'holdRatePct', 'barsSince', 'score', 'confirmed', 'inPlay', 'reasons', 'confluent', 'confluencePrice', 'confluenceTouches',)
    def __init__(self, price=NA, role="", origin="", flipped=False, distancePct=NA, distanceAtr=NA, touches=NA, strength=NA, zoneLow=NA, zoneHigh=NA, coreLow=NA, coreHigh=NA, touchSpreadPct=NA, visits=NA, held=NA, broken=NA, holdRatePct=NA, barsSince=NA, score=NA, confirmed=False, inPlay=False, reasons="", confluent=False, confluencePrice=NA, confluenceTouches=NA):
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
        self.coreLow = coreLow
        self.coreHigh = coreHigh
        self.touchSpreadPct = touchSpreadPct
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
    __slots__ = ('sum', 'count', 'highs', 'lows', 'lo', 'hi',)
    def __init__(self, sum=NA, count=NA, highs=NA, lows=NA, lo=NA, hi=NA):
        self.sum = sum
        self.count = count
        self.highs = highs
        self.lows = lows
        self.lo = lo
        self.hi = hi


class Rx:
    __slots__ = ('levelIdx', 'levelPrice', 'levelRole', 'startIdx', 'endIdx', 'entrySide', 'exitSide', 'outcome', 'bullish', 'extreme', 'penetrationPct',)
    def __init__(self, levelIdx=NA, levelPrice=NA, levelRole="", startIdx=NA, endIdx=NA, entrySide=NA, exitSide=NA, outcome="", bullish=False, extreme=NA, penetrationPct=NA):
        self.levelIdx = levelIdx
        self.levelPrice = levelPrice
        self.levelRole = levelRole
        self.startIdx = startIdx
        self.endIdx = endIdx
        self.entrySide = entrySide
        self.exitSide = exitSide
        self.outcome = outcome
        self.bullish = bullish
        self.extreme = extreme
        self.penetrationPct = penetrationPct


class Pressure:
    __slots__ = ('active', 'side', 'posPct', 'wickAgainstPct', 'bodyPct', 'expansion', 'volExpansion', 'barsInside', 'score', 'verdict', 'reasons',)
    def __init__(self, active=False, side=NA, posPct=NA, wickAgainstPct=NA, bodyPct=NA, expansion=NA, volExpansion=NA, barsInside=NA, score=NA, verdict="", reasons=""):
        self.active = active
        self.side = side
        self.posPct = posPct
        self.wickAgainstPct = wickAgainstPct
        self.bodyPct = bodyPct
        self.expansion = expansion
        self.volExpansion = volExpansion
        self.barsInside = barsInside
        self.score = score
        self.verdict = verdict
        self.reasons = reasons


class Cm:
    __slots__ = ('body', 'rng', 'upper', 'lower', 'isBull', 'isBear', 'bodyPct',)
    def __init__(self, body=NA, rng=NA, upper=NA, lower=NA, isBull=False, isBear=False, bodyPct=NA):
        self.body = body
        self.rng = rng
        self.upper = upper
        self.lower = lower
        self.isBull = isBull
        self.isBear = isBear
        self.bodyPct = bodyPct


class PatMeta:
    __slots__ = ('kind', 'behavior', 'rate', 'rank', 'candles', 'basis',)
    def __init__(self, kind="", behavior="", rate=NA, rank=NA, candles=NA, basis=""):
        self.kind = kind
        self.behavior = behavior
        self.rate = rate
        self.rank = rank
        self.candles = candles
        self.basis = basis


class Pat:
    __slots__ = ('idx', 'startIdx', 'id', 'kind', 'behavior', 'rate', 'rank', 'candles', 'basis', 'bodyPct', 'upperWickPct', 'lowerWickPct', 'levelPrice', 'levelRole',)
    def __init__(self, idx=NA, startIdx=NA, id="", kind="", behavior="", rate=NA, rank=NA, candles=NA, basis="", bodyPct=NA, upperWickPct=NA, lowerWickPct=NA, levelPrice=NA, levelRole=""):
        self.idx = idx
        self.startIdx = startIdx
        self.id = id
        self.kind = kind
        self.behavior = behavior
        self.rate = rate
        self.rank = rank
        self.candles = candles
        self.basis = basis
        self.bodyPct = bodyPct
        self.upperWickPct = upperWickPct
        self.lowerWickPct = lowerWickPct
        self.levelPrice = levelPrice
        self.levelRole = levelRole


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
    __slots__ = ('swings', 'bos', 'choch', 'confirmedEvents', 'repeatedBreaks', 'levels', 'resistances', 'supports', 'flipped', 'confirmedLevels', 'confluent', 'patterns', 'bullishPatterns', 'bearishPatterns', 'patternsAtLevel', 'invalidated', 'rejections', 'zoneBreaks', 'fvgOpen', 'fvgSessionGap', 'breakouts', 'fakeouts',)
    def __init__(self, swings=NA, bos=NA, choch=NA, confirmedEvents=NA, repeatedBreaks=NA, levels=NA, resistances=NA, supports=NA, flipped=NA, confirmedLevels=NA, confluent=NA, patterns=NA, bullishPatterns=NA, bearishPatterns=NA, patternsAtLevel=NA, invalidated=NA, rejections=NA, zoneBreaks=NA, fvgOpen=NA, fvgSessionGap=NA, breakouts=NA, fakeouts=NA):
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
        self.patterns = patterns
        self.bullishPatterns = bullishPatterns
        self.bearishPatterns = bearishPatterns
        self.patternsAtLevel = patternsAtLevel
        self.invalidated = invalidated
        self.rejections = rejections
        self.zoneBreaks = zoneBreaks
        self.fvgOpen = fvgOpen
        self.fvgSessionGap = fvgSessionGap
        self.breakouts = breakouts
        self.fakeouts = fakeouts


class Scan:
    __slots__ = ('rowsScanned', 'referencePrice', 'tolerance', 'atr', 'trend', 'swings', 'events', 'allLevels', 'levels', 'fvgs', 'breakouts', 'patterns', 'reactions', 'pressure', 'lastStructure', 'htfTrend', 'nearestResistance', 'nearestSupport', 'context', 'counts',)
    def __init__(self, rowsScanned=NA, referencePrice=NA, tolerance=NA, atr=NA, trend="", swings=None, events=None, allLevels=None, levels=None, fvgs=None, breakouts=None, patterns=None, reactions=None, pressure=NA, lastStructure=NA, htfTrend="", nearestResistance=NA, nearestSupport=NA, context=NA, counts=NA):
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
        self.patterns = patterns
        self.reactions = reactions
        self.pressure = pressure
        self.lastStructure = lastStructure
        self.htfTrend = htfTrend
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


def detectEvents(w, swings, confirmDelay):
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
                if ((s.idx + confirmDelay) >= i):
                    break
                if s.isHigh:
                    lastSh = s.price
                else:
                    lastSl = s.price
                si += 1
            c = _arr_get(w.c, i)
            if ((not _is_na(lastSh)) and (c > lastSh)):
                _arr_push(events, Ev(i, _math_round(lastSh, 6), True, (trend == 'up'), 1, i, 0.0, False, NA, NA, NA, False, False, '', NA, False, NA))
                trend = 'up'
                lastSh = NA
            else:
                if ((not _is_na(lastSl)) and (c < lastSl)):
                    _arr_push(events, Ev(i, _math_round(lastSl, 6), False, (trend == 'down'), 1, i, 0.0, False, NA, NA, NA, False, False, '', NA, False, NA))
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
                        c.lo = _math_min(c.lo, s.price)
                        c.hi = _math_max(c.hi, s.price)
                        if s.isHigh:
                            c.highs = (c.highs + 1)
                        else:
                            c.lows = (c.lows + 1)
                        placed = True
                        break
            if (not placed):
                _arr_push(clusters, Cluster(s.price, 1, ((1) if (s.isHigh) else (0)), ((0) if (s.isHigh) else (1)), s.price, s.price))
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
                _arr_push(levels, Lv(price, role, origin, flipped, distancePct, NA, c.count, _math_min(5, c.count), _math_round((price * (1 - tolerance)), 6), _math_round((price * (1 + tolerance)), 6), _math_round(c.lo, 6), _math_round(c.hi, 6), _math_round((((c.hi - c.lo) / price) * 100), 4), 0, 0, 0, NA, NA, 0.0, False, False, '', False, NA, NA))
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


def markInvalidations(w, events, swings):
    n = _arr_size(w.c)
    invalidados = 0
    if (_arr_size(events) > 0):
        for e in _rango(0, (_arr_size(events) - 1)):
            ev = _arr_get(events, e)
            protegido = NA
            if (_arr_size(swings) > 0):
                for si in _rango(0, (_arr_size(swings) - 1)):
                    sw = _arr_get(swings, si)
                    if ((sw.idx < ev.idx) and (sw.isHigh != ev.bullish)):
                        protegido = sw.price
            ev.invalidationPrice = protegido
            ev.invalidated = False
            ev.invalidatedAt = NA
            if ((not _is_na(protegido)) and ((ev.idx + 1) <= (n - 1))):
                for k in _rango((ev.idx + 1), (n - 1)):
                    c = _arr_get(w.c, k)
                    if ((ev.bullish and (c < protegido)) or ((not ev.bullish) and (c > protegido))):
                        ev.invalidated = True
                        ev.invalidatedAt = k
                        invalidados += 1
                        break
    return invalidados


def levelReactions(w, levels, tolerance, maxLevels):
    out = _arr_new()
    n = _arr_size(w.c)
    tope = _math_min(_arr_size(levels), maxLevels)
    if ((n > 0) and (tope > 0)):
        for li in _rango(0, (tope - 1)):
            lv = _arr_get(levels, li)
            if ((not _is_na(lv.price)) and (lv.price > 0)):
                lowBand = (lv.price * (1 - tolerance))
                highBand = (lv.price * (1 + tolerance))
                ancho = _math_max((highBand - lowBand), 1e-09)
                openVisit = False
                openEntry = 0
                openStart = 0
                extHigh = NA
                extLow = NA
                lastSide = 0
                for i in _rango(0, (n - 1)):
                    hi = _arr_get(w.h, i)
                    lo = _arr_get(w.l, i)
                    touching = ((hi >= lowBand) and (lo <= highBand))
                    closeSide = sideOf(_arr_get(w.c, i), lowBand, highBand)
                    if (touching and (not openVisit)):
                        openVisit = True
                        openEntry = lastSide
                        openStart = i
                        extHigh = hi
                        extLow = lo
                    else:
                        if (touching and openVisit):
                            extHigh = _math_max(extHigh, hi)
                            extLow = _math_min(extLow, lo)
                        else:
                            if ((not touching) and openVisit):
                                extremo = ((extLow) if ((openEntry >= 0)) else (extHigh))
                                pen = (((((highBand - extremo) / ancho) * 100)) if ((openEntry >= 0)) else ((((extremo - lowBand) / ancho) * 100)))
                                outcome = (('sinResolver') if ((openEntry == 0)) else ((('rechazo') if ((closeSide == openEntry)) else ((('ruptura') if ((closeSide == (-openEntry))) else ('sinResolver'))))))
                                alcista = ((((False) if ((openEntry < 0)) else (True))) if ((outcome == 'rechazo')) else ((closeSide > 0)))
                                _arr_push(out, Rx(li, lv.price, lv.role, openStart, (i - 1), openEntry, closeSide, outcome, alcista, _math_round(extremo, 6), _math_round(pen, 1)))
                                openVisit = False
                    if (closeSide != 0):
                        lastSide = closeSide
                if openVisit:
                    extremo = ((extLow) if ((openEntry >= 0)) else (extHigh))
                    pen = (((((highBand - extremo) / ancho) * 100)) if ((openEntry >= 0)) else ((((extremo - lowBand) / ancho) * 100)))
                    _arr_push(out, Rx(li, lv.price, lv.role, openStart, (n - 1), openEntry, 0, 'enCurso', False, _math_round(extremo, 6), _math_round(pen, 1)))
    return out


def zonePressure(w, lv, tolerance, atr):
    p = Pressure(False, 0, NA, NA, NA, NA, NA, 0, NA, 'sinDefinir', '')
    n = _arr_size(w.c)
    if ((n > 0) and (not _is_na(lv.price)) and (lv.price > 0)):
        lowBand = (lv.price * (1 - tolerance))
        highBand = (lv.price * (1 + tolerance))
        ancho = _math_max((highBand - lowBand), 1e-09)
        last = (n - 1)
        dentro = ((_arr_get(w.h, last) >= lowBand) and (_arr_get(w.l, last) <= highBand))
        if dentro:
            start = last
            while ((start > 0) and (_arr_get(w.h, (start - 1)) >= lowBand) and (_arr_get(w.l, (start - 1)) <= highBand)):
                start -= 1
            entrada = 0
            j = (start - 1)
            while ((j >= 0) and (entrada == 0)):
                entrada = sideOf(_arr_get(w.c, j), lowBand, highBand)
                j -= 1
            side = ((1) if ((entrada < 0)) else ((((-1)) if ((entrada > 0)) else (0))))
            o = _arr_get(w.o, last)
            h = _arr_get(w.h, last)
            lo = _arr_get(w.l, last)
            c = _arr_get(w.c, last)
            rng = _math_max((h - lo), 1e-09)
            posPct = (((((c - lowBand) / ancho) * 100)) if ((side >= 0)) else ((((highBand - c) / ancho) * 100)))
            wickAgainst = (((((h - _math_max(o, c))) if ((side >= 0)) else ((_math_min(o, c) - lo))) / rng) * 100)
            bodyPct = ((_math_abs((c - o)) / rng) * 100)
            expansion = (((rng / atr)) if ((atr > 0)) else (NA))
            avgV = avgVolume(w, last, VOL_WINDOW)
            volExp = (((_arr_get(w.v, last) / avgV)) if ((avgV > 0)) else (NA))
            barsInside = ((last - start) + 1)
            reasons = ''
            score = 0.0
            if (posPct >= 66):
                score += 25
                reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'cruzandoLaBanda')
            else:
                if (posPct > 33):
                    score += 10
            fuera = (((c > highBand)) if ((side >= 0)) else ((c < lowBand)))
            if fuera:
                score += 20
                reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'cierraFuera')
            if (wickAgainst >= 40):
                score -= 25
                reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'mechaEnContra')
            cuerpoAFavor = (((c > o)) if ((side >= 0)) else ((c < o)))
            if (cuerpoAFavor and (bodyPct >= 60)):
                score += 15
                reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'cuerpoAFavor')
            else:
                if ((not cuerpoAFavor) and (bodyPct >= 60)):
                    score -= 15
                    reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'cuerpoEnContra')
            if ((not _is_na(expansion)) and (expansion >= 1.2)):
                score += 15
                reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'expansion')
            if _is_na(volExp):
                score += 8
            else:
                if (volExp >= 1.3):
                    score += 15
                    reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'volumen')
            if (barsInside >= 5):
                score -= 10
                reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'picoteo')
            if (not _is_na(lv.holdRatePct)):
                if (lv.holdRatePct >= 66):
                    score -= 10
                    reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'nivelQueAguanta')
                else:
                    if (lv.holdRatePct < 40):
                        score += 10
                        reasons = ((reasons + (('') if ((reasons == '')) else (','))) + 'nivelQueNoAguanta')
            score = _math_max(0, _math_min(100, score))
            p = Pressure(True, side, _math_round(posPct, 1), _math_round(wickAgainst, 1), _math_round(bodyPct, 1), ((NA) if (_is_na(expansion)) else (_math_round(expansion, 2))), ((NA) if (_is_na(volExp)) else (_math_round(volExp, 2))), barsInside, score, (('empuje') if ((score >= 60)) else ((('rechazo') if ((score <= 35)) else ('sinDefinir')))), reasons)
    return p


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


def trendOf(w, strength):
    return labelStructure(detectSwings(w, strength))


def candleMetrics(w, i):
    o = _arr_get(w.o, i)
    h = _arr_get(w.h, i)
    lo = _arr_get(w.l, i)
    c = _arr_get(w.c, i)
    body = _math_abs((c - o))
    rng = _math_max((h - lo), 1e-09)
    return Cm(body, rng, (h - _math_max(o, c)), (_math_min(o, c) - lo), (c > o), (c < o), (body / rng))


def isDoji(m):
    return (m.bodyPct <= 0.07)


def isDragonflyDoji(m):
    return ((m.bodyPct <= 0.07) and (m.upper <= (0.05 * m.rng)) and (m.lower >= (0.6 * m.rng)))


def isGravestoneDoji(m):
    return ((m.bodyPct <= 0.07) and (m.lower <= (0.05 * m.rng)) and (m.upper >= (0.6 * m.rng)))


def isLongLeggedDoji(m):
    return (isDoji(m) and (m.upper >= (0.35 * m.rng)) and (m.lower >= (0.35 * m.rng)))


def isHighWave(m):
    return ((m.bodyPct > 0.07) and (m.bodyPct <= 0.25) and (m.upper >= (0.3 * m.rng)) and (m.lower >= (0.3 * m.rng)))


def isHammer(m):
    return ((m.body > 0) and (m.lower >= (1.8 * m.body)) and (m.upper <= (0.4 * m.body)) and (m.bodyPct >= 0.05))


def isShootingStar(m):
    return ((m.body > 0) and (m.upper >= (1.8 * m.body)) and (m.lower <= (0.4 * m.body)) and (m.bodyPct >= 0.05))


def isMarubozu(m):
    return ((m.bodyPct >= 0.85) and (m.upper <= (0.05 * m.rng)) and (m.lower <= (0.05 * m.rng)))


def isSpinningTop(m):
    return ((m.bodyPct > 0.1) and (m.bodyPct < 0.35) and (m.upper > m.body) and (m.lower > m.body))


def isBullishEngulfing(w, p, c):
    po = _arr_get(w.o, p)
    pc = _arr_get(w.c, p)
    co = _arr_get(w.o, c)
    cc = _arr_get(w.c, c)
    return ((pc < po) and (cc > co) and (co <= pc) and (cc >= po) and (_math_abs((cc - co)) > _math_abs((pc - po))))


def isBearishEngulfing(w, p, c):
    po = _arr_get(w.o, p)
    pc = _arr_get(w.c, p)
    co = _arr_get(w.o, c)
    cc = _arr_get(w.c, c)
    return ((pc > po) and (cc < co) and (co >= pc) and (cc <= po) and (_math_abs((cc - co)) > _math_abs((pc - po))))


def isBullishHarami(w, p, c):
    po = _arr_get(w.o, p)
    pc = _arr_get(w.c, p)
    co = _arr_get(w.o, c)
    cc = _arr_get(w.c, c)
    return ((pc < po) and (cc > co) and (_math_max(co, cc) <= po) and (_math_min(co, cc) >= pc) and (_math_abs((cc - co)) < _math_abs((pc - po))))


def isBearishHarami(w, p, c):
    po = _arr_get(w.o, p)
    pc = _arr_get(w.c, p)
    co = _arr_get(w.o, c)
    cc = _arr_get(w.c, c)
    return ((pc > po) and (cc < co) and (_math_max(co, cc) <= pc) and (_math_min(co, cc) >= po) and (_math_abs((cc - co)) < _math_abs((pc - po))))


def isPiercingLine(w, p, c):
    po = _arr_get(w.o, p)
    pc = _arr_get(w.c, p)
    co = _arr_get(w.o, c)
    cc = _arr_get(w.c, c)
    ok = ((pc < po) and (cc > co))
    mid = ((po + pc) / 2)
    return (ok and (co < pc) and (cc > mid) and (cc < po))


def isDarkCloudCover(w, p, c):
    po = _arr_get(w.o, p)
    pc = _arr_get(w.c, p)
    co = _arr_get(w.o, c)
    cc = _arr_get(w.c, c)
    ok = ((pc > po) and (cc < co))
    mid = ((po + pc) / 2)
    return (ok and (co > pc) and (cc > po) and (cc < mid))


def approxEqual(a, b, ref):
    return (_math_abs((a - b)) <= (0.0015 * _math_max(_math_abs(ref), 1e-09)))


def isTweezerBottom(w, p, c):
    return ((_arr_get(w.c, p) < _arr_get(w.o, p)) and (_arr_get(w.c, c) > _arr_get(w.o, c)) and approxEqual(_arr_get(w.l, p), _arr_get(w.l, c), _arr_get(w.l, p)))


def isTweezerTop(w, p, c):
    return ((_arr_get(w.c, p) > _arr_get(w.o, p)) and (_arr_get(w.c, c) < _arr_get(w.o, c)) and approxEqual(_arr_get(w.h, p), _arr_get(w.h, c), _arr_get(w.h, p)))


def isBullishKicker(w, p, c):
    return ((_arr_get(w.c, p) < _arr_get(w.o, p)) and (_arr_get(w.c, c) > _arr_get(w.o, c)) and (_arr_get(w.o, c) > _arr_get(w.o, p)))


def isBearishKicker(w, p, c):
    return ((_arr_get(w.c, p) > _arr_get(w.o, p)) and (_arr_get(w.c, c) < _arr_get(w.o, c)) and (_arr_get(w.o, c) < _arr_get(w.o, p)))


def isMorningStar(w, a, b, c):
    ao = _arr_get(w.o, a)
    ac = _arr_get(w.c, a)
    bo = _arr_get(w.o, b)
    bc = _arr_get(w.c, b)
    co = _arr_get(w.o, c)
    cc = _arr_get(w.c, c)
    body1 = _math_abs((ac - ao))
    body2 = _math_abs((bc - bo))
    mid1 = ((ao + ac) / 2)
    return ((ac < ao) and (body2 < (0.5 * body1)) and (_math_max(bo, bc) < ac) and (cc > co) and (cc > mid1))


def isEveningStar(w, a, b, c):
    ao = _arr_get(w.o, a)
    ac = _arr_get(w.c, a)
    bo = _arr_get(w.o, b)
    bc = _arr_get(w.c, b)
    co = _arr_get(w.o, c)
    cc = _arr_get(w.c, c)
    body1 = _math_abs((ac - ao))
    body2 = _math_abs((bc - bo))
    mid1 = ((ao + ac) / 2)
    return ((ac > ao) and (body2 < (0.5 * body1)) and (_math_min(bo, bc) > ac) and (cc < co) and (cc < mid1))


def isMorningDojiStar(w, a, b, c):
    ao = _arr_get(w.o, a)
    ac = _arr_get(w.c, a)
    mid1 = ((ao + ac) / 2)
    return ((ac < ao) and isDoji(candleMetrics(w, b)) and (_math_max(_arr_get(w.o, b), _arr_get(w.c, b)) < ac) and (_arr_get(w.c, c) > _arr_get(w.o, c)) and (_arr_get(w.c, c) > mid1))


def isEveningDojiStar(w, a, b, c):
    ao = _arr_get(w.o, a)
    ac = _arr_get(w.c, a)
    mid1 = ((ao + ac) / 2)
    return ((ac > ao) and isDoji(candleMetrics(w, b)) and (_math_min(_arr_get(w.o, b), _arr_get(w.c, b)) > ac) and (_arr_get(w.c, c) < _arr_get(w.o, c)) and (_arr_get(w.c, c) < mid1))


def longBodyCloseNearHigh(m):
    return ((m.bodyPct >= 0.55) and (m.upper <= (0.25 * m.rng)))


def longBodyCloseNearLow(m):
    return ((m.bodyPct >= 0.55) and (m.lower <= (0.25 * m.rng)))


def isThreeWhiteSoldiers(w, a, b, c):
    ao = _arr_get(w.o, a)
    ac = _arr_get(w.c, a)
    bo = _arr_get(w.o, b)
    bc = _arr_get(w.c, b)
    co = _arr_get(w.o, c)
    cc = _arr_get(w.c, c)
    alcistas = ((ac > ao) and (bc > bo) and (cc > co))
    progresa = ((bc > ac) and (cc > bc))
    ordenado = ((ao < bo) and (bo < ac) and (bo < co) and (co < bc))
    return (alcistas and progresa and ordenado and longBodyCloseNearHigh(candleMetrics(w, a)) and longBodyCloseNearHigh(candleMetrics(w, b)) and longBodyCloseNearHigh(candleMetrics(w, c)))


def isThreeBlackCrows(w, a, b, c):
    ao = _arr_get(w.o, a)
    ac = _arr_get(w.c, a)
    bo = _arr_get(w.o, b)
    bc = _arr_get(w.c, b)
    co = _arr_get(w.o, c)
    cc = _arr_get(w.c, c)
    bajistas = ((ac < ao) and (bc < bo) and (cc < co))
    progresa = ((bc < ac) and (cc < bc))
    ordenado = ((ac < bo) and (bo < ao) and (bc < co) and (co < bo))
    return (bajistas and progresa and ordenado and longBodyCloseNearLow(candleMetrics(w, a)) and longBodyCloseNearLow(candleMetrics(w, b)) and longBodyCloseNearLow(candleMetrics(w, c)))


def isThreeInsideUp(w, a, b, c):
    return (isBullishHarami(w, a, b) and (_arr_get(w.c, c) > _arr_get(w.o, c)) and (_arr_get(w.c, c) > _arr_get(w.o, a)))


def isThreeInsideDown(w, a, b, c):
    return (isBearishHarami(w, a, b) and (_arr_get(w.c, c) < _arr_get(w.o, c)) and (_arr_get(w.c, c) < _arr_get(w.o, a)))


def trendBefore(w, i, lookback):
    out = 'flat'
    j = (i - 1)
    k = _math_max(0, (i - lookback))
    if (j > k):
        total = 0.0
        for x in _rango(k, (i - 1)):
            total += _math_max((_arr_get(w.h, x) - _arr_get(w.l, x)), 0.0)
        avgRange = (total / _math_max((i - k), 1))
        if (avgRange > 0):
            move = (_arr_get(w.c, j) - _arr_get(w.c, k))
            out = (('up') if ((move >= avgRange)) else ((('down') if ((move <= (-avgRange))) else ('flat'))))
    return out


def patternMeta(id):
    if id == 'hammer':
        return PatMeta('bullish', 'reversal', 60, 26, 1, 'wicks')
    elif id == 'hanging-man':
        return PatMeta('bearish', 'reversal', 59, 51, 1, 'wicks')
    elif id == 'inverted-hammer':
        return PatMeta('bullish', 'reversal', 65, 14, 1, 'wicks')
    elif id == 'shooting-star':
        return PatMeta('bearish', 'reversal', 59, 31, 1, 'wicks')
    elif id == 'doji':
        return PatMeta('neutral', 'indecision', 50, 75, 1, 'body')
    elif id == 'dragonfly-doji':
        return PatMeta('bullish', 'reversal', 50, 72, 1, 'both')
    elif id == 'gravestone-doji':
        return PatMeta('bearish', 'reversal', 51, 77, 1, 'both')
    elif id == 'long-legged-doji':
        return PatMeta('neutral', 'indecision', 51, 80, 1, 'both')
    elif id == 'high-wave':
        return PatMeta('neutral', 'indecision', 50, 82, 1, 'both')
    elif id == 'bullish-marubozu':
        return PatMeta('bullish', 'continuation', 56, 58, 1, 'both')
    elif id == 'bearish-marubozu':
        return PatMeta('bearish', 'continuation', 55, 60, 1, 'both')
    elif id == 'spinning-top':
        return PatMeta('neutral', 'indecision', 50, 78, 1, 'both')
    elif id == 'bullish-engulfing':
        return PatMeta('bullish', 'reversal', 63, 22, 2, 'body')
    elif id == 'bearish-engulfing':
        return PatMeta('bearish', 'reversal', 79, 9, 2, 'body')
    elif id == 'bullish-harami':
        return PatMeta('bullish', 'reversal', 53, 68, 2, 'body')
    elif id == 'bearish-harami':
        return PatMeta('bearish', 'reversal', 53, 65, 2, 'body')
    elif id == 'piercing-line':
        return PatMeta('bullish', 'reversal', 64, 19, 2, 'body')
    elif id == 'dark-cloud-cover':
        return PatMeta('bearish', 'reversal', 60, 30, 2, 'body')
    elif id == 'tweezer-bottom':
        return PatMeta('bullish', 'reversal', 56, 56, 2, 'wicks')
    elif id == 'tweezer-top':
        return PatMeta('bearish', 'reversal', 55, 57, 2, 'wicks')
    elif id == 'bullish-kicker':
        return PatMeta('bullish', 'reversal', 68, 7, 2, 'both')
    elif id == 'bearish-kicker':
        return PatMeta('bearish', 'reversal', 67, 8, 2, 'both')
    elif id == 'morning-star':
        return PatMeta('bullish', 'reversal', 78, 6, 3, 'body')
    elif id == 'evening-star':
        return PatMeta('bearish', 'reversal', 72, 11, 3, 'body')
    elif id == 'morning-doji-star':
        return PatMeta('bullish', 'reversal', 76, 10, 3, 'both')
    elif id == 'evening-doji-star':
        return PatMeta('bearish', 'reversal', 71, 13, 3, 'both')
    elif id == 'three-white-soldiers':
        return PatMeta('bullish', 'reversal', 82, 3, 3, 'both')
    elif id == 'three-black-crows':
        return PatMeta('bearish', 'reversal', 78, 5, 3, 'both')
    elif id == 'three-inside-up':
        return PatMeta('bullish', 'reversal', 65, 16, 3, 'body')
    elif id == 'three-inside-down':
        return PatMeta('bearish', 'reversal', 60, 28, 3, 'body')
    else:
        return PatMeta('neutral', 'indecision', 50, 99, 1, 'body')


def detectAtIndex(w, i):
    hits = _arr_new()
    m = candleMetrics(w, i)
    trend = trendBefore(w, i, 5)
    if isDragonflyDoji(m):
        _arr_push(hits, 'dragonfly-doji')
    else:
        if isGravestoneDoji(m):
            _arr_push(hits, 'gravestone-doji')
        else:
            if isLongLeggedDoji(m):
                _arr_push(hits, 'long-legged-doji')
            else:
                if isDoji(m):
                    _arr_push(hits, 'doji')
    if isHammer(m):
        _arr_push(hits, (('hanging-man') if ((trend == 'up')) else ('hammer')))
    if isShootingStar(m):
        _arr_push(hits, (('inverted-hammer') if ((trend == 'down')) else ('shooting-star')))
    if isMarubozu(m):
        _arr_push(hits, (('bullish-marubozu') if (m.isBull) else ('bearish-marubozu')))
    if (isHighWave(m) and (_arr_size(hits) == 0)):
        _arr_push(hits, 'high-wave')
    if (isSpinningTop(m) and (not _arr_includes(hits, 'doji')) and (not _arr_includes(hits, 'high-wave'))):
        _arr_push(hits, 'spinning-top')
    if (i >= 1):
        if (isBullishKicker(w, (i - 1), i) and isMarubozu(m)):
            _arr_push(hits, 'bullish-kicker')
        else:
            if isBullishEngulfing(w, (i - 1), i):
                _arr_push(hits, 'bullish-engulfing')
            else:
                if (isBearishKicker(w, (i - 1), i) and isMarubozu(m)):
                    _arr_push(hits, 'bearish-kicker')
                else:
                    if isBearishEngulfing(w, (i - 1), i):
                        _arr_push(hits, 'bearish-engulfing')
        if isBullishHarami(w, (i - 1), i):
            _arr_push(hits, 'bullish-harami')
        else:
            if isBearishHarami(w, (i - 1), i):
                _arr_push(hits, 'bearish-harami')
        if isPiercingLine(w, (i - 1), i):
            _arr_push(hits, 'piercing-line')
        else:
            if isDarkCloudCover(w, (i - 1), i):
                _arr_push(hits, 'dark-cloud-cover')
        if isTweezerBottom(w, (i - 1), i):
            _arr_push(hits, 'tweezer-bottom')
        else:
            if isTweezerTop(w, (i - 1), i):
                _arr_push(hits, 'tweezer-top')
    if (i >= 2):
        if isMorningDojiStar(w, (i - 2), (i - 1), i):
            _arr_push(hits, 'morning-doji-star')
        else:
            if isMorningStar(w, (i - 2), (i - 1), i):
                _arr_push(hits, 'morning-star')
            else:
                if isEveningDojiStar(w, (i - 2), (i - 1), i):
                    _arr_push(hits, 'evening-doji-star')
                else:
                    if isEveningStar(w, (i - 2), (i - 1), i):
                        _arr_push(hits, 'evening-star')
        if isThreeWhiteSoldiers(w, (i - 2), (i - 1), i):
            _arr_push(hits, 'three-white-soldiers')
        else:
            if isThreeBlackCrows(w, (i - 2), (i - 1), i):
                _arr_push(hits, 'three-black-crows')
        if isThreeInsideUp(w, (i - 2), (i - 1), i):
            _arr_push(hits, 'three-inside-up')
        else:
            if isThreeInsideDown(w, (i - 2), (i - 1), i):
                _arr_push(hits, 'three-inside-down')
    out = _arr_new()
    if (_arr_size(hits) > 0):
        for k in _rango(0, (_arr_size(hits) - 1)):
            h = _arr_get(hits, k)
            if (not _arr_includes(out, h)):
                _arr_push(out, h)
    return out


def detectPatterns(w):
    out = _arr_new()
    n = _arr_size(w.c)
    if (n > 0):
        for i in _rango(0, (n - 1)):
            ids = detectAtIndex(w, i)
            if (_arr_size(ids) > 0):
                m = candleMetrics(w, i)
                for k in _rango(0, (_arr_size(ids) - 1)):
                    id = _arr_get(ids, k)
                    meta = patternMeta(id)
                    _arr_push(out, Pat(i, _math_max(0, (i - (meta.candles - 1))), id, meta.kind, meta.behavior, meta.rate, meta.rank, meta.candles, meta.basis, _math_round((m.bodyPct * 100), 1), _math_round(((m.upper / m.rng) * 100), 1), _math_round(((m.lower / m.rng) * 100), 1), NA, ''))
    return out


def markPatternsAtLevels(w, pats, levels):
    marcados = 0
    if ((_arr_size(pats) > 0) and (_arr_size(levels) > 0)):
        for pi in _rango(0, (_arr_size(pats) - 1)):
            p = _arr_get(pats, pi)
            hi = _arr_get(w.h, p.idx)
            lo = _arr_get(w.l, p.idx)
            mejor = NA
            rol = ''
            for li in _rango(0, (_arr_size(levels) - 1)):
                lv = _arr_get(levels, li)
                if (lv.confirmed and (hi >= lv.zoneLow) and (lo <= lv.zoneHigh)):
                    if (_is_na(mejor) or (_math_abs((lv.price - _arr_get(w.c, p.idx))) < _math_abs((mejor - _arr_get(w.c, p.idx))))):
                        mejor = lv.price
                        rol = lv.role
            if (not _is_na(mejor)):
                p.levelPrice = mejor
                p.levelRole = rol
                marcados += 1
    return marcados


def runScan(w, strength, tolOverride, minTouches, htfLevels, htfChecked, htfTrend, confirmDelay, wantPatterns, wantBreakouts, clusterMult, visitMult):
    n = _arr_size(w.c)
    tooShort = (n < ((2 * strength) + 1))
    reference = ((_arr_get(w.c, (n - 1))) if (((n > 0) and (not tooShort))) else (NA))
    tol = ((NA) if (tooShort) else (((autoTolerance(w)) if (_is_na(tolOverride)) else (tolOverride))))
    atr = ((NA) if (tooShort) else (avgTrueRange(w, 14)))
    swings = detectSwings(w, strength)
    trend = labelStructure(swings)
    events = annotateEvents(w, detectEvents(w, swings, confirmDelay), atr)
    events = clusterRepeatedEvents(events, tol)
    allLevels = detectSrLevels(swings, (tol * clusterMult), minTouches, reference)
    allLevels = sortLevels(allLevels, ((not _is_na(reference)) and (reference > 0)))
    if ((atr > 0) and (_arr_size(allLevels) > 0)):
        for i in _rango(0, (_arr_size(allLevels) - 1)):
            lv = _arr_get(allLevels, i)
            lv.distanceAtr = _math_round((_math_abs((lv.price - reference)) / atr), 2)
    levels = _arr_new()
    if (_arr_size(allLevels) > 0):
        for i in _rango(0, (_math_min(_arr_size(allLevels), MAX_ANALYSED_LEVELS) - 1)):
            _arr_push(levels, _arr_get(allLevels, i))
    levels = annotateLevels(w, levels, (tol * visitMult))
    fvgs = ((_arr_new()) if (tooShort) else (detectFvgs(w)))
    breakouts = ((detectBreakouts(w, levels, strength)) if (wantBreakouts) else (_arr_new()))
    patterns = ((detectPatterns(w)) if (wantPatterns) else (_arr_new()))
    patternsAtLevel = ((markPatternsAtLevels(w, patterns, levels)) if (wantPatterns) else (NA))
    invalidadas = markInvalidations(w, events, swings)
    reactions = levelReactions(w, levels, (tol * visitMult), MAX_ANALYSED_LEVELS)
    rechazos = 0
    rupturasZona = 0
    if (_arr_size(reactions) > 0):
        for i in _rango(0, (_arr_size(reactions) - 1)):
            rx = _arr_get(reactions, i)
            if (rx.outcome == 'rechazo'):
                rechazos += 1
            else:
                if (rx.outcome == 'ruptura'):
                    rupturasZona += 1
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
    pressure = Pressure(False, 0, NA, NA, NA, NA, NA, 0, NA, 'sinDefinir', '')
    if (_arr_size(levels) > 0):
        for i in _rango(0, (_arr_size(levels) - 1)):
            lv = _arr_get(levels, i)
            if (lv.inPlay and (not pressure.active)):
                pressure = zonePressure(w, lv, (tol * visitMult), atr)
    lastStructure = ((_arr_get(events, (_arr_size(events) - 1))) if ((_arr_size(events) > 0)) else (NA))
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
    cBullishPat = 0
    cBearishPat = 0
    if (_arr_size(patterns) > 0):
        for i in _rango(0, (_arr_size(patterns) - 1)):
            pat = _arr_get(patterns, i)
            if (pat.kind == 'bullish'):
                cBullishPat += 1
            else:
                if (pat.kind == 'bearish'):
                    cBearishPat += 1
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
    counts = Counts(_arr_size(swings), cBos, cChoch, cConfirmedEvents, cRepeated, _arr_size(allLevels), cRes, cSup, cFlipped, cConfirmedLevels, confluent, ((_arr_size(patterns)) if (wantPatterns) else (NA)), ((cBullishPat) if (wantPatterns) else (NA)), ((cBearishPat) if (wantPatterns) else (NA)), patternsAtLevel, invalidadas, rechazos, rupturasZona, cFvgOpen, cFvgSession, ((cBreakouts) if (wantBreakouts) else (NA)), ((cFakeouts) if (wantBreakouts) else (NA)))
    return Scan(n, reference, tol, atr, trend, swings, events, allLevels, levels, fvgs, breakouts, patterns, reactions, pressure, lastStructure, htfTrend, nearestRes, nearestSup, ctx, counts)

import json as _json
import urllib.request, urllib.error, urllib.parse

class Response:
    def __init__(self, status_code, text, headers):
        self.status_code = status_code
        self.text = text
        self.headers = headers
    def json(self):
        return _json.loads(self.text) if self.text else {}

class Session:
    def __init__(self):
        self.headers = {}
    def get(self, url, **kwargs):
        return request('GET', url, headers=self.headers, **kwargs)
    def post(self, url, **kwargs):
        return request('POST', url, headers=self.headers, **kwargs)

def request(method, url, json=None, data=None, headers=None, params=None, timeout=30, **kwargs):
    hdrs = dict(headers or {})
    if params:
        qs = urllib.parse.urlencode(params)
        url = f"{url}{'&' if '?' in url else '?'}{qs}"
    body = None
    if json is not None:
        body = _json.dumps(json).encode()
        hdrs.setdefault('Content-Type','application/json')
    elif data is not None:
        body = data.encode() if isinstance(data,str) else data
    req=urllib.request.Request(url=url,data=body,headers=hdrs,method=method.upper())
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return Response(resp.getcode(), resp.read().decode('utf-8','replace'), dict(resp.headers))
    except urllib.error.HTTPError as e:
        text=e.read().decode('utf-8','replace') if e.fp else ''
        return Response(e.code,text,dict(e.headers or {}))

def get(url, **kwargs): return request('GET', url, **kwargs)
def post(url, **kwargs): return request('POST', url, **kwargs)
def put(url, **kwargs): return request('PUT', url, **kwargs)
def delete(url, **kwargs): return request('DELETE', url, **kwargs)

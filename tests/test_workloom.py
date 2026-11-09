import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import server


class WorkloomTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        server.DB = Path(cls.temp.name) / 'test.db'
        server.init_db()
        cls.http = ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        threading.Thread(target=cls.http.serve_forever, daemon=True).start()
        cls.base = 'http://127.0.0.1:' + str(cls.http.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.temp.cleanup()

    def request(self, path, body=None, role='pm', origin=None):
        headers = {'Content-Type':'application/json', 'X-Demo-Role':role}
        if origin:
            headers['Origin'] = origin
        req = urllib.request.Request(self.base + path, data=None if body is None else json.dumps(body).encode(), headers=headers)
        try:
            with urllib.request.urlopen(req) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as error:
            return error.code, json.load(error)

    def test_private_document_never_retrieved_by_other_role(self):
        _, added = self.request('/api/documents', {'title':'权限专属测试', 'content':'星河秘密口令不得公开，只有产品经理能查看。'})
        _, qa = self.request('/api/state', role='qa')
        self.assertNotIn(added['id'], [d['id'] for d in qa['documents']])
        _, result = self.request('/api/chat', {'question':'星河秘密口令'}, role='qa')
        self.assertEqual(result['citations'], [])
        self.assertNotIn('星河秘密口令不得公开', result['answer'])
        self.assertEqual(self.request('/api/documents/delete', {'id':added['id']}, role='qa')[0], 404)
        self.assertEqual(self.request('/api/documents/delete', {'id':added['id']})[0], 200)

    def test_role_seed_access(self):
        _, state = self.request('/api/state', role='dev')
        self.assertIn('接口设计规范', [d['title'] for d in state['documents']])
        self.assertNotIn('测试与验收清单', [d['title'] for d in state['documents']])

    def test_custom_work_identity_and_isolated_knowledge(self):
        code, created = self.request('/api/roles', {'name':'采购专员', 'employee':'小张', 'focus':'供应商材料与采购流程核对', 'steps':'确认采购需求\n核对供应商材料\n整理人工审核清单'})
        self.assertEqual(code, 201)
        custom = created['id']
        _, state = self.request('/api/state', role=custom)
        self.assertEqual(state['roles'][custom]['name'], '采购专员')
        self.assertEqual(state['profile']['version'], 1)
        _, added = self.request('/api/documents', {'title':'采购专属准则','content':'青禾采购需要经过两级人工审核。'}, role=custom)
        _, run = self.request('/api/chat', {'question':'青禾采购审核要求'}, role=custom)
        self.assertIn(added['id'], [r['id'] for r in run['citations']])
        self.assertIn('确认采购需求', run['answer'])
        _, other = self.request('/api/state', role='finance')
        self.assertNotIn(added['id'], [r['id'] for r in other['documents']])
        server.init_db()
        _, restored = self.request('/api/state', role=custom)
        self.assertEqual(restored['roles'][custom]['focus'], '供应商材料与采购流程核对')

    def test_custom_role_validation(self):
        self.assertEqual(self.request('/api/roles', {'name':'','employee':'a','focus':'b','steps':'c'})[0], 400)
        self.assertEqual(self.request('/api/roles', {'name':'采购','employee':'a','focus':'b','steps':'\n'.join(['步骤']*11)})[0], 400)

    def test_profile_version_and_run_persistence(self):
        _, before = self.request('/api/state')
        _, result = self.request('/api/profile', {'name':'验收助手', 'instructions':'先输出边界条件。'})
        self.assertEqual(result['version'], before['profile']['version'] + 1)
        _, run = self.request('/api/chat', {'question':'发布回滚规范是什么？'})
        self.assertEqual(run['mode'], 'offline')
        self.assertTrue(run['citations'])
        self.assertIn('先输出边界条件', run['answer'])
        _, after = self.request('/api/state')
        self.assertIn(run['id'], [r['id'] for r in after['runs']])
        _, other = self.request('/api/state', role='qa')
        self.assertNotIn(run['id'], [r['id'] for r in other['runs']])

    def test_feedback_run_ownership(self):
        _, run = self.request('/api/chat', {'question':'需求管理手册'})
        self.assertEqual(self.request('/api/feedback', {'run_id':run['id'], 'rating':1}, role='qa')[0], 404)
        self.assertEqual(self.request('/api/feedback', {'run_id':run['id'], 'rating':-1, 'correction':'补充异常流程'})[0], 200)

    def test_untrusted_input_and_cross_origin(self):
        self.assertEqual(self.request('/api/chat', {'question':''})[0], 400)
        self.assertEqual(self.request('/api/chat', {'question':'a'*3001})[0], 400)
        self.assertEqual(self.request('/api/chat', {'question':'需求'}, role='admin')[0], 400)
        self.assertEqual(self.request('/api/chat', {'question':'需求'}, origin='https://untrusted.example')[0], 403)
        self.assertEqual(self.request('/api/documents', {'title':'x', 'content':55})[0], 400)

    def test_live_provider_contract(self):
        captured = {}
        class Model(BaseHTTPRequestHandler):
            def do_POST(self):
                captured.update(json.loads(self.rfile.read(int(self.headers['Content-Length']))))
                raw = json.dumps({'choices':[{'message':{'content':'发布前先验收。[1]'}}]}).encode()
                self.send_response(200)
                self.end_headers()
                self.wfile.write(raw)
            def log_message(self, *args):
                pass
        mock = ThreadingHTTPServer(('127.0.0.1', 0), Model)
        threading.Thread(target=mock.serve_forever, daemon=True).start()
        old = dict(os.environ)
        try:
            os.environ['LLM_BASE_URL'] = f'http://127.0.0.1:{mock.server_port}/v1'
            os.environ['LLM_MODEL'] = 'test-model'
            _, run = self.request('/api/chat', {'question':'发布验收'})
            self.assertEqual(run['mode'], 'live')
            self.assertEqual(captured['model'], 'test-model')
            self.assertIn('<knowledge>', captured['messages'][0]['content'])
            self.assertEqual(captured['messages'][1]['content'], '发布验收')
        finally:
            os.environ.clear()
            os.environ.update(old)
            mock.shutdown()
            mock.server_close()


if __name__ == '__main__':
    unittest.main()

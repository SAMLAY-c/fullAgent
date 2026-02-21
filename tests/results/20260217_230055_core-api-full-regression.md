# Regression Result Node

- topic: `core-api-full-regression`
- mark_time: `2026-02-17 23:00:55`
- mark_file: `tests/results/20260217_230055_core-api-full-regression.md`
- environment: `http://localhost:3000`

## Result Node
```json
{
  "topic": "core-api-full-regression",
  "mark_time": "2026-02-17 23:00:55",
  "tests": [
    { "name": "tests/verify/auth-verify.js", "status": "PASS", "exit_code": 0 },
    { "name": "tests/verify/bot-api.test.js", "status": "PASS", "exit_code": 0 },
    { "name": "tests/verify/bots-verify.js", "status": "PASS", "exit_code": 0 },
    { "name": "tests/verify/chat-api.test.js", "status": "PASS", "exit_code": 0 }
  ],
  "summary": {
    "total": 4,
    "passed": 4,
    "failed": 0
  }
}
```

## Notes
- auth refresh flow fixed and verified.
- bot create validation now returns `400` when `name/type/scene` missing.
- admin frontend now uses real bot APIs.

# 店家推薦 Worker

訪客從 `/stores/report/` 使用表單，透過 `POST /api/reports` 送出推薦並驗證 Turnstile。

## 管理 API

管理請求都使用 `Authorization: Bearer <token>`。缺少或不符合的 token 回傳 401 JSON。

| 方法與路徑 | 用途 |
| --- | --- |
| `GET /api/reports/{status}` | 依 `pending`、`accepted` 或 `dismissed` 查詢。用 `?page=2` 換頁。 |
| `PATCH /api/reports` | 以 JSON 傳入 `id`、`status` 與選填的 `verifiedReference`。 |
| `GET /api/reports/{id}/photo` | 讀取待審照片。 |
| `DELETE /api/reports/{id}/photo` | 刪除已審閱的照片。204 表示已清除，202 表示已排定重試。 |

```sh
curl -H "Authorization: Bearer $REPORTS_ADMIN_TOKEN" \
  'https://minicourse.dev/api/reports/pending'

curl -X PATCH -H "Authorization: Bearer $REPORTS_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"id":"<report-id>","status":"accepted","verifiedReference":"已查證的地址或連結"}' \
  'https://minicourse.dev/api/reports'

curl -X DELETE -H "Authorization: Bearer $REPORTS_ADMIN_TOKEN" \
  'https://minicourse.dev/api/reports/<report-id>/photo'
```

每日照片配額以台灣時間計算，預設為 100 次寫入及 100 MB，單張上限 1 MB。已刪除的照片釋放容量，當日用量紀錄保留。

## 驗證與部署

在網站 repo 根目錄，以 Node.js 24 或更新版本執行 `node --test workers/reports/index.test.js`。測試使用記憶體 SQLite 和 R2、Turnstile 測試替身。

1. 建立 `places-store-reports` D1 並套用 `migrations/0001_reports.sql`。建立 Standard 私有 bucket `places-store-report-photos`。
2. 正式表單使用 minicourse.dev 的公開 Turnstile site key。本機測試可用 `PUBLIC_STORE_REPORT_TURNSTILE_SITE_KEY` 指定測試用 site key。在 Worker Secret `TURNSTILE_SECRET` 設定正式 widget 密鑰。
3. 以安全隨機來源產生管理 token，存入呼叫者的密鑰儲存。將它的 SHA-256 小寫十六進位摘要存入 Worker Secret `REPORTS_ADMIN_TOKEN_SHA256`。
4. 設定 `POST /api/reports` 的 WAF 限流。從此目錄執行 `cf deploy --mode production`。確認正式 API 與表單都通過驗證後發布網站入口。

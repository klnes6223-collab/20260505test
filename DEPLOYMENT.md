# GitHub Actions 自動部署指南

本專案已配置 GitHub Actions 工作流，可以自動部署到 Google Cloud Run。

## 準備工作

1. **Google Cloud 專案**：你需要一個 Google Cloud 專案。
2. **服務帳號**：在 Google Cloud 控制台創建一個具有以下權限的服務帳號：
   - `Cloud Run Admin`
   - `Storage Admin` (用於上傳 Docker 鏡像)
   - `Service Account User`
3. **金鑰**：為該服務帳號創建一個 JSON 格式的金鑰。

## 設定 GitHub Secrets

請在 GitHub 儲存庫的 **Settings > Secrets and variables > Actions** 中添加以下 Secrets：

| Secret 名稱 | 內容說明 |
| :--- | :--- |
| `GCP_PROJECT_ID` | 你的 Google Cloud 專案 ID |
| `GCP_SA_KEY` | 服務帳號的 JSON 金鑰內容 |
| `GEMINI_API_KEY` | 你的 Gemini API 金鑰 |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `APP_URL` | 部署後的應用程式網址 (例如 `https://...-run.app`) |

## 部署流程

每當你推送到 `main` 分支時，GitHub Actions 會自動執行：
1. 檢出代碼。
2. 構建 Docker 鏡像並推送到 Google Container Registry。
3. 將新版本部署到 Cloud Run。

## 注意事項

- 本應用程式使用 **3000** 端口。
- 如果你的 Cloud Run 服務名稱或區域不同，請修改 `.github/workflows/deploy.yml` 中的環境變數。

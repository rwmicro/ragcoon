import { NextResponse } from "next/server"
import {
  APP_NAME,
  APP_DOMAIN,
  NON_AUTH_DAILY_MESSAGE_LIMIT,
  AUTH_DAILY_MESSAGE_LIMIT,
  DAILY_FILE_UPLOAD_LIMIT,
  MODEL_DEFAULT,
  FREE_MODELS_IDS,
  NON_AUTH_ALLOWED_MODELS,
} from "@/lib/config"

export async function GET() {
  // Check database type using same logic as other APIs
  const isSqliteEnabled = process.env.DATABASE_TYPE === 'sqlite' || process.env.NEXT_PUBLIC_DATABASE_TYPE === 'sqlite'
  
  const config = {
    appName: APP_NAME,
    appDomain: APP_DOMAIN,
    database: {
      type: isSqliteEnabled ? 'sqlite' : 'supabase'
    },
    limits: {
      nonAuthDailyMessages: NON_AUTH_DAILY_MESSAGE_LIMIT,
      authDailyMessages: AUTH_DAILY_MESSAGE_LIMIT,
      dailyFileUploads: DAILY_FILE_UPLOAD_LIMIT,
    },
    models: {
      default: MODEL_DEFAULT,
      freeModels: FREE_MODELS_IDS,
      nonAuthAllowed: NON_AUTH_ALLOWED_MODELS,
    },
  }

  return NextResponse.json(config)
}
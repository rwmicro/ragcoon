import { NextResponse } from "next/server"
import {
  APP_NAME,
  APP_DOMAIN,
  MODEL_DEFAULT,
  LOCAL_ONLY_MODE,
} from "@/lib/config"

export async function GET() {
  const config = {
    appName: APP_NAME,
    appDomain: APP_DOMAIN,
    localOnlyMode: LOCAL_ONLY_MODE,
    database: process.env.DATABASE_TYPE || process.env.NEXT_PUBLIC_DATABASE_TYPE,
    models: {
      default: MODEL_DEFAULT,
    },
  }

  return NextResponse.json(config)
}

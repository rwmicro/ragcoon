<div align="center">
  <img src='./public/logo.jpg' height='100' width='100' style='border-radius: 15px' />
  <h1>Ragcoon</h1>
  <p>A modern chat interface with RAG (Retrieval Augmented Generation) capabilities</p>
</div>

## Features

- **RAG Integration** — Upload documents (PDF, text) and chat with your knowledge base via a Python RAG backend
- **Smart Chunking** — Optimized document processing with semantic and hybrid chunking
- **Multi-provider LLM** — Ollama, LM Studio (both local) and Hugging Face Inference API models out of the box. Thinking models (Qwen3, DeepSeek-R1, GPT-OSS…) have their reasoning rendered in a dedicated, collapsible UI.
- **Web Search** — Optional real-time web search via [Tavily](https://tavily.com) (toggle per message)
- **MCP Tools** — Connect any [Model Context Protocol](https://modelcontextprotocol.io) server to extend the model with external tools
- **Voice Mode** — Real-time voice conversations with TTS/STT support
- **Modern UI** — Clean, responsive interface built with Next.js and React

## Running with Docker

Copy the example environment file and fill in your API keys, then start the app:

```sh
cp .env.example .env
# edit .env with your keys (see Environment variables below)
docker compose up --build
```

The app will be available at <http://localhost:3000>. SQLite data is persisted in a named Docker volume (`ragcoon_data`). By default the container expects Ollama, LM Studio and the RAG backend to run on the host machine; override `OLLAMA_BASE_URL`, `LMSTUDIO_BASE_URL` and `NEXT_PUBLIC_RAG_API_URL` in `.env` if they live elsewhere.

> **Note – host services must listen on `0.0.0.0`**
>
> On Linux, Docker containers reach the host via a gateway bridge, not via
> `127.0.0.1`. If Ollama (or any other API) is bound to the loopback interface
> only, the container will not be able to connect even though the service is
> running on the same machine.
>
> To make Ollama reachable from the container, start it with:
> ```sh
> OLLAMA_HOST=0.0.0.0 ollama serve
> ```
> Or set it permanently in the systemd service:
> ```sh
> sudo systemctl edit ollama
> # add :
> # Environment="OLLAMA_HOST=0.0.0.0"
> sudo systemctl restart ollama
> ```
>
> For **LM Studio**, open the app and enable *Developer → Settings → Serve on
> local network* (binds the server to `0.0.0.0:1234`). Make sure the host
> firewall lets the Docker bridge reach port `1234`.
>
> Apply the same principle to any other local API (RAG backend, etc.) that the
> container needs to reach.

## Running locally (without Docker)

```sh
bun install
bun dev
```

The app starts at <http://localhost:3000>. Make sure Ollama and/or LM Studio are running (plus the RAG backend if you want RAG models) before opening the interface. Detected models appear automatically in the picker — no manual configuration required.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | No | Ollama API URL. Defaults to `localhost:11434` (or `host.docker.internal:11434` in Docker) |
| `LMSTUDIO_BASE_URL` | No | LM Studio API URL (OpenAI-compatible `/v1`). Defaults to `0.0.0.0:1234` (or `host.docker.internal:1234` in Docker) |
| `NEXT_PUBLIC_RAG_API_URL` | No | RAG backend URL. Defaults to `localhost:8001` (or `host.docker.internal:8001` in Docker) |
| `TAVILY_API_KEY` | No | Enables the web search toggle. Get a free key at [tavily.com](https://tavily.com) |
| `HF_API_KEY` / `NEXT_PUBLIC_HF_API_KEY` | No | Hugging Face Inference API key for HF-hosted models |
| `NEXT_PUBLIC_VOICE_API_URL` | No | Voice API endpoint for TTS/STT support |

## MCP Tools

Ragcoon supports [Model Context Protocol](https://modelcontextprotocol.io) servers. Any MCP-compatible tool server (filesystem, browser, databases, …) can be connected via **Settings → MCP**.

Each server is defined by a command and optional arguments, e.g.:

| Name | Command | Args |
|---|---|---|
| filesystem | `npx` | `-y @modelcontextprotocol/server-filesystem /tmp` |
| brave-search | `npx` | `-y @modelcontextprotocol/server-brave-search` |

Servers can be enabled/disabled per-toggle without removing them. The tool cache refreshes automatically after any configuration change.

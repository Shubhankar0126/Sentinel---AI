# Sentinel AI RAG Report

Generated on: Thursday, July 16, 2026

## Architecture

- Gemini integration is implemented in `backend/app/ai/gemini.py`.
- The RAG pipeline is implemented across:
  - `backend/app/rag/loaders.py`
  - `backend/app/rag/embeddings.py`
  - `backend/app/rag/retriever.py`
  - `backend/app/rag/citations.py`
  - `backend/app/vector_store/faiss_store.py`
- Copilot orchestration and conversation memory are implemented in:
  - `backend/app/services/copilot.py`
  - `backend/app/api/routes/copilot.py`
  - `backend/app/schemas/copilot.py`
- Conversation memory is stored in PostgreSQL through the existing `chat_history` table.

## Documents Loaded

- `docs/` inventory on Thursday, July 16, 2026: no source documents were present.
- `datasets/` inventory indexed by the modular loader:
  - `datasets/ai4i/ai4i2020.csv`
  - `datasets/osha/data.xlsx`
  - `datasets/generated/*.json`
  - `datasets/TEdata/TEdata/*.dat`
  - `datasets/TEdata/TEdata/readme.txt`
  - `datasets/TEdata/TEdata/*.f`
  - `datasets/TEdata/TEdata/*.ini`
- Total source documents indexed: `56`

## Embeddings

- Configured embedding model: `all-MiniLM-L6-v2`
- Target embedding stack: `sentence-transformers`
- Verified development embedding provider on Thursday, July 16, 2026: `offline-fallback`
- Verified development embedding model on Thursday, July 16, 2026: `hashing-fallback`
- Vector dimension: `384`

## Vector Store

- Backend vector store: `FAISS`
- Supported operations implemented:
  - Create
  - Update
  - Delete
  - Search
  - Persistence
- Persisted index location: `backend/.vector_store`
- Indexed vector count: `20279`

## Retriever Performance

- Chunk size: `500`
- Chunk overlap: `100`
- Top K: `5`
- Metadata stored with every chunk:
  - Document name
  - Section
  - Source
  - Page
- Verified sample search latency: `0.287` seconds
- Verified persisted index reload latency impact: negligible on repeated reads (`build_elapsed_seconds = 0.0` when manifest matched)

## Gemini Configuration

- Target model: `gemini-2.5-flash`
- Prompt builder, context builder, conversation memory, and safety guardrails are implemented.
- Numerical risk guardrail is enforced:
  - Gemini never calculates a new numerical risk score.
  - Numerical risk remains owned by the Compound Risk Engine.
- Local validation on Thursday, July 16, 2026 used provider `offline-fallback` because `GEMINI_API_KEY` was not configured.

## Copilot APIs

- Implemented:
  - `POST /api/v1/copilot/chat`
  - `GET /api/v1/copilot/history`
  - `DELETE /api/v1/copilot/history`
- Every copilot response includes:
  - Summary
  - Evidence
  - Applicable Regulations
  - Recommendations
  - Citations
  - Confidence

## Validation Results

- Backend unit and integration tests: passed
  - `9` tests passed on Thursday, July 16, 2026
- PostgreSQL-backed backend validator: passed
- Verified through `scripts/validate_db_layer.py`:
  - Database connectivity
  - Alembic migrations
  - Seed scripts
  - Backend startup
  - Health endpoint
  - Swagger UI
  - OpenAPI
  - Authentication
  - Graph APIs
  - Risk APIs
  - Copilot chat endpoint
  - Copilot history endpoint
  - Copilot history deletion
  - Retrieval-backed citations
  - Conversation memory persistence

## Repository Reality

- Actual regulation source documents for:
  - OSHA regulations
  - Factory Act
  - ISO 45001
  - OISD
  are still not present under `docs/` or `datasets/` as of Thursday, July 16, 2026.
- The modular document loader is ready to ingest future `.pdf`, `.docx`, `.md`, `.txt`, `.json`, `.csv`, `.xlsx`, and `.dat` files without application-code changes.

## Remaining Production-Only Tasks

- Configure `GEMINI_API_KEY` to exercise live Gemini responses.
- Complete installation and runtime enablement of the `sentence-transformers` stack if full semantic embedding is required in this local environment.
- Add the actual OSHA, Factory Act, ISO 45001, and OISD regulation documents to `docs/` or `datasets/`.
- Rebuild the FAISS index after regulation documents are added so citations can reference the new corpus immediately.

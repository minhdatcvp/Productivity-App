"""Shared LLM client factory (Groq via the OpenAI-compatible SDK)."""

from openai import AsyncOpenAI, OpenAI

from app.core.config import settings

_async_client: AsyncOpenAI | None = None
_sync_client: OpenAI | None = None


def get_async_client() -> AsyncOpenAI:
    global _async_client
    if _async_client is None:
        _async_client = AsyncOpenAI(api_key=settings.groq_api_key, base_url=settings.groq_base_url)
    return _async_client


def get_sync_client() -> OpenAI:
    global _sync_client
    if _sync_client is None:
        _sync_client = OpenAI(api_key=settings.groq_api_key, base_url=settings.groq_base_url)
    return _sync_client

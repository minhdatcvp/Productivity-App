import json

from app.core.config import settings
from app.core.llm import get_async_client

_MODEL = settings.groq_model


_CATALOG_SYSTEM = (
    "Bạn là assistant giúp user xây dựng CATALOG các loại block học tập. "
    "Catalog là tập hợp các LOẠI NỘI DUNG (container), không phải topic hay bài học cụ thể. "
    "Ví dụ: 'Code Snippet' (lưu đoạn code), 'Syntax Reference' (ghi chú cú pháp), 'Algorithm Quiz' (quiz thuật toán). "
    "Khi nhận ý định học, đề xuất 3-5 LOẠI BLOCK MỚI phù hợp — tên phải là tên của container, không phải tên bài học. "
    "Trả về JSON với key 'suggestions', mỗi item: "
    "name (tên loại block, ngắn gọn, mô tả container), "
    "block_type (FLASHCARD|VOCABULARY|NOTES|CODE_SNIPPET|QUIZ|EXERCISE), "
    "description (tiếng Việt, 1 câu giải thích container này dùng để làm gì), "
    "icon (lucide icon: layers|book-open|file-text|code|help-circle|dumbbell|terminal|pencil|list). "
    'Format: {"suggestions": [{"name": "Code Snippet", "block_type": "CODE_SNIPPET", "description": "...", "icon": "code"}]}'
)


async def suggest_catalog_blocks(query: str, existing_names: list[str]) -> list[dict]:
    msg = (
        f"Ý định học: {query}\n"
        "Gợi ý 3-5 LOẠI BLOCK phù hợp. Tên block phải ngắn gọn, tổng quan (1-3 từ), là tên container, không phải tên bài học cụ thể."
    )

    response = await get_async_client().chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": _CATALOG_SYSTEM},
            {"role": "user", "content": msg},
        ],
        response_format={"type": "json_object"},
        max_tokens=1024,
    )
    parsed = json.loads(response.choices[0].message.content)
    return parsed.get("suggestions", [])


_TEMPLATE_SUGGEST_SYSTEM = (
    "Bạn là assistant giúp user chọn blocks phù hợp để tạo template học tập. "
    "User sẽ cung cấp mục tiêu học tập và danh sách blocks có sẵn trong catalog (mỗi block có id, name, block_type). "
    "Hãy chọn ra những block_id PHÙ HỢP NHẤT với mục tiêu đó. "
    "Trả về JSON với key 'block_ids' là array các id đã chọn. "
    'Format: {"block_ids": ["id1", "id2", ...]}'
)


async def suggest_template_blocks(query: str, available_blocks: list[dict]) -> list[str]:
    blocks_info = [{"id": b["id"], "name": b["name"], "block_type": b["block_type"]} for b in available_blocks]
    msg = (
        f"Mục tiêu học tập: {query}\n"
        f"Blocks có sẵn:\n{json.dumps(blocks_info, ensure_ascii=False, indent=2)}\n"
        "Chọn các block phù hợp nhất để tạo template cho mục tiêu này."
    )

    response = await get_async_client().chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": _TEMPLATE_SUGGEST_SYSTEM},
            {"role": "user", "content": msg},
        ],
        response_format={"type": "json_object"},
        max_tokens=512,
    )
    parsed = json.loads(response.choices[0].message.content)
    return parsed.get("block_ids", [])

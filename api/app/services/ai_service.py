import json

from openai import AsyncOpenAI, OpenAI

from app.core.config import settings

_GROQ_BASE_URL = "https://api.groq.com/openai/v1"
_MODEL = "llama-3.3-70b-versatile"

_async_client: AsyncOpenAI | None = None
_sync_client: OpenAI | None = None


def _get_async_client() -> AsyncOpenAI:
    global _async_client
    if _async_client is None:
        _async_client = AsyncOpenAI(api_key=settings.groq_api_key, base_url=_GROQ_BASE_URL)
    return _async_client


def _get_sync_client() -> OpenAI:
    global _sync_client
    if _sync_client is None:
        _sync_client = OpenAI(api_key=settings.groq_api_key, base_url=_GROQ_BASE_URL)
    return _sync_client


_BREAKDOWN_SYSTEM = (
    "Bạn là AI assistant giúp breakdown mục tiêu thành các nhiệm vụ cụ thể, có thể thực hiện được. "
    'Trả về JSON object với key "tasks" chứa array 4-8 object, mỗi object có: '
    '"title" (string ngắn gọn, bắt đầu bằng động từ tiếng Việt), '
    '"priority" (một trong: "HIGH", "MEDIUM", "LOW"), '
    '"description" (1-2 câu tiếng Việt mô tả cần làm gì và kết quả đạt được là gì). '
    'Format bắt buộc: {"tasks": [{"title": "Nhiệm vụ 1", "priority": "HIGH", "description": "Mô tả..."}, ...]}'
)

_SUMMARY_SYSTEM = (
    "Bạn là AI assistant phân tích tiến độ mục tiêu và đưa ra đánh giá constructive bằng tiếng Việt. "
    "Trả về JSON object với đúng format (score phải là số nguyên từ 0 đến 100, KHÔNG phải số thập phân):\n"
    '{"summary":"Tóm tắt ngắn gọn tiến độ (2-3 câu)","score":75,'
    '"strengths":["điểm mạnh 1","điểm mạnh 2"],"improvements":["cần cải thiện 1","cần cải thiện 2"],'
    '"next_suggestions":["gợi ý tiếp theo 1","gợi ý tiếp theo 2"]}'
)


async def breakdown_goal(
    goal_title: str, goal_description: str | None, existing_tasks: list[str], refinement: str | None = None
) -> list[dict]:
    content = f"Mục tiêu: {goal_title}"
    if goal_description:
        content += f"\nMô tả: {goal_description}"
    if existing_tasks:
        content += f"\nNhiệm vụ đã có: {', '.join(existing_tasks)}"
    if refinement:
        content += f"\nYêu cầu bổ sung: {refinement}"
    content += "\n\nTạo danh sách nhiệm vụ cụ thể để đạt được mục tiêu này."

    response = await _get_async_client().chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": _BREAKDOWN_SYSTEM},
            {"role": "user", "content": content},
        ],
        response_format={"type": "json_object"},
        max_tokens=1024,
    )
    parsed = json.loads(response.choices[0].message.content)
    raw = parsed.get("tasks", []) if isinstance(parsed, dict) else parsed
    result = []
    for t in raw:
        if isinstance(t, str):
            result.append({"title": t, "priority": "MEDIUM", "description": None})
        else:
            priority = t.get("priority", "MEDIUM").upper()
            if priority not in ("HIGH", "MEDIUM", "LOW"):
                priority = "MEDIUM"
            result.append({
                "title": t.get("title", str(t)),
                "priority": priority,
                "description": t.get("description") or None,
            })
    return result


_DAILY_BREAKDOWN_SYSTEM = (
    "Bạn là AI assistant giúp lên kế hoạch công việc trong ngày. "
    "Dựa vào mục tiêu và mô tả của user, tạo 3-6 action items cụ thể, có thể hoàn thành trong 1 ngày. "
    'Trả về JSON object với key "tasks", mỗi item có: '
    '"title" (string ngắn gọn, bắt đầu bằng động từ tiếng Việt), '
    '"priority" ("HIGH", "MEDIUM", hoặc "LOW"), '
    '"description" (1-2 câu: cần làm gì cụ thể và kết quả đạt được). '
    'Format bắt buộc: {"tasks": [{"title": "...", "priority": "HIGH", "description": "..."}, ...]}'
)


async def breakdown_daily(title: str, detail: str | None, period: str, refinement: str | None = None) -> list[dict]:
    content = f"Ngày: {period}\nMục tiêu hôm nay: {title}"
    if detail:
        content += f"\nChi tiết: {detail}"
    if refinement:
        content += f"\nYêu cầu bổ sung: {refinement}"
    content += "\n\nTạo danh sách action items cụ thể cho ngày này."

    response = await _get_async_client().chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": _DAILY_BREAKDOWN_SYSTEM},
            {"role": "user", "content": content},
        ],
        response_format={"type": "json_object"},
        max_tokens=1024,
    )
    parsed = json.loads(response.choices[0].message.content)
    raw = parsed.get("tasks", []) if isinstance(parsed, dict) else parsed
    result = []
    for t in raw:
        if isinstance(t, str):
            result.append({"title": t, "priority": "MEDIUM", "description": None})
        else:
            priority = t.get("priority", "MEDIUM").upper()
            if priority not in ("HIGH", "MEDIUM", "LOW"):
                priority = "MEDIUM"
            result.append({
                "title": t.get("title", str(t)),
                "priority": priority,
                "description": t.get("description") or None,
            })
    return result


def summarize_period_sync(user_name: str, goals_data: list[dict]) -> dict:
    content = f"Người dùng: {user_name}\n"
    content += f"Dữ liệu mục tiêu:\n{json.dumps(goals_data, ensure_ascii=False, indent=2)}"
    content += "\n\nPhân tích tiến độ và đưa ra đánh giá."

    response = _get_sync_client().chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": _SUMMARY_SYSTEM},
            {"role": "user", "content": content},
        ],
        response_format={"type": "json_object"},
        max_tokens=2048,
    )
    result = json.loads(response.choices[0].message.content)
    if "score" in result:
        result["score"] = int(float(result["score"]) * 100) if float(result["score"]) <= 1 else int(result["score"])
    return result

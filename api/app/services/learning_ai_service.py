import json

from openai import AsyncOpenAI

from app.core.config import settings

_GROQ_BASE_URL = "https://api.groq.com/openai/v1"
_MODEL = "llama-3.3-70b-versatile"

_async_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _async_client
    if _async_client is None:
        _async_client = AsyncOpenAI(api_key=settings.groq_api_key, base_url=_GROQ_BASE_URL)
    return _async_client


_SYSTEM = (
    "Bạn là AI hỗ trợ học tập. "
    "Tạo nội dung học tập chất lượng cao, ngắn gọn, súc tích. "
    "Luôn trả về JSON hợp lệ."
)


async def generate_vocab_items(
    count: int,
    topics: list[str],
    subject_name: str,
    existing_words: list[str],
) -> list[dict]:
    msg = (
        f"Chủ đề: {subject_name}\n"
        f"Topics: {', '.join(topics) if topics else 'tổng quát'}\n"
        f"Số lượng: {count} từ vựng\n"
        f"Từ đã có (tránh lặp): {', '.join(existing_words) if existing_words else 'không có'}\n\n"
        "Tạo danh sách từ vựng. "
        'Trả về JSON: {"items": [{"word": str, "meaning": str, "pronunciation": str, "example": str}]}'
    )
    response = await _get_client().chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": msg},
        ],
        response_format={"type": "json_object"},
        max_tokens=2048,
    )
    parsed = json.loads(response.choices[0].message.content)
    return parsed.get("items", [])


async def lookup_vocab_word(word: str, subject_name: str) -> dict:
    msg = (
        f"Chủ đề: {subject_name}\n"
        f"Từ cần tra: {word}\n\n"
        "Tra cứu từ vựng này. Suy ra ngôn ngữ nguồn từ chủ đề. "
        "Cung cấp nghĩa tiếng Việt rõ ràng, ngắn gọn. "
        "Pronunciation là IPA hoặc romanization (để chuỗi rỗng nếu không có). "
        "Example là 1 câu ngắn dùng từ này (kèm dịch tiếng Việt trong dấu ngoặc đơn). "
        'Trả về JSON: {"word": str, "meaning": str, "pronunciation": str, "example": str}'
    )
    response = await _get_client().chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": msg},
        ],
        response_format={"type": "json_object"},
        max_tokens=512,
    )
    return json.loads(response.choices[0].message.content)


async def generate_flashcards(
    count: int,
    topics: list[str],
    subject_name: str,
    existing_fronts: list[str],
) -> list[dict]:
    msg = (
        f"Chủ đề: {subject_name}\n"
        f"Topics: {', '.join(topics) if topics else 'tổng quát'}\n"
        f"Số lượng: {count} flashcard\n"
        f"Mặt trước đã có (tránh lặp): {', '.join(existing_fronts) if existing_fronts else 'không có'}\n\n"
        "Tạo danh sách flashcard. "
        'Trả về JSON: {"items": [{"front": str, "back": str}]}'
    )
    response = await _get_client().chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": msg},
        ],
        response_format={"type": "json_object"},
        max_tokens=2048,
    )
    parsed = json.loads(response.choices[0].message.content)
    return parsed.get("items", [])


async def generate_note(topic: str, subject_name: str) -> dict:
    msg = (
        f"Chủ đề: {subject_name}\n"
        f"Topic cụ thể: {topic}\n\n"
        "Tạo một ghi chú học tập chi tiết. "
        'Trả về JSON: {"title": str, "content": str, "tags": [str]}'
    )
    response = await _get_client().chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": msg},
        ],
        response_format={"type": "json_object"},
        max_tokens=2048,
    )
    return json.loads(response.choices[0].message.content)


async def generate_exercises(
    topics: list[str],
    subject_name: str,
    count: int,
) -> list[dict]:
    msg = (
        f"Chủ đề: {subject_name}\n"
        f"Topics: {', '.join(topics) if topics else 'tổng quát'}\n"
        f"Số lượng: {count} bài tập\n\n"
        "Tạo danh sách bài tập thực hành. "
        'Trả về JSON: {"items": [{"title": str, "content": str}]}'
    )
    response = await _get_client().chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": msg},
        ],
        response_format={"type": "json_object"},
        max_tokens=2048,
    )
    parsed = json.loads(response.choices[0].message.content)
    return parsed.get("items", [])


async def generate_quiz_questions(
    subject_name: str,
    context_dict: dict,
    count: int,
) -> list[dict]:
    """context_dict = {"vocab": [...], "flashcards": [...], "notes": [...]}"""
    msg = (
        f"Chủ đề: {subject_name}\n"
        f"Số câu hỏi: {count}\n\n"
        f"Nội dung tham khảo:\n{json.dumps(context_dict, ensure_ascii=False, indent=2)}\n\n"
        "Dựa vào nội dung trên, tạo các câu hỏi trắc nghiệm (4 lựa chọn A/B/C/D). "
        "Câu hỏi phải bám sát nội dung đã cung cấp. "
        'Trả về JSON: {"questions": [{"id": int, "question": str, "options": {"A": str, "B": str, "C": str, "D": str}, "answer": str, "explanation": str}]}'
    )
    response = await _get_client().chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": msg},
        ],
        response_format={"type": "json_object"},
        max_tokens=4096,
    )
    parsed = json.loads(response.choices[0].message.content)
    return parsed.get("questions", [])


async def evaluate_quiz(
    subject_name: str,
    questions: list[dict],
    user_answers: dict,
) -> dict:
    """user_answers = {"1": "A", "2": "B", ...} (question id → answer)"""
    # Tự tính điểm, không nhờ AI đếm
    total = len(questions)
    correct_count = 0
    per_question_data = []

    for q in questions:
        qid = str(q.get("id", ""))
        correct_answer = q.get("answer", "")
        user_answer = user_answers.get(qid, "")
        is_correct = user_answer.upper() == correct_answer.upper()
        if is_correct:
            correct_count += 1
        per_question_data.append({
            "id": q.get("id"),
            "question": q.get("question", ""),
            "correct_answer": correct_answer,
            "user_answer": user_answer,
            "is_correct": is_correct,
        })

    score = round(correct_count / total * 100) if total > 0 else 0

    msg = (
        f"Chủ đề: {subject_name}\n"
        f"Kết quả: {correct_count}/{total} câu đúng ({score}%)\n\n"
        f"Chi tiết từng câu:\n{json.dumps(per_question_data, ensure_ascii=False, indent=2)}\n\n"
        "Phân tích kết quả học tập. Xác định điểm mạnh, điểm yếu và đề xuất kế hoạch học tiếp theo. "
        "Trả về JSON: "
        '{"summary": str, "strong_areas": [str], "weak_areas": [str], "next_plan": str, '
        '"per_question": [{"id": int, "correct": bool, "note": str}]}'
    )
    response = await _get_client().chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": msg},
        ],
        response_format={"type": "json_object"},
        max_tokens=2048,
    )
    ai_result = json.loads(response.choices[0].message.content)

    return {
        "score": score,
        "correct": correct_count,
        "total": total,
        "summary": ai_result.get("summary", ""),
        "strong_areas": ai_result.get("strong_areas", []),
        "weak_areas": ai_result.get("weak_areas", []),
        "next_plan": ai_result.get("next_plan", ""),
        "per_question": ai_result.get("per_question", []),
    }

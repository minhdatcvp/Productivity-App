import json

from app.core.config import settings
from app.core.llm import get_async_client

_MODEL = settings.groq_model


_SYSTEM = (
    "Bạn là AI hỗ trợ học tập. "
    "Tạo nội dung học tập chất lượng cao, ngắn gọn, súc tích. "
    "Luôn trả về JSON hợp lệ."
)


def _level_line(level: str | None) -> str:
    """A prompt fragment that calibrates generated content to the learner's
    assessed proficiency level (set by the Bài tập / assessment module)."""
    if not level:
        return ""
    return (
        f"Trình độ hiện tại của người học: {level}. "
        "Hãy tạo nội dung phù hợp đúng trình độ này — không quá dễ, không quá khó.\n"
    )


async def generate_vocab_items(
    count: int,
    topics: list[str],
    subject_name: str,
    existing_words: list[str],
    level: str | None = None,
) -> list[dict]:
    msg = (
        f"Chủ đề: {subject_name}\n"
        f"Topics: {', '.join(topics) if topics else 'tổng quát'}\n"
        f"Số lượng: {count} từ vựng\n"
        f"Từ đã có (tránh lặp): {', '.join(existing_words) if existing_words else 'không có'}\n"
        f"{_level_line(level)}\n"
        "Tạo danh sách từ vựng. "
        'Trả về JSON: {"items": [{"word": str, "meaning": str, "pronunciation": str, "example": str}]}'
    )
    response = await get_async_client().chat.completions.create(
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
    response = await get_async_client().chat.completions.create(
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
    level: str | None = None,
) -> list[dict]:
    msg = (
        f"Chủ đề: {subject_name}\n"
        f"Topics: {', '.join(topics) if topics else 'tổng quát'}\n"
        f"Số lượng: {count} flashcard\n"
        f"Mặt trước đã có (tránh lặp): {', '.join(existing_fronts) if existing_fronts else 'không có'}\n"
        f"{_level_line(level)}\n"
        "Tạo danh sách flashcard. "
        'Trả về JSON: {"items": [{"front": str, "back": str}]}'
    )
    response = await get_async_client().chat.completions.create(
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


async def generate_note(topic: str, subject_name: str, level: str | None = None) -> dict:
    msg = (
        f"Chủ đề: {subject_name}\n"
        f"Topic cụ thể: {topic}\n"
        f"{_level_line(level)}\n"
        "Tạo một ghi chú học tập chi tiết. "
        'Trả về JSON: {"title": str, "content": str, "tags": [str]}'
    )
    response = await get_async_client().chat.completions.create(
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
    response = await get_async_client().chat.completions.create(
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
    response = await get_async_client().chat.completions.create(
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
    if not questions:
        return {
            "score": 0, "correct": 0, "total": 0, "summary": "Không có câu hỏi.",
            "strong_areas": [], "weak_areas": [], "next_plan": "", "per_question": [],
        }
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
    response = await get_async_client().chat.completions.create(
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


# ── Proficiency assessment ("Bài tập" / bài test đánh giá năng lực) ────────────

_LEVEL_GUIDE = (
    "Thang trình độ: nếu là môn NGÔN NGỮ, dùng CEFR (A1, A2, B1, B2, C1, C2). "
    "Nếu là môn khác (lập trình, kiến thức...), dùng: "
    "Người mới, Cơ bản, Trung cấp, Nâng cao, Thành thạo."
)


async def generate_assessment_questions(subject_name: str, count: int) -> list[dict]:
    """Generate a proficiency-test: questions spanning easy→hard so the grader
    can gauge the learner's overall level (not tied to existing content)."""
    msg = (
        f"Chủ đề: {subject_name}\n"
        f"Số câu hỏi: {count}\n\n"
        "Tạo một BÀI TEST ĐÁNH GIÁ NĂNG LỰC cho môn học này. "
        "Các câu hỏi phải trải đều từ DỄ đến KHÓ để đo chính xác trình độ tổng thể "
        "của người học (không bám vào một nội dung cụ thể nào). "
        f"{_LEVEL_GUIDE}\n"
        "Mỗi câu trắc nghiệm 4 lựa chọn A/B/C/D. Sắp xếp câu theo độ khó tăng dần. "
        'Trả về JSON: {"questions": [{"id": int, "question": str, '
        '"options": {"A": str, "B": str, "C": str, "D": str}, "answer": str, '
        '"explanation": str, "difficulty": str}]}'
    )
    response = await get_async_client().chat.completions.create(
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


async def evaluate_assessment(
    subject_name: str,
    questions: list[dict],
    user_answers: dict,
) -> dict:
    """Grade a proficiency test and assign the learner an overall level."""
    if not questions:
        return {
            "score": 0, "correct": 0, "total": 0, "level": "", "level_label": "",
            "summary": "Không có câu hỏi.", "strong_areas": [], "weak_areas": [],
            "next_plan": "", "per_question": [],
        }
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
            "difficulty": q.get("difficulty", ""),
            "correct_answer": correct_answer,
            "user_answer": user_answer,
            "is_correct": is_correct,
        })

    score = round(correct_count / total * 100) if total > 0 else 0

    msg = (
        f"Chủ đề: {subject_name}\n"
        f"Kết quả: {correct_count}/{total} câu đúng ({score}%)\n\n"
        f"Chi tiết từng câu (kèm độ khó):\n"
        f"{json.dumps(per_question_data, ensure_ascii=False, indent=2)}\n\n"
        "Đây là một BÀI TEST ĐÁNH GIÁ NĂNG LỰC. Dựa vào kết quả (đặc biệt là khả năng "
        "trả lời đúng các câu KHÓ), hãy xác định TRÌNH ĐỘ tổng thể của người học. "
        f"{_LEVEL_GUIDE}\n"
        "Phân tích điểm mạnh, điểm yếu và đề xuất kế hoạch học tiếp theo phù hợp trình độ. "
        "Trả về JSON: "
        '{"level": str, "level_label": str, "summary": str, "strong_areas": [str], '
        '"weak_areas": [str], "next_plan": str, '
        '"per_question": [{"id": int, "correct": bool, "note": str}]}\n'
        '("level" là mã ngắn vd "B1"; "level_label" là mô tả vd "Trung cấp (B1)".)'
    )
    response = await get_async_client().chat.completions.create(
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
        "level": ai_result.get("level", ""),
        "level_label": ai_result.get("level_label", ""),
        "summary": ai_result.get("summary", ""),
        "strong_areas": ai_result.get("strong_areas", []),
        "weak_areas": ai_result.get("weak_areas", []),
        "next_plan": ai_result.get("next_plan", ""),
        "per_question": ai_result.get("per_question", []),
    }

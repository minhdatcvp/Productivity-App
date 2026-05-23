from datetime import datetime, timedelta, timezone


def compute_next_review(
    ease_factor: float,
    interval: int,
    repetitions: int,
    quality: int,
) -> tuple[float, int, int, datetime]:
    """SM-2 algorithm. quality: 0-5 (0-2 = fail, 3-5 = pass)."""
    if quality < 3:
        new_repetitions = 0
        new_interval = 1
    else:
        new_repetitions = repetitions + 1
        if repetitions == 0:
            new_interval = 1
        elif repetitions == 1:
            new_interval = 6
        else:
            new_interval = round(interval * ease_factor)

    new_ease_factor = max(1.3, ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    next_review = datetime.now(timezone.utc) + timedelta(days=new_interval)

    return new_ease_factor, new_interval, new_repetitions, next_review

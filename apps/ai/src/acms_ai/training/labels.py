from enum import StrEnum


class ModerationLabel(StrEnum):
    VALID = "valid"
    INVALID = "invalid"


class CommentCategory(StrEnum):
    STATEMENT = "statement"
    QUESTION = "question"
    OFF_TOPIC = "off_topic"
    TOXIC = "toxic"
    SEXUAL = "sexual"
    SPAM = "spam"
    GIBBERISH = "gibberish"
    ADVERTISEMENT = "advertisement"
    SCAM = "scam"
    PRIVACY = "privacy"
    ILLEGAL = "illegal"
    POLITICAL = "political"


LABELS: tuple[ModerationLabel, ...] = tuple(ModerationLabel)
CATEGORIES: tuple[CommentCategory, ...] = tuple(CommentCategory)

LABEL_HEAD = "label"
CATEGORY_HEAD = "category"
HEAD_SEPARATOR = ":"


def output_name(head: str, value: str) -> str:
    return f"{head}{HEAD_SEPARATOR}{value}"


OUTPUT_NAMES: tuple[str, ...] = tuple(output_name(LABEL_HEAD, label) for label in LABELS) + tuple(
    output_name(CATEGORY_HEAD, category) for category in CATEGORIES
)
LABEL_SLICE = slice(0, len(LABELS))
CATEGORY_SLICE = slice(len(LABELS), len(LABELS) + len(CATEGORIES))


def is_question(label: ModerationLabel, category: CommentCategory) -> bool:
    return label == ModerationLabel.VALID and category == CommentCategory.QUESTION

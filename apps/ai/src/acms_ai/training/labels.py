from enum import StrEnum


class ModerationLabel(StrEnum):
    VALID = "valid"
    QUESTION = "question"
    INVALID = "invalid"


LABELS: tuple[ModerationLabel, ...] = tuple(ModerationLabel)

DEFAULT_REASONS: dict[ModerationLabel, str] = {
    ModerationLabel.VALID: "评论内容正常,未发现违规",
    ModerationLabel.QUESTION: "用户向网站运营方提问,需要人工回复",
    ModerationLabel.INVALID: "评论内容违规",
}


def label_from_flags(is_valid: bool, is_question: bool) -> ModerationLabel:
    if not is_valid:
        return ModerationLabel.INVALID
    return ModerationLabel.QUESTION if is_question else ModerationLabel.VALID


def flags_from_label(label: ModerationLabel) -> tuple[bool, bool]:
    return label != ModerationLabel.INVALID, label == ModerationLabel.QUESTION

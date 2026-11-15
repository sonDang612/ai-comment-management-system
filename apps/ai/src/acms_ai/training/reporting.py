from typing import Any

COLUMN_WIDTH = 10
LABEL_WIDTH = 15


def percent(value: float) -> str:
    return f"{value * 100:.2f}%"


def classification_lines(title: str, classification: dict[str, Any]) -> list[str]:
    lines = [
        f"[{title}] Accuracy: {percent(classification['accuracy'])}  "
        f"Macro F1: {percent(classification['macro_f1'])}",
        f"{'':<{LABEL_WIDTH}}{'precision':>{COLUMN_WIDTH}}{'recall':>{COLUMN_WIDTH}}"
        f"{'f1':>{COLUMN_WIDTH}}{'support':>{COLUMN_WIDTH}}",
    ]
    for label, values in classification["per_class"].items():
        lines.append(
            f"{label:<{LABEL_WIDTH}}{percent(values['precision']):>{COLUMN_WIDTH}}"
            f"{percent(values['recall']):>{COLUMN_WIDTH}}{percent(values['f1']):>{COLUMN_WIDTH}}"
            f"{values['support']:>{COLUMN_WIDTH}}"
        )
    matrix = classification["confusion_matrix"]
    lines += ["", f"[{title}] Confusion matrix (rows = gold, columns = predicted)"]
    lines.append(" " * LABEL_WIDTH + "".join(f"{x[:9]:>{COLUMN_WIDTH}}" for x in matrix["labels"]))
    for label, row in zip(matrix["labels"], matrix["matrix"], strict=True):
        lines.append(f"{label:<{LABEL_WIDTH}}" + "".join(f"{x:>{COLUMN_WIDTH}}" for x in row))
    return lines


def format_report(report: dict[str, Any]) -> str:
    classification = report["classification"]
    lines = [f"Records: {report['records']}", ""]
    lines += classification_lines("label", classification["label"])
    lines.append("")
    lines += classification_lines("category", classification["category"])

    policy = report["threshold_policy"]
    lines += ["", f"Thresholds: {policy['thresholds']}"]
    for label, values in policy["per_class"].items():
        lines.append(
            f"  {label}: accepted={values['accepted']} precision={percent(values['precision'])} "
            f"recall={percent(values['recall'])} coverage={percent(values['coverage'])}"
        )
    lines.append(
        f"  question reviews={policy['question_reviews']} uncertain={policy['uncertain']} "
        f"({percent(policy['uncertain_rate'])} of non-question)"
    )

    lines += ["", "Acceptance targets"]
    for name, check in report["acceptance"].items():
        status = "PASS" if check["passed"] else "FAIL"
        lines.append(
            f"  [{status}] {name}: {percent(check['value'])} (target {percent(check['target'])})"
        )
    return "\n".join(lines)

# LoRA fine-tuning: Qwen3-1.7B comment moderation

Offline pipeline that trains a **LoRA adapter** on top of a frozen Qwen3-1.7B, tunes the decision thresholds on the
validation split, and measures the result once on an untouched test split.

It is a third entrypoint of `apps/ai` (`python -m acms_ai.training`), next to `server` and `worker`. It imports
only `acms_ai.core` and never touches PostgreSQL, Redis or the API. Training data comes from exported JSONL files.

```
labeled *.jsonl ──split──▶ train / validation / test (+ manifest.json with SHA-256 per file)
                               │         │            │
                     train ◀───┘         │            │   (train loss + validation loss for early stopping)
                                         ▼            │
                              tune-thresholds         │   (thresholds.json, tuned on validation only)
                                                      ▼
                                              evaluate --split test   (final, one-off report)
```

## Contents

| Path                                     | What                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `src/acms_ai/training/`                  | The package: `cli`, `dataset`, `splitting`, `prompt`, `trainer`, `scoring`, `metrics`, `thresholds`, `evaluation` |
| `training/configs/qwen3-1.7b-lora.toml`  | Default configuration (model, LoRA, training, data, evaluation)             |
| `training/data/`                         | Your datasets and splits (git-ignored)                                      |
| `training/models/`                       | Optional local copy of the base model (git-ignored)                         |
| `training/outputs/<run>/`                | One folder per run: adapter, checkpoints, config, thresholds, reports (git-ignored) |

Run every command **from `apps/ai`**: relative paths in the config resolve from the current directory.

## Requirements

- Python packages: `torch` (CUDA build), `transformers`, `peft`, `trl`, `datasets`, `accelerate`,
  plus `bitsandbytes` for `load_in_4bit`. They are not dependencies of the server or the worker.
- An NVIDIA GPU with CUDA for real training. CPU works only for tiny dry runs.

| GPU memory | Suggested settings for Qwen3-1.7B                                                         |
| ---------- | ----------------------------------------------------------------------------------------- |
| ≥ 16 GB    | Defaults (bf16/fp16, batch 4 × accumulation 4, `max_seq_length = 512`)                    |
| 8–12 GB    | `--batch-size 2 --gradient-accumulation-steps 8`                                           |
| 4–6 GB     | `--load-in-4bit --batch-size 1 --gradient-accumulation-steps 16 --max-seq-length 384`     |

GPUs without bf16 (for example Turing, GTX 16xx / RTX 20xx) fall back to fp16 automatically with `precision = "auto"`.

## Dataset format

One JSON object per line (UTF-8). Unknown fields are ignored.

```jsonl
{"comment_id": "10001", "site_code": "taolun666", "content": "今晚买几号?", "is_valid": true, "is_question": false}
{"comment_id": "10002", "site_code": "taolun666", "content": "特码是什么意思?", "is_valid": true, "is_question": true}
{"comment_id": "10003", "site_code": "taolun666", "content": "加我V信 abc123 包中", "is_valid": false, "is_question": false, "reason": "包含联系方式和广告"}
{"comment_id": "10004", "content": "又没中", "label": "valid"}
```

| Field                        | Required | Notes                                                                                         |
| ---------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `content`                    | yes      | Raw comment text, as the API sends it to the AI (max 10 000 characters)                       |
| `is_valid` + `is_question`   | one of   | Same fields the system stores. `is_valid: false` wins over `is_question` (violation first)    |
| `label`                      | one of   | `valid`, `question` or `invalid`. If given with the flags, both must agree                    |
| `comment_id`, `site_code`    | no       | Used to detect duplicates and leakage, and copied into prediction files                       |
| `reason`                     | no       | Simplified Chinese reason the model learns to write. A default reason is used when missing    |

The model learns three classes, which map back to the system fields:

| Label      | `is_valid` | `is_question` |
| ---------- | ---------- | ------------- |
| `valid`    | `true`     | `false`       |
| `question` | `true`     | `true`        |
| `invalid`  | `false`    | `false`       |

Do not put passwords, IPs or other personal data in the files (docs 5.3.1). Prediction files keep only
`comment_id`, `site_code`, labels and scores, never the content.

## 1. Split the data

```bash
cd apps/ai
python -m acms_ai.training split \
  --input training/data/raw/export_2026_05.jsonl \
  --input training/data/raw/export_2026_06.jsonl \
  --output-dir training/data/splits/v1 \
  --seed 42
```

What the split guarantees (leakage prevention):

1. **Normalized deduplication.** Every comment gets a key: NFKC, `。`→`.`, lowercase, invisible format characters
   and all whitespace removed (the same normalization as the API rule checks). Only one record per key is kept,
   so the same text can never appear in two splits.
2. **Conflicts are dropped.** Same normalized text with different labels, or the same `site_code` + `comment_id` with
   a different text or label, is removed from all splits and counted in `manifest.json`.
3. **Stratified 70 / 15 / 15** per label, with a fixed seed (`--train-ratio`, `--validation-ratio`, `--test-ratio`).
4. **Overlap check.** After splitting, content keys and comment ids are checked across every pair of splits.
5. **Frozen split.** `manifest.json` stores the SHA-256 of every split file. Every later command verifies them, and
   `split` refuses to overwrite an existing split (reshuffling would leak the test set). `--force` exists only for a
   deliberate restart; then train a new run from scratch.

Use a **new split folder** (`v2`, …) when you add data, and train a new run on it.

Keep the customer's **golden set** (docs 5.3.1) out of the `split` inputs: it must never be trained on. The
pipeline does not evaluate on a separate golden file yet.

## 2. Train the adapter

```bash
python -m acms_ai.training train --config training/configs/qwen3-1.7b-lora.toml
```

Override any common setting without editing the file:

```bash
python -m acms_ai.training train --config training/configs/qwen3-1.7b-lora.toml \
  --lora-rank 32 --lora-alpha 64 --lora-dropout 0.1 \
  --target-modules q_proj,k_proj,v_proj,o_proj \
  --batch-size 2 --gradient-accumulation-steps 8 \
  --learning-rate 1e-4 --epochs 2 --max-seq-length 384 \
  --output-dir training/outputs/qwen3-1.7b-lora-r32
```

Other flags: `--base-model`, `--precision {auto,bf16,fp16,fp32}`, `--load-in-4bit`, `--seed`, `--split-dir`,
`--resume` (continue from the last checkpoint), `--force` (replace an existing adapter in the same folder).

How it works:

- Only `train.jsonl` is used for gradient updates. `validation.jsonl` gives the validation loss for checkpoint
  selection and early stopping. `test.jsonl` is never loaded for training.
- The base model is loaded with every weight frozen (`requires_grad = False`). PEFT injects LoRA matrices into
  `target_modules`, and the run aborts if any parameter outside the `lora_` weights is trainable.
- Loss is computed on the answer tokens only (TRL `SFTTrainer`, prompt-completion format, `completion_only_loss`).
- Prompt: a system message with the label definitions (docs 5.1 and 5.2), the comment wrapped in
  `<comment>…</comment>` and treated as data, and a fixed JSON answer
  `{"label": "...", "reason": "..."}`. Thinking mode is disabled. Comments that are too long are truncated so the
  prompt and answer always fit in `max_seq_length`.
- The base model is never saved, merged or modified. Downloads stay in the Hugging Face cache (or `cache_dir`).

### Local model storage

To train offline from a local copy of the base model:

```bash
hf download Qwen/Qwen3-1.7B --local-dir training/models/Qwen3-1.7B
python -m acms_ai.training train --config training/configs/qwen3-1.7b-lora.toml \
  --base-model training/models/Qwen3-1.7B
```

You can also set `local_files_only = true` and `cache_dir` in `[model]`, or the usual `HF_HOME` variable.

## 3. Tune thresholds on validation

```bash
python -m acms_ai.training tune-thresholds --run-dir training/outputs/qwen3-1.7b-lora-v1
```

The adapter scores every validation comment. Confidence is the probability of each label, computed from the
log-likelihood of the answer prefix `{"label": "<label>",` and normalized over the three labels (no sampling).

For `valid` and `invalid`, tuning picks the **lowest threshold** (grid from `threshold_grid_min` in
`threshold_grid_step` steps) whose precision on validation reaches the target and accepts at least `min_accepted`
comments. That gives the most automatic decisions at the required precision. If no threshold reaches it, the
default from docs 5.1.4 is kept (0.85 / 0.90) and `fallback_to_default` is `true`. `question` has no threshold:
it always goes to human review.

Targets can be changed per run: `--valid-target-precision 0.96 --invalid-target-precision 0.98 --min-accepted 50`.

## 4. Final evaluation on test

```bash
python -m acms_ai.training evaluate --run-dir training/outputs/qwen3-1.7b-lora-v1 --split test
```

- Requires `thresholds.json` from step 3. It must have been tuned on the validation split of the **same** split
  manifest and the **same** adapter (SHA-256 checked), so test results are never used for tuning.
- Runs once: a second test evaluation of the same run is refused unless you pass `--force`. Fix problems with a new
  run on train/validation, not by looking at the test set again.
- `--split validation` gives the same report on validation (with tuned thresholds if present, defaults otherwise).

The report (printed, and saved to `evaluation/<split>_report.json`) contains:

- **Classification** over the three labels: accuracy, per-class precision / recall / F1 / support, macro and
  weighted F1, and the confusion matrix (rows = gold, columns = predicted).
- **Binary views**: `is_invalid` and `is_question` with TP / FP / FN / TN, precision, recall, F1 and accuracy.
- **Threshold policy**: for `valid` and `invalid`, the comments accepted at the threshold with their precision,
  recall and coverage; the number of question reviews; the uncertain rate (questions excluded).
- **Acceptance targets** from docs 5.4: precision of `invalid` at the threshold ≥ 97%, question precision and recall
  ≥ 90%, uncertain rate ≤ 15%.

## Run folder

```
training/outputs/qwen3-1.7b-lora-v1/
├── adapter/                      # LoRA weights only: adapter_config.json + adapter_model.safetensors
├── checkpoints/                  # intermediate Trainer checkpoints (can be deleted after training)
├── training_config.json          # full config, precision, prompt version, base model + commit, split manifest
│                                 # SHA-256, trainable/total parameters, metrics, package versions, adapter SHA-256
├── thresholds.json               # tuned thresholds, tuning curves, validation report
└── evaluation/
    ├── validation_predictions.json
    ├── test_report.json
    └── test_predictions.json
```

`tune-thresholds` and `evaluate` read the model, LoRA and sequence settings from `training_config.json`, so
inference always matches training. A run trained with another prompt version is refused.

To use the adapter elsewhere, load the same base model and apply the adapter, for example with PEFT
(`PeftModel.from_pretrained(base, "…/adapter")`) or vLLM's LoRA support. The adapter is a few dozen MB. The base
model stays as published.

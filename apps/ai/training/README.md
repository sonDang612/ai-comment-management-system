# Classifier fine-tuning: hfl/chinese-roberta-wwm-ext comment moderation

Offline pipeline that fine-tunes **`hfl/chinese-roberta-wwm-ext`** (BERT, about 102M parameters) with two
independent output heads on a shared encoder (label `valid` / `invalid`, and a comment category), tunes the decision thresholds on the validation split, and
measures the result once on an untouched test split. It trains on a 4 GB GPU (for example a GTX 1650 Ti, fp16).

It is an offline entrypoint of `apps/ai` (`python -m acms_ai.training`), next to the queue worker. It imports
only `acms_ai.core` and never touches PostgreSQL, Redis or the API. Training data comes from exported JSONL files.
The trained model folder is served by Hugging Face Text Embeddings Inference (TEI, CPU is enough), and the NestJS
API calls TEI directly (see the root README, "AI inference (classifier)").

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
| `src/acms_ai/training/`                  | The package: `cli`, `dataset`, `splitting`, `trainer`, `scoring`, `metrics`, `thresholds`, `evaluation` |
| `training/configs/chinese-roberta.toml`  | Default configuration (model, training, data, evaluation)                   |
| `training/data/`                         | Your datasets and splits (git-ignored)                                      |
| `training/models/`                       | Optional local copy of the base model (git-ignored)                         |
| `training/outputs/<run>/`                | One folder per run: model, checkpoints, config, thresholds, reports (git-ignored) |

Run every command **from `apps/ai`**: relative paths in the config resolve from the current directory.

## Requirements

- Python packages: `torch` (CUDA build for GPU training), `transformers`, `accelerate`. They are not dependencies
  of the worker or of any production image.
- An NVIDIA GPU with CUDA is recommended. A 4 GB card is enough; CPU training works but is slow (hours instead of
  minutes for a few thousand comments).

| GPU memory | Suggested settings                                                                 |
| ---------- | ---------------------------------------------------------------------------------- |
| ≥ 8 GB     | Defaults (batch 16, `max_seq_length = 256`), or `--batch-size 32`                  |
| 4 GB       | Defaults; on out-of-memory errors `--batch-size 8 --gradient-accumulation-steps 2` |
| CPU only   | `--precision fp32 --batch-size 8`                                                  |

GPUs without bf16 (for example Turing, GTX 16xx / RTX 20xx) use fp16 automatically with `precision = "auto"`.

## Dataset format

One JSON object per line (UTF-8). Unknown fields are ignored.

```jsonl
{"comment_id": "10001", "site_code": "taolun666", "content": "今晚买几号?", "label": "valid", "category": "statement"}
{"comment_id": "10002", "site_code": "taolun666", "content": "特码是什么意思?", "label": "valid", "category": "question"}
{"comment_id": "10003", "site_code": "taolun666", "content": "加我V信 abc123 包中", "label": "invalid", "category": "privacy"}
```

| Field                     | Required | Notes                                                                                 |
| ------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `content`                 | yes      | Raw comment text, as the API sends it to the AI (max 10 000 characters)               |
| `label`                   | yes      | `valid` (approved) or `invalid` (not approved). Target of the label head              |
| `category`                | yes      | One category below. Target of the category head                                       |
| `comment_id`, `site_code` | no       | Used to detect duplicates and leakage, and copied into prediction files               |

`label` and `category` are two **independent** targets: neither is derived from the other, and both are given in
every record. Categories (`acms_ai.training.labels.CommentCategory`, mirrored by `COMMENT_CATEGORIES` in
`packages/shared`):

| Category        | Usually with | Meaning                                                   |
| --------------- | ------------ | --------------------------------------------------------- |
| `statement`     | `valid`      | Normal comment                                            |
| `question`      | `valid`      | Question to the site operator (needs a human reply)       |
| `off_topic`     | `valid`      | Everyday chat unrelated to the topic                      |
| `toxic`         | `invalid`    | Insult, profanity, harassment, hate, threat, violence, self-harm |
| `sexual`        | `invalid`    | Sexual or vulgar content                                  |
| `spam`          | `invalid`    | Flooding or repeated filler                               |
| `gibberish`     | `invalid`    | Random characters, meaningless text                       |
| `advertisement` | `invalid`    | Advertising, promotion, gambling referrals                |
| `scam`          | `invalid`    | Scam or phishing                                          |
| `privacy`       | `invalid`    | Contact details or personal data                          |
| `illegal`       | `invalid`    | Illegal goods: drugs, weapons, …                          |
| `political`     | `invalid`    | Sensitive political content                               |

The system fields map from the two heads: `is_valid = label == valid`, `is_question = is_valid and category ==
question`, plus `category` itself.

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

## 2. Train the classifier

```bash
python -m acms_ai.training train --config training/configs/chinese-roberta.toml
```

Override any common setting without editing the file:

```bash
python -m acms_ai.training train --config training/configs/chinese-roberta.toml \
  --batch-size 8 --gradient-accumulation-steps 2 \
  --learning-rate 3e-5 --epochs 5 --max-seq-length 192 \
  --output-dir training/outputs/chinese-roberta-v2
```

Other flags: `--base-model` (for example `hfl/rbt3`, a 3-layer version that is about 3× faster),
`--precision {auto,bf16,fp16,fp32}`, `--seed`, `--split-dir`, `--resume` (continue from the last checkpoint),
`--force` (replace an existing model in the same folder).

How it works:

- Only `train.jsonl` is used for gradient updates. `validation.jsonl` is scored every `eval_steps`; the checkpoint
  with the best macro F1 is kept, and early stopping uses the same metric. `test.jsonl` is never loaded for training.
- The whole model is fine-tuned with two new heads on the shared encoder, stored as one classification layer so
  that TEI serves it as a standard model: `id2label` = `label:valid`, `label:invalid`, then `category:<name>` for
  every category. The loss is the cross-entropy of the label head plus the cross-entropy of the category head, each
  with its own softmax, so the heads are trained independently. The best checkpoint maximizes the mean of both
  macro F1 scores on validation. There is no prompt: the comment text is the only input, truncated to
  `max_seq_length` tokens, so instructions inside a comment cannot change the task.
- The result is a standard Hugging Face folder (`config.json`, `model.safetensors`, `tokenizer.json` …) that TEI
  serves as is. The base model download stays in the Hugging Face cache (or `cache_dir`).

### Local model storage

To train offline from a local copy of the base model:

```bash
hf download hfl/chinese-roberta-wwm-ext --local-dir training/models/chinese-roberta-wwm-ext
python -m acms_ai.training train --config training/configs/chinese-roberta.toml \
  --base-model training/models/chinese-roberta-wwm-ext
```

You can also set `local_files_only = true` and `cache_dir` in `[model]`, or the usual `HF_HOME` variable.

## 3. Tune thresholds on validation

```bash
python -m acms_ai.training tune-thresholds --run-dir training/outputs/chinese-roberta-v1
```

The model scores every validation comment. Confidence is the softmax probability of the predicted label, the
same value TEI returns to the API.

For `valid` and `invalid`, tuning picks the **lowest threshold** (grid from `threshold_grid_min` in
`threshold_grid_step` steps) whose precision on validation reaches the target and accepts at least `min_accepted`
comments. That gives the most automatic decisions at the required precision. If no threshold reaches it, the
default from docs 5.1.4 is kept (0.85 / 0.90) and `fallback_to_default` is `true`. `question` has no threshold:
it always goes to human review.

Targets can be changed per run: `--valid-target-precision 0.96 --invalid-target-precision 0.98 --min-accepted 50`.

## 4. Final evaluation on test

```bash
python -m acms_ai.training evaluate --run-dir training/outputs/chinese-roberta-v1 --split test
```

- Requires `thresholds.json` from step 3. It must have been tuned on the validation split of the **same** split
  manifest and the **same** model (SHA-256 checked), so test results are never used for tuning.
- Runs once: a second test evaluation of the same run is refused unless you pass `--force`. Fix problems with a new
  run on train/validation, not by looking at the test set again.
- `--split validation` gives the same report on validation (with tuned thresholds if present, defaults otherwise).

The report (printed, and saved to `evaluation/<split>_report.json`) contains:

- **Classification** per head (`label` and `category`): accuracy, per-class precision / recall / F1 / support, macro and
  weighted F1, and the confusion matrix (rows = gold, columns = predicted).
- **Binary views**: `is_invalid` and `is_question` with TP / FP / FN / TN, precision, recall, F1 and accuracy.
- **Threshold policy**: for `valid` and `invalid`, the comments accepted at the threshold with their precision,
  recall and coverage; the number of question reviews; the uncertain rate (questions excluded).
- **Acceptance targets** from docs 5.4: precision of `invalid` at the threshold ≥ 97%, question precision and recall
  ≥ 90%, uncertain rate ≤ 15%.

## Run folder

```
training/outputs/chinese-roberta-v1/
├── model/                        # served by TEI: config.json, model.safetensors, tokenizer files
├── checkpoints/                  # intermediate Trainer checkpoints (can be deleted after training)
├── training_config.json          # full config, precision, labels, base model + commit, split manifest SHA-256,
│                                 # parameters, metrics, package versions, model SHA-256
├── thresholds.json               # tuned thresholds, tuning curves, validation report
└── evaluation/
    ├── validation_predictions.json
    ├── test_report.json
    └── test_predictions.json
```

`tune-thresholds` and `evaluate` read the model and sequence settings from `training_config.json`, so inference
always matches training. A run trained with other labels is refused.

## Serving the model (TEI)

Serve the `model/` folder with Hugging Face Text Embeddings Inference. The CPU image is enough:

```bash
docker run --rm -p 8080:8080 -v "$PWD/training/outputs/chinese-roberta-v1/model:/model:ro" \
  ghcr.io/huggingface/text-embeddings-inference:cpu-1.8 --model-id /model --port 8080 --auto-truncate
```

Then set `TEI_URL=http://localhost:8080` in `apps/api/.env`. `GET /api/v1/health` checks that TEI serves a
classifier with exactly the labels `valid`, `question` and `invalid`. With Docker Compose, use the `classifier`
profile instead (root README).

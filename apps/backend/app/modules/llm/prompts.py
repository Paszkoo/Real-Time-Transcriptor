from typing import Literal

LlmTask = Literal["correct", "summarize", "extract_todos"]
SummaryFormat = Literal["bullets", "narrative"]


def build_correction_prompt(transcript: str) -> tuple[str, float]:
    prompt = f"""/no_think

You are correcting a speech-to-text transcript. Fix punctuation, capitalization,
and common ASR errors (homophones, missing commas, wrong sentence breaks, lowercase after pauses).
Do not change meaning, add content, or remove spoken words. Preserve speaker labels if present.
Return only the corrected transcript.

Transcript:
{transcript}"""
    return prompt.strip(), 0.1


def build_summary_prompt(transcript: str, summary_format: SummaryFormat) -> tuple[str, float]:
    if summary_format == "bullets":
        format_instruction = (
            "Return a concise bullet-point summary (5-10 bullets) "
            "covering key topics and decisions."
        )
    else:
        format_instruction = (
            "Return a concise narrative summary in 2-4 short paragraphs "
            "covering key topics and decisions."
        )

    prompt = f"""/think

Summarize the following conversation transcript for someone who was not present.
{format_instruction}
Use the same language as the transcript. Do not invent facts not supported by the text.

Transcript:
{transcript}"""
    return prompt.strip(), 0.5


def build_todos_prompt(transcript: str) -> tuple[str, float]:
    prompt = f"""/think

Extract actionable tasks, commitments, and follow-ups from this conversation transcript.
Return a markdown bullet list. Each item should start with "- " and be specific and actionable.
If there are no clear action items, return exactly: "No action items detected."

Transcript:
{transcript}"""
    return prompt.strip(), 0.5


def resolve_prompt(
    task: LlmTask,
    transcript: str,
    *,
    summary_format: SummaryFormat = "bullets",
) -> tuple[str, float]:
    if task == "correct":
        return build_correction_prompt(transcript)
    if task == "summarize":
        return build_summary_prompt(transcript, summary_format)
    if task == "extract_todos":
        return build_todos_prompt(transcript)
    raise ValueError(f"Unsupported LLM task: {task}")


def artifact_type_for_task(task: LlmTask, *, summary_format: SummaryFormat = "bullets") -> str:
    if task == "correct":
        return "correct"
    if task == "summarize":
        return f"summarize_{summary_format}"
    if task == "extract_todos":
        return "extract_todos"
    raise ValueError(f"Unsupported LLM task: {task}")

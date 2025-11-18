# Conversation Summary Prompt Template

This template is used to inject conversation summary context into chat messages.

## When Summary Exists

Use this format when a cached conversation summary is available:

```
Conversation summary (key facts, names, topics from earlier exchanges): {summary}
```

Replace `{summary}` with the actual cached summary content.

## When Summary is Being Built

Use this message when conversation history exists but summary hasn't been generated yet:

```
Note: Conversation summary is being built. Use recent conversation history for context.
```

## Usage

This prompt is loaded dynamically and formatted with the actual summary content when available.


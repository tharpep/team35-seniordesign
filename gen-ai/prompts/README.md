# Prompts Directory

This directory contains all prompts used by the gen-ai subsystem for better long-term development and easy editing.

## Prompt Files

### Chat System Prompts
- **`chat_system_prompt.md`** - Main system prompt for chat LLM interactions
  - Defines the AI assistant's role, capabilities, and response guidelines
  - Includes RAG context usage instructions
  - Used by ChatService for all chat interactions

### Conversation Context Prompts
- **`conversation_summary_with_content.txt`** - Template for injecting conversation summary when it exists
  - Format: `Conversation summary (key facts, names, topics from earlier exchanges): {summary}`
  - Placeholder: `{summary}` - The cached conversation summary
  - Used by ChatService when summary is available

- **`conversation_summary_building.txt`** - Message shown when conversation summary is being built
  - Used for early exchanges before summary generation
  - Instructs LLM to use recent conversation history for context

- **`conversation_summary_prompt.md`** - Documentation and template reference for conversation summary prompts
  - Explains when to use each template
  - Reference documentation only

- **`conversation_context_instructions.md`** - Comprehensive guide on conversation context handling
  - Documents all context layers (system prompt, RAG, summary, history)
  - Explains priority order and conflict resolution
  - Reference documentation for developers

### RAG Prompts
- **`rag_context_prefix.txt`** - Prefix text and instructions for RAG context in chat messages
  - Prepends retrieved documents with instructions on how to use them
  - Includes guidance to prioritize document information over general knowledge
  - Used when injecting RAG context into chat messages

- **`rag_query_template.txt`** - Template for RAG query prompts
  - Format: `Context: {context}\n\nQuestion: {question}\n\nAnswer:`
  - Used by BasicRAG.query() method for artifact generation (not chat)

### Summary Generation Prompts
- **`summary_generation_with_old.md`** - Template for generating summary with previous summary
  - Used when regenerating summary (sliding window approach)
  - Placeholders: `{old_summary}`, `{recent_conversation}`

- **`summary_generation_first.md`** - Template for first summary generation
  - Used when no previous summary exists
  - Placeholder: `{conversation}`

### Artifact Generation Prompts
- **`artifact_flashcard_template.txt`** - Template for flashcard generation
  - Placeholders: `{num_items}`, `{topic}`
  - Used by FlashcardGenerator

- **`artifact_mcq_template.txt`** - Template for MCQ generation
  - Placeholders: `{num_items}`, `{topic}`
  - Used by MCQGenerator

- **`artifact_insights_template.txt`** - Template for insights generation
  - Placeholders: `{num_items}`, `{topic}`
  - Used by InsightsGenerator

## Usage

All prompts are loaded dynamically at runtime. To edit a prompt:
1. Edit the corresponding file in this directory
2. Restart the API or service
3. Changes will be applied immediately

## Template Placeholders

Templates use Python string formatting placeholders:
- `{variable_name}` - Will be replaced with actual values at runtime
- Use `.format()` or f-strings to fill in placeholders

## Notes

- Markdown files (`.md`) support formatting and structure
- Text files (`.txt`) are plain text for simple prompts
- All prompts are loaded with UTF-8 encoding
- Fallback prompts exist in code if files are missing


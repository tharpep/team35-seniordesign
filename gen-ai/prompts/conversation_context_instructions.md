# Conversation Context Instructions

This document provides guidance on how to handle different types of conversation context in chat interactions.

## Context Layers

The chat system uses multiple layers of context:

1. **System Prompt** - Base instructions and role definition
2. **RAG Context** - Retrieved documents from vector store
3. **Conversation Summary** - Compressed long-term memory
4. **Recent History** - Last N exchanges in full detail
5. **Current Message** - User's current question

## Conversation Summary Usage

### When Summary Exists
- The summary contains key facts, names, and topics from earlier exchanges
- Always check the summary first when asked about names or facts
- The summary is a compressed version of older conversation history
- Recent exchanges (in history) take precedence over summary if there's a conflict

### When Summary is Being Built
- For early exchanges (before 5+ messages), summary may not exist yet
- In this case, rely on recent conversation history for context
- Summary generation happens in the background after responses

## Recent History Usage

- Recent history contains the last N exchanges (typically 10)
- These are the most recent user questions and assistant responses
- Use this for immediate context and conversation flow
- Recent history is always available, even when summary is not

## Name and Fact Recall

- **Priority order**: Recent history > Conversation summary > General knowledge
- If user asks "what's my name?", check:
  1. Recent conversation history first
  2. Conversation summary second
  3. If not found, acknowledge that the information wasn't provided
- Always be honest if information isn't available in context

## Context Conflicts

When information conflicts between layers:
- Prioritize most recent information (recent history over summary)
- If summary and recent history conflict, use recent history
- Acknowledge uncertainty if context is unclear


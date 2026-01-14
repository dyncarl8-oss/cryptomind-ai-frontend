# Gemini 3 Upgrade Reference

This document serves as a reference for transitioning from Gemini 2.0 Flash to Gemini 3 Flash within this LiveKit agent.

## 🎯 Upgrade Goal
Move current `gemini-2.0-flash-exp` model to `gemini-3-flash` for improved reasoning, lower latency, and enhanced technical analysis capabilities.

## 🔗 Critical Resources
- [LiveKit LLM Overview](https://docs.livekit.io/agents/models/llm/)
- [Realtime Models Overview](https://docs.livekit.io/agents/models/realtime/)
- [Gemini Live API Plugin Guide](https://docs.livekit.io/agents/models/realtime/plugins/gemini/)
- [Google AI Dev Guide - Gemini Live](https://ai.google.dev/gemini-api/docs/live)

## 🛠️ Implementation Details

### Model Identification
For `RealtimeModel` usage (Gemini Live API), use the following model string:
- `model="gemini-3-flash-preview"` (as of early 2026)
- Check for newer "live" or "native-audio" suffixes like `gemini-3-flash-live-001`.

### File Locations to Update
1. **[agent.py](file:///c:/Users/Admin/Desktop/working/agent-starter-react-main11%20-%20Copy/agent-starter-react-main11copy/agent/agent.py)**: Update the `RealtimeModel` constructor in `CryptoMindAssistant.__init__`.
2. **[requirements.txt](file:///c:/Users/Admin/Desktop/working/agent-starter-react-main11%20-%20Copy/agent-starter-react-main11copy/agent/requirements.txt)**: Ensure `livekit-plugins-google` is updated to the latest version to support the new model IDs.

### Capability Checklist
- [ ] Multimodal Support (Audio/Video/Text)
- [ ] Thinking Mode Support (Enabled via `ThinkingConfig`)
- [ ] Tool/Function Calling stability
- [ ] Low-latency turn detection (VAD)

## 🚀 Key Benefits
1. **Superior Technical Analysis**: Better handling of complex indicator calculations and narrative generations.
2. **Faster Response Times**: Near-instant voice interaction.
3. **Enhanced Context**: Improved retention of previous trading signals in long sessions.

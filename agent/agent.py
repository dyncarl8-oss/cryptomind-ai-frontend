"""
CryptoMind AI - Main Agent Entry Point
A sophisticated crypto trading assistant powered by LiveKit and Gemini
"""

from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import noise_cancellation
from livekit.plugins import google

from prompts import AGENT_INSTRUCTION, SESSION_INSTRUCTION
from tools import (
    analyze_trading_pair,
    get_crypto_price,
    quick_market_scan,
    explain_indicator
)

load_dotenv()


class CryptoMindAssistant(Agent):
    """
    CryptoMind AI - Your intelligent crypto trading assistant.
    
    Capabilities:
    - Real-time technical analysis of crypto pairs
    - 20+ technical indicators calculation
    - Signal aggregation and trade target generation
    - Educational explanations of market conditions
    """
    
    def __init__(self) -> None:
        super().__init__(
            instructions=AGENT_INSTRUCTION,
            llm=google.beta.realtime.RealtimeModel(
                voice="Aoede",
                temperature=0.7,  # Slightly lower for more consistent analysis
                # Enable thinking mode for transparent reasoning
            ),
            tools=[
                analyze_trading_pair,
                get_crypto_price,
                quick_market_scan,
                explain_indicator
            ],
        )


async def entrypoint(ctx: agents.JobContext):
    """
    Entry point for the CryptoMind AI agent.
    """
    session = AgentSession()
    
    # Provide access to the room for tools to send data packets
    from tools import set_room
    set_room(ctx.room)

    await session.start(
        room=ctx.room,
        agent=CryptoMindAssistant(),
        room_input_options=RoomInputOptions(
            video_enabled=True,
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    await ctx.connect()

    # Generate the initial greeting
    await session.generate_reply(
        instructions=SESSION_INSTRUCTION,
    )


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
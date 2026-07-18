from unittest import IsolatedAsyncioTestCase

from app.ai.gemini import GeminiClient, GeminiGenerationRequest


class GeminiClientTests(IsolatedAsyncioTestCase):
    async def test_fallback_refuses_numerical_risk_calculation(self):
        client = GeminiClient()
        result = await client.generate(
            GeminiGenerationRequest(
                question="Calculate a new numerical risk score for this gas leak.",
                current_situation="A gas leak is active during hot work.",
                evidence=["Gas concentration is above threshold."],
                applicable_regulations=["OSHA hot work guidance"],
                recommendations=["Suspend the permit."],
                conversation_history=[],
                citations=[
                    {
                        "document_name": "osha_regulation.txt",
                        "section": "Body",
                        "snippet": "Gas testing is required before hot work.",
                    }
                ],
                supporting_context={},
            )
        )

        self.assertIn("Compound Risk Engine", result.summary)
        self.assertEqual(result.provider, "offline-fallback")
        self.assertGreaterEqual(result.confidence, 0.0)

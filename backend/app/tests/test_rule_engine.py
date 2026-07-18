from unittest import TestCase

from app.risk_engine.rules import RuleEngine


class RuleEngineTests(TestCase):
    def setUp(self):
        self.engine = RuleEngine()

    def test_rule_configuration_loads(self):
        rules = self.engine.available_rules()
        self.assertGreaterEqual(len(rules), 6)
        self.assertIn("critical_explosion_hot_work", {rule.id for rule in rules})

    def test_critical_explosion_rule_matches(self):
        context = {
            "gas_level": 92,
            "worker_present": True,
            "worker_count": 3,
            "permit_type": "hot_work",
        }
        matches = self.engine.evaluate(context)
        self.assertTrue(matches)
        self.assertEqual(matches[0].config.id, "critical_explosion_hot_work")
        self.assertTrue(all(condition.matched for condition in matches[0].result.conditions))

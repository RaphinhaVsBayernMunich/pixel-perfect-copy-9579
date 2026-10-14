import contextlib
import importlib.util
import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("email_config", Path(__file__).resolve().parents[1] / "scripts/supabase-email-config.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class EmailConfigTests(unittest.TestCase):
    def config(self):
        return {"smtp_host": "smtp.resend.com", "smtp_user": "resend",
                "smtp_pass": "private-test-value", "mailer_autoconfirm": False,
                "site_url": "https://questos.questos-1fd92776.workers.dev",
                "external_google_secret": "private-google-test-value"}

    def test_audit_does_not_emit_secret_values(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            module.audit(self.config())
        self.assertNotIn("private-test-value", output.getvalue())
        self.assertNotIn("private-google-test-value", output.getvalue())
        self.assertIn('"mailer_autoconfirm": false', output.getvalue())

    def test_builtin_mailer_blocks_template_mutation(self):
        with patch.object(module, "cli_token", return_value="private-token"), \
             patch.object(module, "request", return_value={"smtp_host": None}) as request, \
             patch.object(sys, "argv", ["helper", "--apply-template"]), \
             contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(RuntimeError, "Custom SMTP is required"):
                module.main()
            self.assertEqual(request.call_count, 1)

    def test_only_template_fields_are_patched(self):
        before = self.config()
        body = (module.ROOT / "supabase/templates/confirmation.html").read_text()
        updates = {"mailer_subjects_confirmation": "Confirm your QuestOS account",
                   "mailer_templates_confirmation_content": body}
        after = {**before, **updates}
        with patch.object(module, "cli_token", return_value="private-token"), \
             patch.object(module, "request", side_effect=[before, {}, after]) as request, \
             patch.object(sys, "argv", ["helper", "--apply-template"]), \
             contextlib.redirect_stdout(io.StringIO()):
            module.main()
            self.assertEqual(request.call_args_list[1].args[1], updates)
            self.assertFalse(after["mailer_autoconfirm"])

    def test_changed_auth_security_setting_is_not_reported_as_success(self):
        before = self.config()
        after = {**before, "mailer_autoconfirm": True,
                 "mailer_subjects_confirmation": "Confirm your QuestOS account",
                 "mailer_templates_confirmation_content": (module.ROOT / "supabase/templates/confirmation.html").read_text()}
        with patch.object(module, "cli_token", return_value="private-token"), \
             patch.object(module, "request", side_effect=[before, {}, after]), \
             patch.object(sys, "argv", ["helper", "--apply-template"]), \
             contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(RuntimeError, "Another Auth setting changed"):
                module.main()


    def test_smtp_requires_verified_owned_domain_before_requesting_a_key(self):
        with patch.object(module, "cli_token", return_value="private-token"), \
             patch.object(module, "request", return_value=self.config()) as request, \
             patch.object(module.getpass, "getpass") as secret_input, \
             patch.object(sys, "argv", ["helper", "--apply-smtp"]), \
             contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(RuntimeError, "Verify oryxion.net"):
                module.main()
            self.assertEqual(request.call_count, 1)
            secret_input.assert_not_called()

    def test_smtp_configuration_is_pinned_and_secret_not_printed(self):
        before = self.config()
        body = (module.ROOT / "supabase/templates/confirmation.html").read_text()
        key = "re_" + "private" * 5
        after = {**before, **module.SMTP, "smtp_pass": key,
                 "mailer_subjects_confirmation": "Confirm your QuestOS account",
                 "mailer_templates_confirmation_content": body}
        output = io.StringIO()
        with patch.object(module, "cli_token", return_value="private-token"), \
             patch.object(module, "request", side_effect=[before, {}, after]) as request, \
             patch.object(module.getpass, "getpass", return_value=key), \
             patch.object(sys.stdin, "isatty", return_value=True), \
             patch.object(sys, "argv", ["helper", "--apply-smtp", "--verified-domain", "oryxion.net"]), \
             contextlib.redirect_stdout(output):
            module.main()
            changes = request.call_args_list[1].args[1]
            self.assertEqual(changes["smtp_admin_email"], "noreply@oryxion.net")
            self.assertEqual(changes["smtp_host"], "smtp.resend.com")
            self.assertNotIn("mailer_autoconfirm", changes)
            self.assertNotIn("external_google_secret", changes)
            self.assertNotIn(key, output.getvalue())


if __name__ == "__main__":
    unittest.main()

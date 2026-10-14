"""Owner-only Windows CLI: audit Auth, apply a public template, or configure verified SMTP.

Uses the existing Supabase CLI credential in memory. Never prints API responses or secrets.
SMTP mode uses hidden local input, pins oryxion.net, and requires prior domain verification.
Never sends email, changes confirmation/redirects/limits, or modifies Google OAuth.
"""

import argparse
import ctypes
import ctypes.wintypes as w
import getpass
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

PROJECT = "kqsoccbtookvwelctyhm"
ROOT = Path(__file__).resolve().parent.parent
URL = f"https://api.supabase.com/v1/projects/{PROJECT}/config/auth"
SMTP = {
    "smtp_host": "smtp.resend.com",
    "smtp_port": "465",
    "smtp_user": "resend",
    "smtp_admin_email": "noreply@oryxion.net",
    "smtp_sender_name": "QuestOS",
}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Credential(ctypes.Structure):
    _fields_ = [
        ("Flags", w.DWORD), ("Type", w.DWORD), ("TargetName", w.LPWSTR),
        ("Comment", w.LPWSTR), ("LastWritten", w.FILETIME),
        ("CredentialBlobSize", w.DWORD), ("CredentialBlob", ctypes.POINTER(ctypes.c_byte)),
        ("Persist", w.DWORD), ("AttributeCount", w.DWORD),
        ("Attributes", ctypes.c_void_p), ("TargetAlias", w.LPWSTR), ("UserName", w.LPWSTR),
    ]


def cli_token():
    credential = ctypes.POINTER(Credential)()
    api = ctypes.WinDLL("Advapi32.dll")
    api.CredReadW.argtypes = [w.LPCWSTR, w.DWORD, w.DWORD, ctypes.POINTER(ctypes.POINTER(Credential))]
    api.CredFree.argtypes = [ctypes.c_void_p]
    if not api.CredReadW("Supabase CLI:supabase", 1, 0, ctypes.byref(credential)):
        raise RuntimeError("Existing Supabase CLI credential is unavailable.")
    try:
        raw = ctypes.string_at(credential.contents.CredentialBlob, credential.contents.CredentialBlobSize)
    finally:
        api.CredFree(credential)
    for encoding in ["utf-16-le", "utf-8"]:
        try:
            value = raw.decode(encoding).strip("\x00")
            if re.fullmatch(r"sbp_[a-zA-Z0-9]+", value):
                return value
        except UnicodeError:
            pass
    raise RuntimeError("Existing credential cannot be read privately.")


def request(token, changes=None):
    req = urllib.request.Request(
        URL,
        data=None if changes is None else json.dumps(changes).encode(),
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
        method="GET" if changes is None else "PATCH",
    )
    try:
        with urllib.request.build_opener(NoRedirect()).open(req, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        try:
            failure = json.load(error)
            message = str(failure.get("message", ""))
            hints = [word for word in ["smtp", "custom", "template", "email", "permission"]
                     if word in message.lower()]
        except Exception:
            hints = []
        raise RuntimeError(f"Auth configuration request failed (HTTP {error.code}; hints={','.join(hints)}).") from None
    except Exception:
        raise RuntimeError("Auth configuration request failed; retry privately.") from None


def audit(config):
    fields = ["disable_signup", "external_email_enabled", "mailer_autoconfirm", "site_url",
              "uri_allow_list", "smtp_host", "smtp_port", "smtp_admin_email", "smtp_sender_name",
              "rate_limit_email_sent", "smtp_max_frequency", "hook_send_email_enabled",
              "external_google_enabled", "mailer_subjects_confirmation"]
    result = {key: config.get(key) for key in fields}
    result["smtpCredentialsPresent"] = bool(config.get("smtp_user") and config.get("smtp_pass"))
    template = config.get("mailer_templates_confirmation_content") or ""
    result["confirmationTemplateContentPresent"] = bool(template)
    result["templateBrandedQuestOS"] = "QuestOS" in template
    result["templateUsesConfirmationURL"] = "{{ .ConfirmationURL }}" in template
    result["templateContainsLovable"] = "lovable" in template.lower()
    print(json.dumps(result))


def main():
    parser = argparse.ArgumentParser()
    actions = parser.add_mutually_exclusive_group()
    actions.add_argument("--apply-template", action="store_true")
    actions.add_argument("--apply-smtp", action="store_true")
    parser.add_argument("--verified-domain", choices=["oryxion.net"])
    args = parser.parse_args()
    token = cli_token()
    before = request(token)
    audit(before)
    if not args.apply_template and not args.apply_smtp:
        return
    if args.apply_template and (not before.get("smtp_host") or not before.get("smtp_user") or not before.get("smtp_pass")):
        raise RuntimeError("Custom SMTP is required before template customization; prepared template remains local.")
    body = (ROOT / "supabase/templates/confirmation.html").read_text(encoding="utf-8")
    if body.count("{{ .ConfirmationURL }}") != 1 or "lovable" in body.lower():
        raise RuntimeError("Confirmation template validation failed.")
    updates = {"mailer_subjects_confirmation": "Confirm your QuestOS account",
               "mailer_templates_confirmation_content": body}
    if args.apply_smtp:
        if args.verified_domain != "oryxion.net":
            raise RuntimeError("Verify oryxion.net in Resend first, then pass --verified-domain oryxion.net.")
        if not sys.stdin.isatty():
            raise RuntimeError("SMTP key input requires a private interactive local terminal.")
        if before.get("mailer_autoconfirm") is not False or before.get("site_url") != "https://questos.questos-1fd92776.workers.dev":
            raise RuntimeError("Confirmation/production URL is unexpected; inspect privately before continuing.")
        sending_key = getpass.getpass("Resend sending-only key for oryxion.net (hidden): ")
        if not re.fullmatch(r"re_[A-Za-z0-9_-]{20,200}", sending_key):
            raise RuntimeError("Invalid sending credential format; no SMTP changes made.")
        updates.update(SMTP)
        updates["smtp_pass"] = sending_key
    if any(before.get(key) != value for key, value in updates.items()):
        request(token, updates)
    after = request(token)
    if any(after.get(key) != value for key, value in updates.items() if key != "smtp_pass"):
        raise RuntimeError("Configuration readback does not match; no success claimed.")
    if args.apply_smtp and not after.get("smtp_pass"):
        raise RuntimeError("SMTP credential readback is absent; no success claimed.")
    preserved = ["mailer_autoconfirm", "disable_signup", "external_email_enabled", "site_url",
                 "uri_allow_list", "external_google_enabled", "external_google_client_id",
                 "external_google_secret", "smtp_host", "smtp_port", "smtp_user", "smtp_pass",
                 "smtp_admin_email", "smtp_sender_name", "rate_limit_email_sent", "smtp_max_frequency"]
    if args.apply_smtp:
        preserved = [key for key in preserved if key not in SMTP and key != "smtp_pass"]
    if any(before.get(key) != after.get(key) for key in preserved):
        raise RuntimeError("Another Auth setting changed; inspect privately before continuing.")
    print(json.dumps({"confirmationTemplateApplied": True, "smtpApplied": args.apply_smtp,
                      "authGoogleRedirectsAndLimitsPreserved": True}))
    audit(after)


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as error:
        raise SystemExit(str(error)) from None

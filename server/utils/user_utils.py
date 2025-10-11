def check_attention_needed(user):
    """Check if any important field is missing."""
    required_fields = ["city", "country", "name", "email", "latest_resume_id"]
    for field in required_fields:
        if not user.get(field):
            return True
    # Resume check: either latest_resume_id or resume object exists
    if not user.get("latest_resume_id") and not user.get("resume"):
        return True
    return False
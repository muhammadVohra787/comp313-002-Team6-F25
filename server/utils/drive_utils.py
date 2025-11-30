import json
from typing import Optional, Dict, Any

import requests


GOOGLE_DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files"


class GoogleDriveError(Exception):
    """Raised when a Google Drive API call fails."""
    pass


def upload_file_to_drive(
    google_access_token: str,
    file_bytes: bytes,
    file_name: str,
    mime_type: str,
    folder_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Upload a single file to the user's Google Drive using the drive.file scope.

    Args:
        google_access_token: OAuth 2.0 bearer token obtained via chrome.identity.
        file_bytes: Raw file content.
        file_name: Name to assign in Drive.
        mime_type: MIME type of the file (e.g. 'application/msword').
        folder_id: Optional Drive folder ID to upload into.

    Returns:
        A dict with file metadata (id, name, webViewLink, webContentLink).

    Raises:
        GoogleDriveError: if the Drive API returns a non-2xx response.
    """
    headers = {
        "Authorization": f"Bearer {google_access_token}",
    }

    metadata: Dict[str, Any] = {
        "name": file_name,
    }
    if folder_id:
        metadata["parents"] = [folder_id]

    # multipart upload: metadata + file content
    params = {
        "uploadType": "multipart",
        "fields": "id,name,webViewLink,webContentLink",
    }

    files = {
        "metadata": (
            "metadata",
            json.dumps(metadata),
            "application/json; charset=UTF-8",
        ),
        "file": (
            file_name,
            file_bytes,
            mime_type or "application/octet-stream",
        ),
    }

    resp = requests.post(
        GOOGLE_DRIVE_UPLOAD_URL,
        headers=headers,
        params=params,
        files=files,
    )

    if not resp.ok:
        try:
            err_json = resp.json()
        except Exception:
            err_json = {"error": resp.text}
        raise GoogleDriveError(f"Drive upload failed: {err_json}")

    return resp.json()

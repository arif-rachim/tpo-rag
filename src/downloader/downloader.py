#!/usr/bin/env python3
"""
SharePoint Downloader with NTLM Authentication
Ultra-simple, single file Python implementation
"""
import os
import sys
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import quote

import requests
import urllib3
from requests_ntlm import HttpNtlmAuth

import config

# ============================================================================
# CONFIGURATION - Edit these values for your SharePoint site
# ============================================================================
SITE_URL = config.PORTAL_URL
USERNAME = config.PORTAL_LDAP_USER
PASSWORD = config.PORTAL_LDAP_PASSWORD
DOMAIN = config.PORTAL_LDAP_DOMAIN
LIBRARY_NAME = config.PORTAL_LIBRARY_NAME
OUTPUT_FOLDER = config.PATH_DOCUMENTS

MAX_RESULTS = 5000
IGNORE_CERT = True  # Set to False in production!

# Disable SSL warnings if IGNORE_CERT is True
if IGNORE_CERT:
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


# ============================================================================
# MAIN FUNCTION
# ============================================================================

def main() -> None:
    """
    Download documents from SharePoint library using NTLM authentication.

    Connects to the configured SharePoint site, fetches all files from the
    specified document library, and downloads them to the local OUTPUT_FOLDER.
    Displays progress with emoji indicators for success/failure.
    """
    print("🚀 Starting SharePoint downloader...\n")

    # Setup NTLM authentication
    # auth = HttpNtlmAuth(f"{DOMAIN}\\{USERNAME}", PASSWORD)
    auth = HttpNtlmAuth(f"{DOMAIN}\\{USERNAME}", PASSWORD)
    session = requests.Session()
    session.auth = auth

    if IGNORE_CERT:
        session.verify = False
        print("⚠️  WARNING: SSL certificate verification is DISABLED!\n")

    # Build SharePoint REST API URL
    encoded_library = quote(LIBRARY_NAME)
    api_url = f"{SITE_URL}/_api/web/lists/getbytitle('{encoded_library}')/items"
    query = f"?$filter=FSObjType eq 0&$select=FileRef,FileLeafRef&$top={MAX_RESULTS}"
    full_url = api_url + query

    # Fetch file list from SharePoint
    print("📡 Fetching file list from SharePoint...")
    try:
        response = session.get(
            full_url,
            headers={"Accept": "application/json;odata=verbose"},
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to fetch file list: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Failed to parse response: {e}")
        sys.exit(1)

    # Extract files from JSON response
    files: List[Dict[str, Any]] = data.get("d", {}).get("results", [])
    print(f"📋 Found {len(files)} files\n")

    if len(files) == 0:
        print("⚠️  No files found")
        return

    # Create output directory
    download_folder = (Path(__file__).parent.parent.parent / OUTPUT_FOLDER).resolve()

    os.makedirs(download_folder, exist_ok=True)

    # Download files
    success_count: int = 0
    fail_count: int = 0

    for i, file_info in enumerate(files, 1):
        file_name: str = file_info.get("FileLeafRef", "")
        file_url_path: str = file_info.get("FileRef", "")

        if not file_name or not file_url_path:
            continue

        print(f"[{str(i)}/{str(len(files))}] Downloading: {file_name}")

        try:
            # Download file
            file_url = SITE_URL + file_url_path
            file_response = session.get(file_url, timeout=60)
            file_response.raise_for_status()

            # Sanitize filename (remove invalid characters)
            safe_name = file_name.translate(str.maketrans('<>:"/\\|?*', '_________'))

            # Save file (overwrites if exists)
            local_path = os.path.join(download_folder, safe_name)
            with open(local_path, "wb") as f:
                f.write(file_response.content)

            size_kb = len(file_response.content) / 1024
            print(f"  ✅ Saved ({size_kb:.1f} KB)")
            success_count += 1

        except Exception as e:
            print(f"  ❌ Failed: {e}")
            fail_count += 1

    print(f"\n🎉 Download complete!")
    print(f"   Success: {success_count} files")
    print(f"   Failed: {fail_count} files")


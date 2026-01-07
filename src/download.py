
import sys
from downloader import downloader

# ============================================================================
# EXECUTE
# ============================================================================

if __name__ == '__main__':
    try:
        downloader.main()
    except KeyboardInterrupt:
        print("Download interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)

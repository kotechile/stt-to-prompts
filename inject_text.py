import sys
import os
import time

def inject_text(text, target_app=None):
    """
    Injects text into the target application using AppleScript.
    If target_app is None, it injects into the currently active application.
    """
    # Escape single quotes and backslashes
    escaped_text = text.replace('\\', '\\\\').replace('"', '\\"')
    
    if target_app:
        script = f'''
        tell application "{target_app}" to activate
        delay 0.5
        tell application "System Events"
            keystroke "{escaped_text}"
        end tell
        '''
    else:
        script = f'''
        tell application "System Events"
            keystroke "{escaped_text}"
        end tell
        '''
    
    # Run the AppleScript
    os.system(f"osascript -e '{script}'")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        text_to_inject = sys.argv[1]
        target = sys.argv[2] if len(sys.argv) > 2 else None
        inject_text(text_to_inject, target)
    else:
        print("Usage: python3 inject_text.py 'your text' [target_app]")

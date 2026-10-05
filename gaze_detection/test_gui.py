"""Minimal OpenCV window test — try all methods."""
import cv2
import numpy as np
import ctypes

print(f"OpenCV: {cv2.__version__}", flush=True)

# Force window to foreground using Win32 API
def bring_to_front(window_name):
    try:
        import ctypes
        hwnd = ctypes.windll.user32.FindWindowW(None, window_name)
        if hwnd:
            ctypes.windll.user32.SetForegroundWindow(hwnd)
            ctypes.windll.user32.ShowWindow(hwnd, 9)  # SW_RESTORE
            print(f"  Brought window '{window_name}' to front (hwnd={hwnd})", flush=True)
        else:
            print(f"  Window '{window_name}' not found via Win32", flush=True)
    except Exception as e:
        print(f"  Win32 error: {e}", flush=True)

# Create a bright test image
img = np.zeros((480, 640, 3), dtype=np.uint8)
img[:] = (50, 50, 50)
cv2.putText(img, "CAN YOU SEE THIS?", (100, 200),
            cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
cv2.putText(img, "Press Q in this window to close", (80, 300),
            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 200, 255), 2)

# Method: Simple imshow
print("\nShowing window 'GazeTest'...", flush=True)
cv2.namedWindow("GazeTest", cv2.WINDOW_NORMAL)
cv2.resizeWindow("GazeTest", 640, 480)
cv2.imshow("GazeTest", img)
cv2.waitKey(100)  # let it render

# Try to force it to front
bring_to_front("GazeTest")

print("Window should be visible now.", flush=True)
print("Press Q in the window to quit (waiting 30 seconds)...", flush=True)

for i in range(300):
    cv2.imshow("GazeTest", img)
    key = cv2.waitKey(100) & 0xFF
    if key == ord('q'):
        print("Q pressed!", flush=True)
        break
else:
    print("Timeout.", flush=True)

cv2.destroyAllWindows()

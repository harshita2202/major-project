# Real-Time Gaze Detection System

A modular real-time gaze estimation system that uses a live webcam feed to estimate where a person is looking on their computer screen.

## Architecture

```
Webcam (capture.py)
   ↓
Face + Landmark Detection (landmarks.py)
   ↓
Face Region Extraction (eye_crop.py)
   ↓
Head Pose Estimation (head_pose.py)
   ↓
L2CS-Net Gaze Estimation (gaze_model.py)
   ↓
Pitch + Yaw
   ↓
Calibration Mapping (calibration.py)
   ↓
Screen Coordinates (X, Y)
   ↓
Temporal Smoothing (smoothing.py)
   ↓
Final Gaze Point
   ↓
Visualization (visualization.py)
```

## Project Structure

```
gaze_detection/
├── main.py              # Pipeline coordinator
├── capture.py           # Webcam capture + FPS counter
├── landmarks.py         # MediaPipe Face Mesh + iris landmarks
├── eye_crop.py          # Eye region extraction + geometric fallback
├── head_pose.py         # Head pose via cv2.solvePnP
├── gaze_model.py        # L2CS-Net model loading + inference
├── calibration.py       # 9-point screen calibration
├── smoothing.py         # EMA temporal smoothing
├── visualization.py     # Drawing overlays
├── requirements.txt
├── README.md
├── models/
│   └── l2cs_net/        # Place L2CSNet_gaze360.pkl here
├── calibration_data/
│   └── calibration.json # Saved calibration (auto-generated)
└── tests/
    ├── test_capture.py
    ├── test_landmarks.py
    ├── test_eye_crop.py
    ├── test_head_pose.py
    └── test_calibration.py
```

## Installation

### 1. Python Environment

Requires **Python 3.9+**.

```bash
# Create a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### 2. Dependencies

| Package | Purpose |
|---|---|
| `opencv-python` | Video capture, image processing, display |
| `mediapipe` | Face mesh + iris landmark detection |
| `torch` | L2CS-Net model inference |
| `torchvision` | Image transforms for L2CS-Net preprocessing |
| `numpy` | Numerical operations |
| `scikit-learn` | Calibration regression |

### 3. L2CS-Net Weights (Auto-Downloaded)

The L2CS-Net model weights are **automatically downloaded** from Hugging Face on first run.

- **Source**: [py-feat/l2cs on Hugging Face](https://huggingface.co/py-feat/l2cs)
- **File**: `l2cs_gaze360_resnet50.safetensors` (~96 MB)
- **Location**: Auto-saved to `models/l2cs_net/`

No manual download is needed. If you already have the original `L2CSNet_gaze360.pkl`, place it in `models/l2cs_net/` and it will be used instead.

If auto-download fails (e.g., no internet), you can manually download:
```bash
# Direct download URL:
https://huggingface.co/py-feat/l2cs/resolve/main/l2cs_gaze360_resnet50.safetensors
# Save to: models/l2cs_net/l2cs_gaze360_resnet50.safetensors
```

**Without the weights**: The system still runs using the geometric iris-based fallback estimator. This provides coarse directional gaze (LEFT/CENTER/RIGHT/UP/DOWN) but cannot produce accurate screen coordinates for calibration.

## How to Run

### Basic Usage (Phase 1 — works without L2CS-Net weights)

```bash
cd gaze_detection
python main.py
```

This opens the webcam and shows:
- Face landmarks and iris points
- Eye bounding boxes
- Geometric gaze direction (LEFT/CENTER/RIGHT/UP/DOWN)
- FPS counter
- "FACE NOT DETECTED" when no face is visible

### Full Pipeline (with L2CS-Net)

1. Run (weights auto-download on first launch):
   ```bash
   python main.py
   ```
2. Press **`c`** to run 9-point calibration
3. After calibration, estimated screen coordinates appear in the HUD

### Keyboard Controls

| Key | Action |
|---|---|
| `q` | Quit |
| `c` | Run 9-point screen calibration |
| `r` | Reset the temporal smoother |
| `g` | Toggle fullscreen gaze-dot window |
| `f` | Force geometric fallback mode |

## How Calibration Works

The 9-point calibration maps gaze angles to screen coordinates:

1. Nine target dots are displayed at positions across the screen:
   ```
   ●          ●          ●     (top)
   ●          ●          ●     (middle)
   ●          ●          ●     (bottom)
   ```

2. For each target:
   - You look at the green dot and press **SPACE**
   - The system collects ~30 frames of gaze angle measurements
   - It averages the pitch/yaw values for that target position

3. After all 9 points, a **Ridge regression** is fitted:
   ```
   screen_x = f(pitch, yaw)
   screen_y = g(pitch, yaw)
   ```

4. The calibration is saved to `calibration_data/calibration.json` and loaded automatically on future runs.

5. Press **`c`** at any time to recalibrate.

### When to Recalibrate

- After moving your chair/head position significantly
- After adjusting monitor position
- After changing the camera angle

## Explanation of Pitch and Yaw

**Pitch** and **yaw** describe the direction someone is looking:

```
            UP (pitch < 0)
              ↑
              |
LEFT ←--------●--------→ RIGHT
(yaw < 0)     |          (yaw > 0)
              ↓
           DOWN (pitch > 0)
```

- **Pitch** = vertical rotation (looking up/down)
  - Negative = looking up
  - Positive = looking down

- **Yaw** = horizontal rotation (looking left/right)
  - Negative = looking left
  - Positive = looking right

Both are measured in **radians** by the gaze model.

## Explanation of Head Pose

Head pose measures the 3D orientation of the head using `cv2.solvePnP`:

- **Yaw** (head turning left/right): +ve = turning right
- **Pitch** (head tilting up/down): +ve = looking down
- **Roll** (head tilting sideways): +ve = tilting clockwise

The estimation uses 6 facial landmarks (nose tip, chin, eye corners, mouth corners) matched against a generic 3D face model. RGB axes are drawn at the nose tip:
- **Red** = X axis (right)
- **Green** = Y axis (down)
- **Blue** = Z axis (forward)

## Explanation of Temporal Smoothing

Raw gaze estimates are noisy frame-to-frame. The **Exponential Moving Average (EMA)** smoother reduces jitter:

```
smoothed_x = α × current_x + (1 − α) × previous_x
smoothed_y = α × current_y + (1 − α) × previous_y
```

- **α = 0.3** (default): Good balance between responsiveness and stability
- **Higher α** (e.g., 0.7): More responsive, more jitter
- **Lower α** (e.g., 0.1): Very smooth, more lag

The smoother is independent of the gaze model and works on any (x, y) coordinate stream.

## CPU/GPU Requirements

| Mode | Requirement |
|---|---|
| **CPU (default)** | Any modern laptop. MediaPipe runs efficiently on CPU. L2CS-Net will be slower (~5-10 FPS) but functional. |
| **GPU (automatic)** | If CUDA is available, PyTorch automatically uses it for L2CS-Net inference. Expect 25-30+ FPS. |

The system detects CUDA availability at startup and prints:
```
[gaze_model] Using device: cuda   # or 'cpu'
```

## Running Tests

```bash
pip install pytest
python -m pytest tests/ -v
```

## Known Limitations

1. **Single-person tracking**: Only the largest face is tracked. Multiple faces are detected but ignored.

2. **Calibration sensitivity**: The linear regression calibration assumes a roughly fixed head distance from the screen. Large movements degrade accuracy.

3. **Geometric fallback is coarse**: Without L2CS-Net weights, only 5 direction labels are available (no screen coordinate estimation).

4. **Lighting dependence**: Both MediaPipe and L2CS-Net perform best with even, frontal lighting.

5. **Camera quality**: Low-resolution or laggy webcams reduce landmark precision.

6. **Head pose approximation**: The camera intrinsics are estimated from frame dimensions (no real camera calibration).

7. **Internet required on first run**: The L2CS-Net weights (~96 MB) are auto-downloaded from Hugging Face on first launch.

## Future Improvements

1. **Kalman filter smoothing**: More sophisticated than EMA, can model velocity and predict ahead.

2. **Polynomial calibration**: Use `ScreenCalibrator(poly_degree=2)` for a non-linear mapping (already supported in code).

3. **Multi-face gaze**: Track gaze for all detected faces simultaneously.

4. **Blink detection**: Use eye aspect ratio from landmarks to detect blinks.

5. **Attention heatmap**: Aggregate gaze points over time to visualize attention patterns.

6. **Camera calibration**: Use a proper camera calibration (checkerboard) for more accurate head pose.

7. **ONNX export**: Convert L2CS-Net to ONNX for faster CPU inference.

8. **Auto-recalibration**: Detect calibration drift and prompt recalibration.

9. **Swappable gaze models**: The `GazePredictor` interface is designed so that alternative models (e.g., GazeNet, ETH-XGaze) can replace L2CS-Net without changing the pipeline.

"""
gaze_model.py — L2CS-Net gaze estimation model.

Loads a pretrained L2CS-Net (ResNet-50 backbone, Gaze360 weights) and
predicts gaze pitch/yaw from a face crop.

Architecture reference:
    Abdelrahman, A. A., et al. "L2CS-Net: Fine-Grained Gaze Estimation
    in Unconstrained Environments." (2023)
    https://github.com/Ahmednull/L2CS-Net

Model details:
    - Backbone: ResNet-50 (modified — two fc heads, no final fc1000)
    - Input: 448 × 448 face crop, ImageNet-normalised
    - Output: 90-bin classification for pitch and yaw
    - Angle range: each bin covers 4° over [-180°, 180°)
    - Conversion: softmax → weighted sum of bin centres → radians

Checkpoint (two supported formats):
    1. l2cs_gaze360_resnet50.safetensors (recommended)
       From: https://huggingface.co/py-feat/l2cs
       Auto-downloaded on first run.

    2. L2CSNet_gaze360.pkl (original, if you already have it)
       From: https://drive.google.com/drive/folders/17p6ORr-JQJcw-eYtG2WGNiuS_qVKwdWd

This module deliberately re-implements only the L2CS model class (and
the minimal ResNet building blocks it needs) so that we do NOT depend
on the ``l2cs`` or ``face_detection`` pip packages.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms

from landmarks import FaceData


# ------------------------------------------------------------------ #
#  Data structures
# ------------------------------------------------------------------ #

@dataclass
class GazeResult:
    """Predicted gaze angles."""
    pitch: float   # radians — positive = looking down
    yaw: float     # radians — positive = looking right


# ====================================================================
#  ResNet building blocks (copied verbatim from torchvision so the
#  state-dict keys match the pretrained checkpoint).
# ====================================================================

def _conv3x3(in_planes: int, out_planes: int, stride: int = 1) -> nn.Conv2d:
    return nn.Conv2d(in_planes, out_planes, kernel_size=3, stride=stride,
                     padding=1, bias=False)


class BasicBlock(nn.Module):
    expansion = 1

    def __init__(self, inplanes, planes, stride=1, downsample=None):
        super().__init__()
        self.conv1 = _conv3x3(inplanes, planes, stride)
        self.bn1 = nn.BatchNorm2d(planes)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = _conv3x3(planes, planes)
        self.bn2 = nn.BatchNorm2d(planes)
        self.downsample = downsample
        self.stride = stride

    def forward(self, x):
        identity = x
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        if self.downsample is not None:
            identity = self.downsample(x)
        out += identity
        return self.relu(out)


class Bottleneck(nn.Module):
    expansion = 4

    def __init__(self, inplanes, planes, stride=1, downsample=None):
        super().__init__()
        self.conv1 = nn.Conv2d(inplanes, planes, kernel_size=1, bias=False)
        self.bn1 = nn.BatchNorm2d(planes)
        self.conv2 = nn.Conv2d(planes, planes, kernel_size=3, stride=stride,
                               padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(planes)
        self.conv3 = nn.Conv2d(planes, planes * self.expansion, kernel_size=1,
                               bias=False)
        self.bn3 = nn.BatchNorm2d(planes * self.expansion)
        self.relu = nn.ReLU(inplace=True)
        self.downsample = downsample
        self.stride = stride

    def forward(self, x):
        identity = x
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.relu(self.bn2(self.conv2(out)))
        out = self.bn3(self.conv3(out))
        if self.downsample is not None:
            identity = self.downsample(x)
        out += identity
        return self.relu(out)


# ====================================================================
#  L2CS-Net model
# ====================================================================

class L2CS(nn.Module):
    """L2CS-Net: ResNet backbone with two classification heads for
    gaze pitch and yaw (``num_bins`` bins each)."""

    def __init__(self, block, layers, num_bins: int):
        super().__init__()
        self.inplanes = 64
        self.conv1 = nn.Conv2d(3, 64, kernel_size=7, stride=2, padding=3,
                               bias=False)
        self.bn1 = nn.BatchNorm2d(64)
        self.relu = nn.ReLU(inplace=True)
        self.maxpool = nn.MaxPool2d(kernel_size=3, stride=2, padding=1)
        self.layer1 = self._make_layer(block, 64, layers[0])
        self.layer2 = self._make_layer(block, 128, layers[1], stride=2)
        self.layer3 = self._make_layer(block, 256, layers[2], stride=2)
        self.layer4 = self._make_layer(block, 512, layers[3], stride=2)
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))

        # Two independent fully-connected heads: one for yaw, one for pitch.
        self.fc_yaw_gaze = nn.Linear(512 * block.expansion, num_bins)
        self.fc_pitch_gaze = nn.Linear(512 * block.expansion, num_bins)

        # Weight initialisation (Kaiming for conv, constant for BN).
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode="fan_out",
                                       nonlinearity="relu")
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)

    def _make_layer(self, block, planes, blocks, stride=1):
        downsample = None
        if stride != 1 or self.inplanes != planes * block.expansion:
            downsample = nn.Sequential(
                nn.Conv2d(self.inplanes, planes * block.expansion,
                          kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(planes * block.expansion),
            )
        layers = [block(self.inplanes, planes, stride, downsample)]
        self.inplanes = planes * block.expansion
        for _ in range(1, blocks):
            layers.append(block(self.inplanes, planes))
        return nn.Sequential(*layers)

    def forward(self, x):
        x = self.relu(self.bn1(self.conv1(x)))
        x = self.maxpool(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)

        # Two heads share the same backbone features.
        yaw = self.fc_yaw_gaze(x)
        pitch = self.fc_pitch_gaze(x)
        return yaw, pitch


# ====================================================================
#  Preprocessing (must match the official L2CS-Net training pipeline)
# ====================================================================

_TRANSFORM = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize(448),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],   # ImageNet mean
        std=[0.229, 0.224, 0.225],     # ImageNet std
    ),
])

NUM_BINS = 90
# Each bin spans 4° over [-180°, 180°).
_BIN_WIDTH_DEG = 4.0
# Bin centres in degrees: −178, −174, … , +178
_IDX_TENSOR = torch.FloatTensor(list(range(NUM_BINS)))


# ====================================================================
#  High-level API
# ====================================================================

class GazePredictor:
    """Loads L2CS-Net and provides a ``predict(frame, face)`` method.

    Weights are auto-downloaded from Hugging Face on first run if not
    found locally.

    Usage::

        predictor = GazePredictor()
        result = predictor.predict(frame, face)
        print(result.pitch, result.yaw)
    """

    # Default weight paths (searched in order).
    _SAFETENSORS_NAME = "l2cs_gaze360_resnet50.safetensors"
    _PKL_NAME = "L2CSNet_gaze360.pkl"
    _HF_URL = (
        "https://huggingface.co/py-feat/l2cs/resolve/main/"
        "l2cs_gaze360_resnet50.safetensors"
    )

    def __init__(
        self,
        weights_path: str | Path | None = None,
        device: Optional[str] = None,
    ) -> None:
        """
        Args:
            weights_path: Path to weight file (``.safetensors`` or ``.pkl``).
                          If ``None``, searches ``models/l2cs_net/`` and
                          auto-downloads from Hugging Face if not found.
            device: ``'cuda'``, ``'cpu'``, or ``None`` (auto-detect).
        """
        self._weights_path = self._resolve_weights(weights_path)

        # Device selection -----------------------------------------------
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        self._device = torch.device(device)
        print(f"[gaze_model] Using device: {self._device}")

        # Model loading --------------------------------------------------
        self._model = _load_model(self._weights_path, self._device)

        # Pre-compute bin index tensor on the target device.
        self._idx_tensor = _IDX_TENSOR.to(self._device)
        self._softmax = nn.Softmax(dim=1)

    def _resolve_weights(self, explicit_path: str | Path | None) -> Path:
        """Find or download the weight file."""
        models_dir = Path(__file__).parent / "models" / "l2cs_net"
        models_dir.mkdir(parents=True, exist_ok=True)

        if explicit_path is not None:
            p = Path(explicit_path)
            if p.is_file():
                return p
            raise FileNotFoundError(f"Weights not found at {p}")

        # Search for existing weights in models/l2cs_net/
        for name in [self._SAFETENSORS_NAME, self._PKL_NAME]:
            candidate = models_dir / name
            if candidate.is_file():
                return candidate

        # Auto-download from Hugging Face --------------------------------
        dest = models_dir / self._SAFETENSORS_NAME
        print(f"[gaze_model] Weights not found. Downloading from Hugging Face …")
        print(f"  URL:  {self._HF_URL}")
        print(f"  Dest: {dest}")
        try:
            import urllib.request
            urllib.request.urlretrieve(self._HF_URL, str(dest))
            print(f"[gaze_model] Download complete ({dest.stat().st_size / 1e6:.1f} MB)")
            return dest
        except Exception as e:
            raise RuntimeError(
                f"Failed to download L2CS-Net weights: {e}\n"
                f"You can manually download from:\n"
                f"  {self._HF_URL}\n"
                f"and place the file at:\n"
                f"  {dest}"
            ) from e

    # ------------------------------------------------------------------ #
    #  Prediction
    # ------------------------------------------------------------------ #

    def predict(
        self,
        frame: np.ndarray,
        face: FaceData,
    ) -> Optional[GazeResult]:
        """Predict gaze pitch and yaw for the given face.

        Args:
            frame: Full BGR webcam frame.
            face:  ``FaceData`` with bounding box.

        Returns:
            ``GazeResult`` with pitch/yaw in radians, or ``None`` on
            failure.
        """
        face_img = self._crop_face(frame, face)
        if face_img is None:
            return None

        tensor = self._preprocess(face_img)
        pitch, yaw = self._infer(tensor)
        return GazeResult(pitch=pitch, yaw=yaw)

    # ------------------------------------------------------------------ #
    #  Internal steps
    # ------------------------------------------------------------------ #

    @staticmethod
    def _crop_face(
        frame: np.ndarray,
        face: FaceData,
        padding: float = 0.15,
    ) -> Optional[np.ndarray]:
        """Crop the face region from *frame* with some padding.

        Uses the bounding box from MediaPipe landmarks. Adds fractional
        padding so the crop includes some context (forehead, chin).
        """
        h, w = frame.shape[:2]
        fx, fy, fw, fh = face.bbox

        pad_x = int(fw * padding)
        pad_y = int(fh * padding)

        x1 = max(0, fx - pad_x)
        y1 = max(0, fy - pad_y)
        x2 = min(w, fx + fw + pad_x)
        y2 = min(h, fy + fh + pad_y)

        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return None

        # Convert BGR → RGB (the torchvision transform expects RGB).
        return cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)

    def _preprocess(self, face_rgb: np.ndarray) -> torch.Tensor:
        """Apply the official L2CS-Net transforms and batch the tensor."""
        tensor = _TRANSFORM(face_rgb)            # (3, 448, 448)
        return tensor.unsqueeze(0).to(self._device)  # (1, 3, 448, 448)

    def _infer(self, tensor: torch.Tensor) -> Tuple[float, float]:
        """Run the model and convert 90-bin outputs to pitch/yaw radians."""
        with torch.no_grad():
            yaw_logits, pitch_logits = self._model(tensor)

        # Softmax → weighted sum of bin indices.
        yaw_probs = self._softmax(yaw_logits)
        pitch_probs = self._softmax(pitch_logits)

        # Weighted sum gives the predicted bin index (continuous).
        yaw_idx = torch.sum(yaw_probs * self._idx_tensor, dim=1).item()
        pitch_idx = torch.sum(pitch_probs * self._idx_tensor, dim=1).item()

        # Convert bin index → degrees → radians.
        # Each bin = 4°, offset so bin 0 = −180°:
        #   angle_deg = bin_index * 4 − 180
        yaw_deg = yaw_idx * _BIN_WIDTH_DEG - 180.0
        pitch_deg = pitch_idx * _BIN_WIDTH_DEG - 180.0

        yaw_rad = math.radians(yaw_deg)
        pitch_rad = math.radians(pitch_deg)

        return pitch_rad, yaw_rad


# ====================================================================
#  Model loading helper
# ====================================================================

def _load_model(weights_path: Path, device: torch.device) -> L2CS:
    """Instantiate L2CS-Net (ResNet-50, 90 bins) and load weights.

    Supports two checkpoint formats:
      - ``.safetensors`` — loaded via the ``safetensors`` library
      - ``.pkl``         — loaded via ``torch.load``

    Uses ``strict=False`` to tolerate extra keys (e.g. the py-feat
    checkpoint includes ``fc_finetune`` which our model doesn't use).
    """
    # ResNet-50 uses Bottleneck blocks with layer counts [3, 4, 6, 3].
    model = L2CS(Bottleneck, [3, 4, 6, 3], NUM_BINS)

    suffix = weights_path.suffix.lower()

    if suffix == ".safetensors":
        state_dict = _load_safetensors(weights_path, device)
    else:
        state_dict = torch.load(weights_path, map_location=device,
                                weights_only=False)

    # strict=False: ignore unexpected keys (e.g. fc_finetune from py-feat)
    # and tolerate missing keys that may not be present in all checkpoints.
    result = model.load_state_dict(state_dict, strict=False)
    if result.unexpected_keys:
        print(f"[gaze_model] Ignored unexpected keys: {result.unexpected_keys}")
    if result.missing_keys:
        print(f"[gaze_model] WARNING — missing keys: {result.missing_keys}")

    model.to(device)
    model.eval()
    print(f"[gaze_model] L2CS-Net loaded from {weights_path}")
    return model


def _load_safetensors(path: Path, device: torch.device) -> dict:
    """Load a state dict from a ``.safetensors`` file.

    Tries the ``safetensors`` library first; falls back to a minimal
    manual parser if the library is not installed.
    """
    try:
        from safetensors.torch import load_file
        return load_file(str(path), device=str(device))
    except ImportError:
        pass

    # Manual fallback: safetensors is a simple binary format.
    # Header: 8 bytes (uint64 LE) = header_size, then JSON header, then data.
    import json
    import struct

    with open(path, "rb") as f:
        header_size = struct.unpack("<Q", f.read(8))[0]
        header_json = f.read(header_size)
        metadata = json.loads(header_json)

        # Remove the __metadata__ key if present.
        metadata.pop("__metadata__", None)

        data_start = 8 + header_size
        state_dict = {}

        for key, info in metadata.items():
            dtype_str = info["dtype"]
            shape = info["shape"]
            offsets = info["data_offsets"]

            f.seek(data_start + offsets[0])
            nbytes = offsets[1] - offsets[0]
            raw = f.read(nbytes)

            dtype_map = {
                "F32": torch.float32,
                "F16": torch.float16,
                "BF16": torch.bfloat16,
                "I64": torch.int64,
                "I32": torch.int32,
            }
            dtype = dtype_map.get(dtype_str, torch.float32)
            tensor = torch.frombuffer(bytearray(raw), dtype=dtype).reshape(shape)
            state_dict[key] = tensor.to(device)

    return state_dict

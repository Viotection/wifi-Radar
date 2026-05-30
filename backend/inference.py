import torch
import numpy as np
from typing import Optional, Dict
from collections import deque
from models.presence import PresenceCNN
from models.proximity import ProximityCNNGRU


class InferenceEngine:
    """
    Runs both presence and proximity models on streaming CSI data.
    
    Maintains a rolling buffer of CSI frames for windowing.
    Handles model loading, inference, and confidence computation.
    """
    
    def __init__(self, 
                 presence_model_path: Optional[str] = None,
                 proximity_model_path: Optional[str] = None,
                 window_size: int = 100,
                 buffer_size: int = 500,
                 presence_threshold: float = 0.55,
                 device: str = 'cpu'):
        """
        Initialize inference engine.
        
        Args:
            presence_model_path: Path to trained presence model (.pt file)
            proximity_model_path: Path to trained proximity model (.pt file)
            window_size: Number of frames for inference window
            buffer_size: Maximum history to maintain
            presence_threshold: Confidence threshold for presence detection
            device: 'cpu' or 'cuda'
        """
        self.device = device
        self.window_size = window_size
        self.presence_threshold = presence_threshold
        
        # Initialize models
        self.presence_model = PresenceCNN().to(device)
        self.proximity_model = ProximityCNNGRU().to(device)
        
        # Load weights if provided
        if presence_model_path:
            try:
                self.presence_model.load_state_dict(torch.load(presence_model_path, map_location=device))
                print(f"Loaded presence model from {presence_model_path}")
            except Exception as e:
                print(f"Warning: Could not load presence model: {e}")
        
        if proximity_model_path:
            try:
                self.proximity_model.load_state_dict(torch.load(proximity_model_path, map_location=device))
                print(f"Loaded proximity model from {proximity_model_path}")
            except Exception as e:
                print(f"Warning: Could not load proximity model: {e}")
        
        self.presence_model.eval()
        self.proximity_model.eval()
        
        # CSI buffer for windowing
        self._csi_buffer = deque(maxlen=buffer_size)
        self._zone_history = deque(maxlen=buffer_size)
        self._presence_history = deque(maxlen=buffer_size)
    
    def predict(self, csi_frame: np.ndarray) -> Dict:
        """
        Run inference on a single CSI frame.
        
        Args:
            csi_frame: CSI amplitude array of shape (3, 30)
        
        Returns:
            Dictionary with predictions:
            {
                'presence': bool,
                'presenceConf': float,
                'zone': str or None,
                'zoneConf': float,
                'trend': str or None,
                'bufferReady': bool,
            }
        """
        # Add to buffer
        self._csi_buffer.append(csi_frame)
        
        # Need at least window_size frames before inference
        if len(self._csi_buffer) < self.window_size:
            return {
                'presence': False,
                'presenceConf': 0.0,
                'zone': None,
                'zoneConf': 0.0,
                'trend': None,
                'bufferReady': False,
                'bufferedFrames': len(self._csi_buffer),
            }
        
        # Stack last window_size frames
        window = np.stack(list(self._csi_buffer)[-self.window_size:], axis=-1)  # (3, 30, 100)
        
        with torch.no_grad():
            # Convert to tensor
            x = torch.FloatTensor(window).unsqueeze(0).to(self.device)  # (1, 3, 30, 100)
            
            # Presence detection
            presence_logits = self.presence_model(x.mean(1, keepdim=True))  # Average across antennas -> (1, 1, 30, 100)
            presence_probs = torch.softmax(presence_logits, dim=1)[0]
            presence_prob = presence_probs[1].item()  # Probability of class 1 (Present)
            present = presence_prob > self.presence_threshold
            
            self._presence_history.append(present)
            
            # Proximity estimation (if present)
            zone = None
            zone_conf = 0.0
            if present:
                proximity_logits = self.proximity_model(x)
                proximity_probs = torch.softmax(proximity_logits, dim=1)[0]
                zone_idx = proximity_probs.argmax().item()
                zone_names = ['near', 'medium', 'far']
                zone = zone_names[zone_idx]
                zone_conf = proximity_probs[zone_idx].item()
            
            if zone:
                self._zone_history.append(zone)
        
        # Estimate trend (approaching vs. departing)
        trend = self._estimate_trend()
        
        return {
            'presence': present,
            'presenceConf': round(presence_prob, 3),
            'zone': zone,
            'zoneConf': round(zone_conf, 3),
            'trend': trend,
            'bufferReady': True,
            'bufferedFrames': len(self._csi_buffer),
        }
    
    def _estimate_trend(self) -> Optional[str]:
        """
        Estimate if person is approaching or departing based on zone history.
        
        Simple heuristic: look at the last 2 seconds of zone predictions.
        - If moving from 'far' -> 'medium' -> 'near': approaching
        - If moving from 'near' -> 'medium' -> 'far': departing
        - Otherwise: None
        
        Returns:
            'approaching', 'departing', or None
        """
        if len(self._zone_history) < 20:  # At least 0.2 seconds of history
            return None
        
        recent_zones = list(self._zone_history)[-20:]
        zone_to_idx = {'far': 0, 'medium': 1, 'near': 2}
        recent_indices = [zone_to_idx.get(z, -1) for z in recent_zones]
        
        # Filter out invalid entries
        recent_indices = [i for i in recent_indices if i >= 0]
        
        if len(recent_indices) < 10:
            return None
        
        # Compute trend: average of first half vs. second half
        first_half_mean = np.mean(recent_indices[:len(recent_indices)//2])
        second_half_mean = np.mean(recent_indices[len(recent_indices)//2:])
        
        # Threshold for trend confidence
        if second_half_mean > first_half_mean + 0.2:  # Increasing indices = getting closer
            return 'approaching'
        elif second_half_mean < first_half_mean - 0.2:  # Decreasing indices = getting farther
            return 'departing'
        else:
            return None
    
    def get_statistics(self) -> Dict:
        """
        Return aggregate statistics from history.
        
        Returns:
            Dictionary with presence rate, zone distribution, etc.
        """
        if not self._presence_history:
            return {}
        
        presence_rate = np.mean(self._presence_history)
        
        if not self._zone_history:
            return {'presenceRate': presence_rate}
        
        zone_counts = {z: 0 for z in ['near', 'medium', 'far']}
        for zone in self._zone_history:
            zone_counts[zone] += 1
        
        total = sum(zone_counts.values())
        zone_distribution = {z: (count / total if total > 0 else 0) for z, count in zone_counts.items()}
        
        return {
            'presenceRate': round(presence_rate, 3),
            'zoneDistribution': {k: round(v, 3) for k, v in zone_distribution.items()},
            'bufferedFrames': len(self._csi_buffer),
        }

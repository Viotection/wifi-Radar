import numpy as np
from dataclasses import dataclass
from typing import Optional
import random


@dataclass
class CSIFrame:
    """
    Represents a single CSI sample.
    
    Attributes:
        amplitude: CSI amplitude, shape (3, 30) for 3 antennas, 30 subcarriers
        timestamp: Frame timestamp in seconds
        zone: Ground truth zone ['near', 'medium', 'far', None]
        present: Ground truth presence [True, False]
    """
    amplitude: np.ndarray  # (3, 30)
    timestamp: float
    zone: Optional[str] = None
    present: bool = False


class CSISimulator:
    """
    Simulates physically plausible CSI time-series for demo fallback.
    
    When real WiFi CSI hardware is unavailable, this simulator generates
    synthetic CSI data that mimics human motion patterns. The models treat
    this data identically to real CSI.
    
    Simulation strategy:
    - Empty room: low-amplitude noise (background reflections)
    - Human present, far: weak signal with slow variation
    - Human present, medium: moderate signal with medium-frequency motion
    - Human present, near: strong signal with high-frequency motion (body dynamics)
    - Approaching/departing: time-varying signal energy trend
    """
    
    def __init__(self, 
                 room_noise_floor: float = 0.1,
                 update_rate_hz: float = 100.0):
        """
        Initialize simulator.
        
        Args:
            room_noise_floor: CSI amplitude baseline (empty room)
            update_rate_hz: Sampling rate (frames per second)
        """
        self.room_noise_floor = room_noise_floor
        self.update_rate_hz = update_rate_hz
        self.dt = 1.0 / update_rate_hz
        
        # State variables
        self.time_elapsed = 0.0
        self.frame_count = 0
        
        # Scenario state
        self.scenario_time = 0.0
        self.scenario_duration = 30.0  # seconds per scenario
        self.scenario = self._choose_scenario()
        
    def _choose_scenario(self):
        """
        Randomly choose a scenario (empty, far, medium, near, approaching, departing).
        """
        scenarios = ['empty', 'far', 'medium', 'near', 'approaching', 'departing']
        return random.choice(scenarios)
    
    def _generate_multipath_pattern(self, 
                                     num_subcarriers: int = 30,
                                     num_antennas: int = 3,
                                     base_energy: float = 0.5,
                                     motion_frequency: float = 2.0) -> np.ndarray:
        """
        Generate multipath CSI pattern with motion component.
        
        Args:
            num_subcarriers: Number of WiFi subcarriers (typically 30)
            num_antennas: Number of antennas (typically 3)
            base_energy: Signal strength (0.1 = far, 0.5 = medium, 1.0 = near)
            motion_frequency: Body motion oscillation in Hz
        
        Returns:
            CSI amplitude array of shape (num_antennas, num_subcarriers)
        """
        # Frequency components: line-of-sight + multipath reflections + body motion
        los_component = base_energy * np.sin(2 * np.pi * self.time_elapsed * 0.5)
        reflection_component = (base_energy * 0.3) * np.sin(2 * np.pi * self.time_elapsed * 1.2)
        motion_component = (base_energy * 0.5) * np.sin(2 * np.pi * self.time_elapsed * motion_frequency)
        
        # Spatial variation across subcarriers (Doppler spread)
        subcarrier_indices = np.arange(num_subcarriers)
        spatial_variation = 0.2 * np.sin(2 * np.pi * subcarrier_indices / 30)
        
        # Antenna diversity
        antenna_phases = np.array([0, 2 * np.pi / 3, 4 * np.pi / 3])  # 120° spacing
        
        # Combine components
        amplitude = np.zeros((num_antennas, num_subcarriers))
        for antenna_idx in range(num_antennas):
            for subcarrier_idx in range(num_subcarriers):
                phase = antenna_phases[antenna_idx] + spatial_variation[subcarrier_idx]
                combined = (
                    los_component * np.cos(phase) +
                    reflection_component * np.sin(phase * 2) +
                    motion_component * np.cos(phase * 3)
                )
                amplitude[antenna_idx, subcarrier_idx] = np.abs(combined) + self.room_noise_floor
        
        # Normalize to reasonable range [0.1, 1.0]
        amplitude = np.clip(amplitude, 0.0, 1.0)
        
        return amplitude
    
    def next_frame(self) -> dict:
        """
        Generate next CSI frame with ground truth labels.
        
        Returns:
            Dictionary with keys:
            - 'presence': bool
            - 'zone': str or None
            - 'confidence': float
            - 'trend': str or None ('approaching', 'departing', None)
            - 'amplitude': np.ndarray (3, 30)
            - 'timestamp': float
        """
        # Update scenario if duration exceeded
        if self.scenario_time > self.scenario_duration:
            self.scenario = self._choose_scenario()
            self.scenario_time = 0.0
        
        # Generate CSI based on scenario
        if self.scenario == 'empty':
            amplitude = self._generate_multipath_pattern(
                base_energy=self.room_noise_floor,
                motion_frequency=0.1  # Negligible motion
            )
            presence = False
            zone = None
            trend = None
        
        elif self.scenario == 'far':
            amplitude = self._generate_multipath_pattern(
                base_energy=0.3,
                motion_frequency=1.0  # Slow body motion
            )
            presence = True
            zone = 'far'
            trend = None
        
        elif self.scenario == 'medium':
            amplitude = self._generate_multipath_pattern(
                base_energy=0.6,
                motion_frequency=2.0  # Medium-frequency motion
            )
            presence = True
            zone = 'medium'
            trend = None
        
        elif self.scenario == 'near':
            amplitude = self._generate_multipath_pattern(
                base_energy=0.9,
                motion_frequency=3.0  # Fast body dynamics
            )
            presence = True
            zone = 'near'
            trend = None
        
        elif self.scenario == 'approaching':
            # Gradually increase energy from far to near
            progress = (self.scenario_time / self.scenario_duration)
            base_energy = 0.3 + (0.9 - 0.3) * progress
            motion_frequency = 1.0 + 2.0 * progress
            
            amplitude = self._generate_multipath_pattern(
                base_energy=base_energy,
                motion_frequency=motion_frequency
            )
            presence = True
            # Classify zone based on current energy
            if base_energy < 0.4:
                zone = 'far'
            elif base_energy < 0.65:
                zone = 'medium'
            else:
                zone = 'near'
            trend = 'approaching'
        
        elif self.scenario == 'departing':
            # Gradually decrease energy from near to far
            progress = 1.0 - (self.scenario_time / self.scenario_duration)
            base_energy = 0.3 + (0.9 - 0.3) * progress
            motion_frequency = 1.0 + 2.0 * progress
            
            amplitude = self._generate_multipath_pattern(
                base_energy=base_energy,
                motion_frequency=motion_frequency
            )
            presence = True
            if base_energy < 0.4:
                zone = 'far'
            elif base_energy < 0.65:
                zone = 'medium'
            else:
                zone = 'near'
            trend = 'departing'
        
        # Estimate confidence based on signal strength
        mean_amplitude = np.mean(amplitude)
        confidence = np.clip((mean_amplitude - self.room_noise_floor) / (1.0 - self.room_noise_floor), 0.0, 1.0)
        
        # Update time
        self.time_elapsed += self.dt
        self.scenario_time += self.dt
        self.frame_count += 1
        
        return {
            'presence': presence,
            'presenceConf': round(confidence if presence else 1.0 - confidence, 3),
            'zone': zone,
            'zoneConf': round(confidence, 3) if presence else 0.0,
            'trend': trend,
            'amplitude': amplitude,
            'timestamp': self.time_elapsed,
            'frameCount': self.frame_count,
        }

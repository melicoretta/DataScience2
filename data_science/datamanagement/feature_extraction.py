import json
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import pandas as pd

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import numpy as np


def validate_measurement_value(param: str, value: float) -> bool:
    """
    Validate if a measurement value is within acceptable clinical ranges.

    Args:
        param: Parameter name (e.g., 'heart_rate', 'temperature')
        value: Measured value

    Returns:
        bool: True if valid, False otherwise
    """
    validation_ranges = {
        'heart_rate': (0, 350),
        'respiratory_rate': (0, 300),
        'temperature': (26, 45),
        'anion_gap': (5, 50),
        'systolic_bp': (0, 375),
        'diastolic_bp': (0, 375),
        'mean_bp': (0, 300),
    }

    if param not in validation_ranges:
        return True  # No validation rule, accept the value

    min_val, max_val = validation_ranges[param]
    return min_val < value < max_val


def calculate_age(date_of_birth: datetime, reference_time: datetime) -> int:
    """
    Calculate age in years at the reference time.

    Args:
        date_of_birth: Date of birth
        reference_time: Reference time (typically admission_time)

    Returns:
        int: Age in years
    """
    age = reference_time.year - date_of_birth.year
    # Adjust if birthday hasn't occurred yet this year
    if (reference_time.month, reference_time.day) < (date_of_birth.month, date_of_birth.day):
        age -= 1
    return age


def validate_48h_coverage(measurements: List[Dict], admission_time: datetime, current_time: datetime) -> Tuple[
    bool, str]:
    """
    Validate that enough time has passed since admission and measurements exist within the 48h window.

    Args:
        measurements: List of measurement dictionaries
        admission_time: ICU admission timestamp
        current_time: Current time when prediction is requested

    Returns:
        Tuple[bool, str]: (is_valid, message)
    """
    if not measurements:
        return False, "No measurements provided"

    # Check if at least 48 hours have passed since admission
    hours_since_admission = (current_time - admission_time).total_seconds() / 3600
    if hours_since_admission < 48:
        return False, f"Insufficient time since admission: {hours_since_admission:.1f} hours (need ≥48 hours)"

    # Define the 48-hour window
    window_start = admission_time
    window_end = admission_time + timedelta(hours=48)

    # Get measurements within the 48h window
    valid_measurements = [
        m for m in measurements
        if window_start <= datetime.fromisoformat(m['timestamp']) <= window_end
    ]

    if not valid_measurements:
        return False, "No measurements within the 48-hour window after admission"

    # Check time coverage within the window
    timestamps = sorted([datetime.fromisoformat(m['timestamp']) for m in valid_measurements])
    first_measurement = timestamps[0]
    last_measurement = timestamps[-1]

    coverage_hours = (last_measurement - first_measurement).total_seconds() / 3600

    # Check measurement density for vital signs
    vital_measurements = [m for m in valid_measurements if 'heart_rate' in m or 'systolic_bp' in m]
    if len(vital_measurements) < 6:
        return False, f"Insufficient vital sign measurements: {len(vital_measurements)} (need ≥6)"

    # Check for lab values
    lab_measurements = [m for m in valid_measurements if 'gcs' in m or 'lactate' in m or 'bun' in m]
    if len(lab_measurements) < 2:
        return False, f"Insufficient lab measurements: {len(lab_measurements)} (need ≥2)"

    return True, f"Valid: {hours_since_admission:.1f}h since admission, {coverage_hours:.1f}h measurement coverage, {len(valid_measurements)} measurements in 48h window"


def extract_values(measurements: List[Dict], param: str, admission_time: datetime) -> List[float]:
    """Extract all valid values for a specific parameter within 48h window."""
    window_end = admission_time + timedelta(hours=48)
    values = []

    for m in measurements:
        timestamp = datetime.fromisoformat(m['timestamp'])
        if admission_time <= timestamp <= window_end and param in m and m[param] is not None:
            value = float(m[param])
            # Validate the measurement is within acceptable clinical range
            if validate_measurement_value(param, value):
                values.append(value)

    return values


def calculate_statistics(values: List[float]) -> Dict[str, Optional[float]]:
    """Calculate min, max, mean, std for a list of values."""
    if not values:
        return {'min': None, 'max': None, 'mean': None, 'std': None}

    arr = np.array(values)
    return {
        'min': float(np.min(arr)),
        'max': float(np.max(arr)),
        'mean': float(np.mean(arr)),
        'std': float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0
    }


def engineer_features(patient_data: Dict, training_df=None, use_median_imputation: bool = True) -> Dict:
    """
    Convert raw ICU measurements into model features.

    Args:
        patient_data: Dictionary containing patient_id, admission_time, current_time,
                     date_of_birth, age_adj_comorbidity_score, and measurements list
        training_df: Optional pandas DataFrame with training data for median imputation.
                    Should contain columns matching the feature names.
        use_median_imputation: If True and training_df is provided, replace None values
                              with median from training data

    Returns:
        Dictionary with all engineered features or error information
    """
    try:
        # Parse timestamps
        admission_time = datetime.fromisoformat(patient_data['admission_time'])

        # Check if current_time is provided
        if 'current_time' not in patient_data:
            return {
                'success': False,
                'error': 'Missing current_time field',
                'details': 'current_time must be provided to validate 48-hour requirement'
            }

        current_time = datetime.fromisoformat(patient_data['current_time'])
        measurements = patient_data['measurements']

        # Validate that current_time is after admission_time
        if current_time <= admission_time:
            return {
                'success': False,
                'error': 'Invalid timestamps',
                'details': f'current_time ({current_time}) must be after admission_time ({admission_time})'
            }

        # Calculate age from date of birth
        if 'date_of_birth' not in patient_data:
            return {
                'success': False,
                'error': 'Missing date_of_birth field',
                'details': 'date_of_birth must be provided to calculate age'
            }

        date_of_birth = datetime.fromisoformat(patient_data['date_of_birth'])

        # Validate that date_of_birth is before admission_time
        if date_of_birth >= admission_time:
            return {
                'success': False,
                'error': 'Invalid date_of_birth',
                'details': f'date_of_birth ({date_of_birth}) must be before admission_time ({admission_time})'
            }

        age = calculate_age(date_of_birth, admission_time)

        # Validate age is reasonable (0-120 years)
        if age < 0 or age > 120:
            return {
                'success': False,
                'error': 'Invalid age',
                'details': f'Calculated age ({age}) is outside reasonable range (0-120 years)'
            }

        # Validate 48-hour coverage
        is_valid, message = validate_48h_coverage(measurements, admission_time, current_time)
        if not is_valid:
            return {
                'success': False,
                'error': 'Insufficient data coverage',
                'details': message
            }

        # Map JSON parameter names to feature prefixes
        param_mapping = {
            'gcs': 'GCS',
            'lactate': 'Lactate',
            'bun': 'BUN',
            'bilirubin': 'Bilirubin',
            'albumin': 'Albumin',
            'alk_phos': 'AlkPhos',
            'pt': 'PT',
            'inr': 'INR',
            'phosphate': 'Phosphate',
            'pao2': 'PaO2',
            'aptt': 'aPTT',
            'anion_gap': 'AG',
            'systolic_bp': 'SYSBP',
            'diastolic_bp': 'DIASBP',
            'mean_bp': 'MEANBP',
            'respiratory_rate': 'RR',
            'temperature': 'TEMP',
            'heart_rate': 'HR',
            'rdw': 'RDW'
        }

        features = {}

        # Static features
        features['age'] = age

        # Validate age_adj_comorbidity_score
        comorbidity_score = patient_data.get('age_adj_comorbidity_score')
        if comorbidity_score is not None:
            # Must be integer between -19 and 89
            if not isinstance(comorbidity_score, (int, float)) or comorbidity_score < -19 or comorbidity_score > 89:
                return {
                    'success': False,
                    'error': 'Invalid age_adj_comorbidity_score',
                    'details': f'Score must be between -19 and 89, got: {comorbidity_score}'
                }
            features['age_adj_comorbidity_score'] = int(comorbidity_score)
        else:
            features['age_adj_comorbidity_score'] = None

        # Calculate statistics for each parameter
        for json_param, feature_prefix in param_mapping.items():
            values = extract_values(measurements, json_param, admission_time)
            stats = calculate_statistics(values)

            # Create feature names based on what statistics are needed for each parameter
            if feature_prefix == 'GCS':
                # GCS: max, mean only
                if stats['max'] is not None:
                    features[f'{feature_prefix}_max'] = stats['max']
                if stats['mean'] is not None:
                    features[f'{feature_prefix}_mean'] = stats['mean']

            elif feature_prefix in ['Lactate', 'BUN', 'Albumin', 'AlkPhos']:
                # These need min, max, mean
                if stats['min'] is not None:
                    features[f'{feature_prefix}_min'] = stats['min']
                if stats['max'] is not None:
                    features[f'{feature_prefix}_max'] = stats['max']
                if stats['mean'] is not None:
                    features[f'{feature_prefix}_mean'] = stats['mean']

            elif feature_prefix == 'Bilirubin':
                # Bilirubin: max, mean only
                if stats['max'] is not None:
                    features[f'{feature_prefix}_max'] = stats['max']
                if stats['mean'] is not None:
                    features[f'{feature_prefix}_mean'] = stats['mean']

            elif feature_prefix in ['PT', 'INR', 'aPTT']:
                # These need mean, min only
                if stats['mean'] is not None:
                    features[f'{feature_prefix}_mean'] = stats['mean']
                if stats['min'] is not None:
                    features[f'{feature_prefix}_min'] = stats['min']

            elif feature_prefix in ['Phosphate', 'PaO2']:
                # These need mean, max only
                if stats['mean'] is not None:
                    features[f'{feature_prefix}_mean'] = stats['mean']
                if stats['max'] is not None:
                    features[f'{feature_prefix}_max'] = stats['max']

            elif feature_prefix == 'RDW':
                # RDW needs max, mean, min, std
                if stats['max'] is not None:
                    features[f'{feature_prefix}_max'] = stats['max']
                if stats['mean'] is not None:
                    features[f'{feature_prefix}_mean'] = stats['mean']
                if stats['min'] is not None:
                    features[f'{feature_prefix}_min'] = stats['min']
                if stats['std'] is not None:
                    features[f'{feature_prefix}_std'] = stats['std']

            elif feature_prefix == 'AG':
                # Anion gap needs all statistics
                for stat_name, stat_value in stats.items():
                    if stat_value is not None:
                        features[f'{feature_prefix}_{stat_name}'] = stat_value

            elif feature_prefix == 'SYSBP':
                # SYSBP needs min, mean, std
                if stats['min'] is not None:
                    features[f'{feature_prefix}_min'] = stats['min']
                if stats['mean'] is not None:
                    features[f'{feature_prefix}_mean'] = stats['mean']
                if stats['std'] is not None:
                    features[f'{feature_prefix}_std'] = stats['std']

            elif feature_prefix == 'DIASBP':
                # DIASBP needs min, mean only
                if stats['min'] is not None:
                    features[f'{feature_prefix}_min'] = stats['min']
                if stats['mean'] is not None:
                    features[f'{feature_prefix}_mean'] = stats['mean']

            elif feature_prefix == 'HR':
                # Heart rate needs mean, max, std only
                if stats['mean'] is not None:
                    features[f'{feature_prefix}_mean'] = stats['mean']
                if stats['max'] is not None:
                    features[f'{feature_prefix}_max'] = stats['max']
                if stats['std'] is not None:
                    features[f'{feature_prefix}_std'] = stats['std']

            elif feature_prefix == 'RR':
                # Respiratory rate: min, max, mean
                if stats['min'] is not None:
                    features[f'{feature_prefix}_min'] = stats['min']
                if stats['max'] is not None:
                    features[f'{feature_prefix}_max'] = stats['max']
                if stats['mean'] is not None:
                    features[f'{feature_prefix}_mean'] = stats['mean']

            elif feature_prefix == 'TEMP':
                # Temperature: min, std
                if stats['min'] is not None:
                    features[f'{feature_prefix}_min'] = stats['min']
                if stats['std'] is not None:
                    features[f'{feature_prefix}_std'] = stats['std']

            elif feature_prefix == 'MEANBP':
                # Mean BP: min, mean
                if stats['min'] is not None:
                    features[f'{feature_prefix}_min'] = stats['min']
                if stats['mean'] is not None:
                    features[f'{feature_prefix}_mean'] = stats['mean']

        # Check for missing critical features
        expected_features = [
            'GCS_max', 'GCS_mean', 'Lactate_min', 'Lactate_max', 'Lactate_mean',
            'BUN_min', 'BUN_mean', 'BUN_max', 'Bilirubin_max', 'Bilirubin_mean',
            'Albumin_mean', 'Albumin_min', 'Albumin_max', 'AlkPhos_mean', 'AlkPhos_max',
            'AlkPhos_min', 'PT_mean', 'PT_min', 'INR_mean', 'INR_min',
            'Phosphate_mean', 'Phosphate_max', 'PaO2_mean', 'PaO2_max', 'aPTT_mean',
            'aPTT_min', 'AG_mean', 'AG_max', 'AG_min', 'AG_std',
            'SYSBP_min', 'SYSBP_mean', 'SYSBP_std', 'DIASBP_min', 'DIASBP_mean',
            'age', 'RR_mean', 'RR_max', 'RR_min', 'TEMP_std', 'TEMP_min', 'HR_mean',
            'HR_max', 'HR_std', 'RDW_max', 'RDW_mean', 'RDW_min', 'RDW_std',
            'age_adj_comorbidity_score', 'MEANBP_min', 'MEANBP_mean'
        ]

        missing_features = [f for f in expected_features if f not in features or features[f] is None]

        # Apply median imputation if requested and training_df is provided
        imputed_features = []
        if use_median_imputation and training_df is not None and missing_features:
            for feature_name in missing_features:
                if feature_name in training_df.columns:
                    median_value = training_df[feature_name].median()
                    if not np.isnan(median_value):
                        features[feature_name] = float(median_value)
                        imputed_features.append(feature_name)

        # Update missing features list after imputation
        still_missing = [f for f in expected_features if f not in features or features[f] is None]

        return {
            'success': True,
            'features': features,
            'validation_message': message,
            'missing_features': still_missing if still_missing else None,
            'imputed_features': imputed_features if imputed_features else None,
            'total_measurements': len(measurements),
            'patient_id': patient_data['patient_id'],
            'calculated_age': age
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'details': 'Error during feature engineering'
        }
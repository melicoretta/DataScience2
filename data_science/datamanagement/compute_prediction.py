from django.shortcuts import render
import pandas as pd
import re
from django.contrib.staticfiles.storage import staticfiles_storage
from django.http import JsonResponse
from datetime import datetime
import xgboost as xgb
from xgboost import XGBClassifier
import pickle
import shap
import joblib
import json
from sklearn.impute import SimpleImputer
import matplotlib.pyplot as plt
import matplotlib
from collections import defaultdict
from django.views.decorators.csrf import csrf_exempt
import numpy as np
import math

matplotlib.use("Agg")  # Use non-GUI backend
import matplotlib.pyplot as plt


model_paths = {
        "XGBoost": "C:\\tu_project\\DataScience2\\data_science\\datamanagement\\static\\model\\XGBoost_mortality_inhospital.joblib",
        "XGBoost_90_days": "C:\\tu_project\\DataScience2\\data_science\\datamanagement\\static\\model\\XGBoost_mortality_90days.joblib",
        "XGBoost_180_days": "C:\\tu_project\\DataScience2\\data_science\\datamanagement\\static\\model\\XGBoost_mortality_180days.joblib"
}

def read_feature():
    feature_path = "C:\\tu_project\\DataScience2\\data_science\\datamanagement\\static\\files\\fourth_feature_df_31_12_2025.csv"
    print("model_feature: ", feature_path)
    data_feature = pd.read_csv(feature_path)
    return data_feature


model_feature = read_feature()
def read_patient_data():
    """
    This methode read the files ADMISSIONS and PATIENTS join the data,
    compute the age of patients and return a dataframe
    compute the age of patient
    DOB = Day of Birthday, ADMITTIME = admission time
     age = (ADMITTIME - DOB) / 365
    """
    admission_path = "C://tu_project//DataScience2//data_science//datamanagement//static//files/ADMISSIONS.csv"
    patient_path = "C://tu_project//DataScience2//data_science//datamanagement//static//files/PATIENTs.csv"
    admission_data = pd.read_csv(admission_path)
    patient_data = pd.read_csv(patient_path)
    merged_data = pd.merge(admission_data, patient_data, on='SUBJECT_ID', how='inner')

    merged_data['ADMITTIME'] = pd.to_datetime(merged_data['ADMITTIME'], errors='coerce')
    merged_data['DOB'] = pd.to_datetime(merged_data['DOB'], errors='coerce')

    """ Age at admission (year-based to avoid overflow) """
    merged_data["AGE"] = merged_data["ADMITTIME"].dt.year - merged_data["DOB"].dt.year

    """ Apply MIMIC rule: ages > 89 are masked, set to 90  """
    merged_data.loc[merged_data["AGE"] > 89, "AGE"] = 90

    merged_data.rename(columns={"ROW_ID": "Row_id", "SUBJECT_ID": "Subject_id",
                                "HADM_ID": "Hadm_id", "DOB": "Birthday", "RELIGION": "Religion",
                                "LANGUAGE": "Language", "INSURANCE": "Insurance",
                                "DIAGNOSIS": "Diagnosis", "GENDER": "Gender", "ADMITTIME": "Admission_time",
                                "AGE": "Age", "MARITAL_STATUS": "Marital_status", "HOSPITAL_EXPIRE_FLAG": "Died"},
                       inplace=True)

    return merged_data

patient_data = read_patient_data()


def save_prediction():

    return {'ok': 'ok'}
def to_json_safe(x):
    if isinstance(x, (np.float32, np.float64)):
        # Convert nan → None
        return None if math.isnan(float(x)) else float(x)
    if isinstance(x, (np.int32, np.int64)):
        return int(x)
    return x

def filter_hadm_id(hadm_id):
    data_feature = model_feature
    filtered_data = data_feature[data_feature["HADM_ID"] == hadm_id]
    context = {
        "filter_hadm_id": filtered_data,
        "len_hadm_id_result": len(filtered_data)
    }
    return context


def model_inference(data):
    predictions = {}
    shap_results = {}
    frontend_dict = {}

    if data['len_hadm_id_result'] == 0:
        return {'len_hadm_id_result': 0}

    # ---------------------------------------
    # 1. Build frontend dataframe
    # ---------------------------------------
    frontend_data = pd.DataFrame([{"GCS_max": data["filter_hadm_id"]["GCS_max"].iloc[0],
                                   "GCS_mean": data["filter_hadm_id"]["GCS_mean"].iloc[0],
                                   "Lactate_min": data["filter_hadm_id"]["Lactate_min"].iloc[0],
                                   "Lactate_max": data["filter_hadm_id"]["Lactate_max"].iloc[0],
                                   "Lactate_mean": data["filter_hadm_id"]["Lactate_mean"].iloc[0],
                                   "BUN_min": data["filter_hadm_id"]["BUN_min"].iloc[0],
                                   "BUN_mean": data["filter_hadm_id"]["BUN_mean"].iloc[0],
                                   "Bilirubin_max": data["filter_hadm_id"]["Bilirubin_max"].iloc[0],
                                   "Bilirubin_mean": data["filter_hadm_id"]["Bilirubin_mean"].iloc[0],
                                   "AG_MEAN": data["filter_hadm_id"]["AG_MEAN"].iloc[0],
                                   "AG_MAX": data["filter_hadm_id"]["AG_MAX"].iloc[0],
                                   "AG_MIN": data["filter_hadm_id"]["AG_MIN"].iloc[0],
                                   "AG_STD": data["filter_hadm_id"]["AG_STD"].iloc[0],
                                   "SYSBP_MIN": data["filter_hadm_id"]["SYSBP_MIN"].iloc[0],
                                   "SYSBP_MEAN": data["filter_hadm_id"]["SYSBP_MEAN"].iloc[0],
                                   "SYSBP_STD": data["filter_hadm_id"]["SYSBP_STD"].iloc[0],
                                   "DIASBP_MIN": data["filter_hadm_id"]["DIASBP_MIN"].iloc[0],
                                   "DIASBP_MEAN": data["filter_hadm_id"]["DIASBP_MEAN"].iloc[0],
                                   "AGE": data["filter_hadm_id"]["AGE"].iloc[0],
                                   "RR_MEAN": data["filter_hadm_id"]["RR_MEAN"].iloc[0],
                                   "RR_MAX": data["filter_hadm_id"]["RR_MAX"].iloc[0],
                                   "RR_MIN": data["filter_hadm_id"]["RR_MIN"].iloc[0],
                                   "TEMP_STD": data["filter_hadm_id"]["TEMP_STD"].iloc[0],
                                   "TEMP_MIN": data["filter_hadm_id"]["TEMP_MIN"].iloc[0],
                                   "HR_MEAN": data["filter_hadm_id"]["HR_MEAN"].iloc[0],
                                   "HR_MAX": data["filter_hadm_id"]["HR_MAX"].iloc[0],
                                   "HR_STD": data["filter_hadm_id"]["HR_STD"].iloc[0],
                                   "RDW_max": data["filter_hadm_id"]["RDW_max"].iloc[0],
                                   "RDW_mean": data["filter_hadm_id"]["RDW_mean"].iloc[0],
                                   "RDW_min": data["filter_hadm_id"]["RDW_min"].iloc[0],
                                   "RDW_std": data["filter_hadm_id"]["RDW_std"].iloc[0],
                                   "age_adj_comorbidity_score":
                                       data["filter_hadm_id"]["age_adj_comorbidity_score"].iloc[0],
                                   "MEANBP_MIN": data["filter_hadm_id"]["MEANBP_MIN"].iloc[0],
                                   "MEANBP_MEAN": data["filter_hadm_id"]["MEANBP_MEAN"].iloc[0]
                                   }])
    df = frontend_data.apply(pd.to_numeric, errors="coerce")

    # ---------------------------------------
    # 2. Load all models
    # ---------------------------------------

    models = {name: joblib.load(path) for name, path in model_paths.items()}


    # ---------------------------------------
    # 3. Loop through each model
    # ---------------------------------------

    for model_name, pipeline in models.items():

        # Predict probability
        pred = pipeline.predict_proba(df)[0][1]
        predictions[model_name] = float(pred) * 100

        # ---------------------------------------
        # SHAP Explainability
        # ---------------------------------------

        tree_model = pipeline.named_steps["model"]
        X_transformed = pipeline[:-1].transform(df)
        explainer = shap.TreeExplainer(tree_model)
        shap_values = explainer.shap_values(X_transformed)

        # For classifiers, shap_values is a list → take class 1
        if isinstance(shap_values, list):
            shap_values = shap_values[1]

        # Save SHAP summary plot
        """
        shap.summary_plot(
            shap_values,
            df,
            feature_names=df.columns,
            show=False)
        plt.tight_layout()
        plt.savefig(staticfiles_storage.path(f'imgs/shap_summary_{model_name}.png'),
                    dpi=300)
        plt.close()
        """

        # Pair features with SHAP values
        sorted_features = sorted(
            zip(df.columns.tolist(),
                shap_values[0].tolist()),
            key=lambda x: x[1],
            reverse=True
        )

        # Build frontend feature list for this model
        name_feature = [f for f, _ in sorted_features]
        value_feature = [frontend_data[f].iloc[0] for f, _ in sorted_features]
        frontend_dict[model_name] = {
            "feature_name": [str(v) for v in name_feature],
            "feature_value": [to_json_safe(v) for v in value_feature]
        }

        shap_results[model_name] = {
            "feature_names": df.columns.tolist(),
            "shap_values": shap_values[0].tolist()
        }

        # ---------------------------------------
        # 4. Final JSON response
        # ---------------------------------------
    json_response = {
        "prediction": predictions,
        "len_hadm_id_result": data["len_hadm_id_result"],
        "contributor_data": frontend_dict
    }

    return json_response


def compute_prediction():
    data_all = patient_data
    model_patient_data = defaultdict(list)

    # Sort all data by admission time
    sorted_data = data_all.sort_values(by="Admission_time", ascending=True)

    # Group by patient and take the last row of each group
    last_admissions = (sorted_data.groupby("Subject_id")
                       .tail(1)  # last row per patient
                       .reset_index(drop=True))

    # Convert to JSON‑ready format
    # t = last_admissions.to_dict(orient="records")
    last_admissions_list = last_admissions[
        ['Subject_id', 'Hadm_id', 'Age', 'Diagnosis', 'Birthday', 'Admission_time', 'Died']
    ]

    for item_data in last_admissions_list['Hadm_id']:

        model_data = model_inference(filter_hadm_id(item_data))
        if model_data['len_hadm_id_result'] == 1:
            model_patient_data[item_data].append(model_data)
            if len(model_patient_data) == 100:
                return last_admissions_list, model_patient_data



    context = {
        'patient_data': last_admissions_list.to_json(),
        'model_detail': model_patient_data
    }
    return last_admissions_list, model_patient_data


df_patients, json_data = compute_prediction()
rows = []
for hadm_id, items in json_data.items():
    entry = items[0] # first element of list
    entry["Hadm_id"] = hadm_id
    rows.append(entry)
json_df = pd.DataFrame(rows)

merged = df_patients.merge(json_df, on="Hadm_id", how="left")

merged.to_csv("C:\\tu_project\\DataScience2\\data_science\\datamanagement\\static\\files\\patient_prediction.csv", index=False)



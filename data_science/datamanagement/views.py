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
import os
from django.shortcuts import render, redirect
from django.views.generic.edit import FormView
from sklearn.impute import SimpleImputer
import matplotlib.pyplot as plt
import matplotlib
from collections import defaultdict
from django.views.decorators.csrf import csrf_exempt
import numpy as np
import math
import ast
from django.urls import reverse
from datamanagement.feature_extraction import engineer_features
matplotlib.use("Agg")  # Use non-GUI backend
import matplotlib.pyplot as plt
from .forms import UploadFileForm

model_paths = {
    "XGBoost": staticfiles_storage.path('model/XGBoost.joblib'),
    "XGBoost_90_days": staticfiles_storage.path('model/XGBoost_90days.joblib'),
    "XGBoost_180_days": staticfiles_storage.path('model/XGBoost_180days.joblib')
}

feature_df_name = staticfiles_storage.path('files/fifth_feature_df_14_01_2026.csv')
upload_path = staticfiles_storage.path('upload/')


def read_new_patient(file):
    with open(file, "r") as f:

        data = json.load(f)  # data is a list of patient objects
    return data

new_patient = read_new_patient(staticfiles_storage.path('files/insurance_data.json'))




def read_feature(file):
    feature_path = file
    data_feature = pd.read_csv(feature_path)
    return data_feature


model_feature = read_feature(staticfiles_storage.path('files/fifth_feature_df_14_01_2026.csv'))


def filter_hadm_id(hadm_id):
    data_feature = model_feature
    filtered_data = data_feature[data_feature["HADM_ID"] == hadm_id]
    context = {
        "filter_hadm_id": filtered_data,
        "len_hadm_id_result": len(filtered_data)
    }
    return context


def read_admission():
    admission_path = staticfiles_storage.path('files/ADMISSIONS.csv')
    data = pd.read_csv(admission_path)

    data.rename(columns={"ROW_ID": "Row_id", "SUBJECT_ID": "Subject_id", "HADM_ID": "Hadm_id",
                         "DIAGNOSIS": "Diagnosis", "ADMITTIME": "Admission_time",
                         "ADMITTIME": "Admittime", "DEATHTIME": "Deathtime", "ADMISSION_TYPE": "Admission_type",
                         "ADMISSION_LOCATION": "Admission_location", "DISCHARGE_LOCATION": "Discharge_location",
                         "INSURANCE": "Insurance", "LANGUAGE": "Language", "RELIGION": "Religion",
                         "MARITAL_STATUS": "Marital_status", "ETHNICITY": "Ethnicity", "EDREGTIME": "Edregtime",
                         "EDOUTTIME": "Edouttime", "HAS_CHARTEVENTS_DATA": "Has_chartevents",
                         "HOSPITAL_EXPIRE_FLAG": "Died",
                         }, inplace=True)

    return data


def read_patient_data():
    """
    This methode read the files ADMISSIONS and PATIENTS join the data,
    compute the age of patients and return a dataframe
    compute the age of patient
    DOB = Day of Birthday, ADMITTIME = admission time
     age = (ADMITTIME - DOB) / 365
    """
    admission_path = staticfiles_storage.path('files/ADMISSIONS.csv')
    patient_path = staticfiles_storage.path('files/PATIENTs.csv')

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
admission_data = read_admission()


def index(request):
    return render(request, 'datamanagement/base.html')



def search_row_id(request):
    data_all = patient_data
    arr_row_id = data_all['Row_id'].unique().tolist()

    if request.method == 'GET' and request.headers.get("x-requested-with") == "XMLHttpRequest":
        row_id = request.GET.get('term', None)

        if row_id is not None and row_id != '':
            result = [str(item) for item in arr_row_id if str(item).startswith(row_id)]
            result = result[:10]

            return JsonResponse(result, safe=False)

    return render(request, 'datamanagement/base.html')


def search_subject_id(request):
    data_all = patient_data

    arr_row_id = data_all['Subject_id'].unique().tolist()

    if request.method == 'GET' and request.headers.get("x-requested-with") == "XMLHttpRequest":
        subject_id = request.GET.get('term', None)

        if subject_id is not None and subject_id != '':
            result = [str(item) for item in arr_row_id if str(item).startswith(subject_id)]
            result = result[:10]

            return JsonResponse(result, safe=False)

    return render(request, 'datamanagement/base.html')


@csrf_exempt
def show_diagnosis(request):
    data_all = patient_data
    model_patient_data = defaultdict(list)

    if request.method == "POST" and request.headers.get("x-requested-with") == "XMLHttpRequest":
        subject_id = request.POST.get("subject_id")

        filtered_data = data_all[data_all["Subject_id"].astype(str) == subject_id].sort_values(
            by="Admission_time", ascending=True)
        last_admission = filtered_data.iloc[-1]

        # Get the last admission_time

        data_last_admission = last_admission[
            ['Subject_id', 'Hadm_id', 'Diagnosis', 'Gender', 'Birthday', 'Admission_time',
             'Age', 'Marital_status', 'Language', 'Insurance', 'Religion', 'Died']
        ]

        data = filtered_data[['Subject_id', 'Hadm_id', 'Diagnosis', 'Gender', 'Birthday', 'Admission_time',
                              'Age', 'Marital_status', 'Language', 'Insurance', 'Religion', 'Died']]

        # we fetch the hospital admission time (hadm_id) of the same patient (subject_id)
        for item_hadm_id in data['Hadm_id']:
            model_patient_data[item_hadm_id].append(model_shap(filter_hadm_id(item_hadm_id)))

        context = {
            "subject_id": subject_id,
            "data": data.to_json(),
            'data_lenght': len(data),
            'patient_data': data_last_admission.to_json(),
            "model_detail": model_patient_data
        }

        return JsonResponse(context, safe=False)
    return render(request, 'datamanagement/base.html')

def get_patient(subject_id):
    data = new_patient
    for item in data:

        if item["Subject_id"] == subject_id:
            return item
            return None



def to_json_safe(x):
    if isinstance(x, (np.float32, np.float64)):
        # Convert nan → None
        return None if math.isnan(float(x)) else float(x)
    if isinstance(x, (np.int32, np.int64)):
        return int(x)
    return x


def model_shap(data):
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
                                   "BUN_max": data["filter_hadm_id"]["BUN_max"].iloc[0],
                                   "Bilirubin_max": data["filter_hadm_id"]["Bilirubin_max"].iloc[0],
                                   "Bilirubin_mean": data["filter_hadm_id"]["Bilirubin_mean"].iloc[0],
                                   "Albumin_mean": data["filter_hadm_id"]["Albumin_mean"].iloc[0],
                                   "Albumin_min": data["filter_hadm_id"]["Albumin_min"].iloc[0],
                                   "Albumin_max": data["filter_hadm_id"]["Albumin_max"].iloc[0],
                                   "AlkPhos_mean": data["filter_hadm_id"]["AlkPhos_mean"].iloc[0],
                                   "AlkPhos_max": data["filter_hadm_id"]["AlkPhos_max"].iloc[0],
                                   "AlkPhos_min": data["filter_hadm_id"]["AlkPhos_min"].iloc[0],
                                   "PT_mean": data["filter_hadm_id"]["PT_mean"].iloc[0],
                                   "PT_min": data["filter_hadm_id"]["PT_min"].iloc[0],
                                   "INR_mean": data["filter_hadm_id"]["INR_mean"].iloc[0],
                                   "INR_min": data["filter_hadm_id"]["INR_min"].iloc[0],
                                   "Phosphate_mean": data["filter_hadm_id"]["Phosphate_mean"].iloc[0],
                                   "Phosphate_max": data["filter_hadm_id"]["Phosphate_max"].iloc[0],
                                   "PaO2_mean": data["filter_hadm_id"]["PaO2_mean"].iloc[0],
                                   "PaO2_max": data["filter_hadm_id"]["PaO2_max"].iloc[0],
                                   "aPTT_mean": data["filter_hadm_id"]["aPTT_mean"].iloc[0],
                                   "aPTT_min": data["filter_hadm_id"]["aPTT_min"].iloc[0],

                                   "AG_mean": data["filter_hadm_id"]["AG_mean"].iloc[0],
                                   "AG_max": data["filter_hadm_id"]["AG_max"].iloc[0],
                                   "AG_min": data["filter_hadm_id"]["AG_min"].iloc[0],
                                   "AG_std": data["filter_hadm_id"]["AG_std"].iloc[0],
                                   "SYSBP_min": data["filter_hadm_id"]["SYSBP_min"].iloc[0],
                                   "SYSBP_mean": data["filter_hadm_id"]["SYSBP_mean"].iloc[0],
                                   "SYSBP_std": data["filter_hadm_id"]["SYSBP_std"].iloc[0],
                                   "DIASBP_min": data["filter_hadm_id"]["DIASBP_min"].iloc[0],
                                   "DIASBP_mean": data["filter_hadm_id"]["DIASBP_mean"].iloc[0],
                                   "age": data["filter_hadm_id"]["age"].iloc[0],
                                   "RR_mean": data["filter_hadm_id"]["RR_mean"].iloc[0],
                                   "RR_max": data["filter_hadm_id"]["RR_max"].iloc[0],
                                   "RR_min": data["filter_hadm_id"]["RR_min"].iloc[0],
                                   "TEMP_std": data["filter_hadm_id"]["TEMP_std"].iloc[0],
                                   "TEMP_min": data["filter_hadm_id"]["TEMP_min"].iloc[0],
                                   "HR_mean": data["filter_hadm_id"]["HR_mean"].iloc[0],
                                   "HR_max": data["filter_hadm_id"]["HR_max"].iloc[0],
                                   "HR_std": data["filter_hadm_id"]["HR_std"].iloc[0],
                                   "RDW_max": data["filter_hadm_id"]["RDW_max"].iloc[0],
                                   "RDW_mean": data["filter_hadm_id"]["RDW_mean"].iloc[0],
                                   "RDW_min": data["filter_hadm_id"]["RDW_min"].iloc[0],
                                   "RDW_std": data["filter_hadm_id"]["RDW_std"].iloc[0],
                                   "age_adj_comorbidity_score":
                                       data["filter_hadm_id"]["age_adj_comorbidity_score"].iloc[0],
                                   "MEANBP_min": data["filter_hadm_id"]["MEANBP_min"].iloc[0],
                                   "MEANBP_mean": data["filter_hadm_id"]["MEANBP_mean"].iloc[0]
                                   }])
    df = frontend_data.apply(pd.to_numeric, errors="coerce")

    # ---------------------------------------
    # 2. Load all models
    # ---------------------------------------

    models = {name: joblib.load(path) for name, path in model_paths.items()}
    print("gel: ", models)

    # ---------------------------------------
    # 3. Loop through each model
    # ---------------------------------------

    for model_name, pipeline in models.items():
        print(f"Papal: {model_name}, {pipeline}")
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
        shap.summary_plot(
            shap_values,
            df,
            feature_names=df.columns,
            show=False)
        plt.tight_layout()
        plt.savefig(staticfiles_storage.path(f'imgs/shap_summary_{model_name}.png'),
                    dpi=300)
        plt.close()

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
        "explainability": shap_results,
        "frontend_data": frontend_dict
    }

    return json_response

def search_new_patient(request):
    print("search_new_patient")
    print(request.GET.get('term', None))
    data = new_patient
    df = pd.DataFrame(data)
    if request.method == "GET":
        subject_id = request.GET.get('term', None)
        print(subject_id)
        if subject_id is not None and subject_id != '':
            result = df[df['Subject_id'].astype(str).str.lower().str.contains(subject_id, case=False, na=False)
            ].drop_duplicates(subset="Subject_id")
            print("result", result)
            data_item = result[:5]
            json_data = data_item["Subject_id"].to_json()
            print("json data: ", json_data)
            return JsonResponse(json_data, safe=False)

    return render(request, 'datamanagement/base.html')


    return render(request, 'datamanagement/base.html')
def search_diagnosis(request):
    data_all = patient_data

    if request.method == "GET" and request.headers.get("x-requested-with") == "XMLHttpRequest":
        input_diagnosis = request.GET.get('term', None)

        if input_diagnosis is not None and input_diagnosis != '':
            result = data_all[
                data_all["Diagnosis"].astype(str).str.lower().str.contains(input_diagnosis, case=False, na=False)
            ].drop_duplicates(subset="Diagnosis")
            data_item = result[:5]
            json_data = data_item["Diagnosis"].to_json()

            return JsonResponse(json_data, orient="records")

    return render(request, 'datamanagement/base.html')


def feature_list(request):
    print("feature_list function: ")
    patient_data = get_patient(request.POST.get("subject_id"))
    models = {}
    feature_value = []
    feature_name = []
    if request.method == "POST" and request.headers.get("x-requested-with") == "XMLHttpRequest":

        # -----------------------------
        # 1. Build input dataframe with frontend POST request
        # -----------------------------
        frontend_data = pd.DataFrame([{"GCS_max": request.POST.get("GCS_max"),
                                       "GCS_mean": request.POST.get("GCS_mean"),
                                       "Lactate_min": request.POST.get("Lactate_min"),
                                       "Lactate_max": request.POST.get("Lactate_max"),
                                       "Lactate_mean": request.POST.get("Lactate_mean"),
                                       "BUN_min": request.POST.get("BUN_min"),
                                       "BUN_mean": request.POST.get("BUN_mean"),
                                       "Bilirubin_max": request.POST.get("Bilirubin_max"),
                                       "Bilirubin_mean": request.POST.get("Bilirubin_mean"),
                                       "AG_MEAN": request.POST.get("AG_MEAN"),
                                       "AG_MEDIAN": request.POST.get("AG_MEDIAN"),
                                       "AG_MAX": request.POST.get("AG_MAX"),
                                       "AG_MIN": request.POST.get("AG_MIN"),
                                       "AG_STD": request.POST.get("AG_STD"),
                                       "SYSBP_MIN": request.POST.get("SYSBP_MIN"),
                                       "SYSBP_MEAN": request.POST.get("SYSBP_MEAN"),
                                       "SYSBP_STD": request.POST.get("SYSBP_STD"),
                                       "DIASBP_MIN": request.POST.get("DIASBP_MIN"),
                                       "DIASBP_MEAN": request.POST.get("DIASBP_MEAN"),
                                       "AGE": patient_data["Age"],
                                       "RR_MEAN": request.POST.get("RR_MEAN"),
                                       "RR_MAX": request.POST.get("RR_MAX"),
                                       "RR_MIN": request.POST.get("RR_MIN"),
                                       "TEMP_STD": request.POST.get("TEMP_STD"),
                                       "TEMP_MIN": request.POST.get("TEMP_MIN"),
                                       "HR_MEAN": request.POST.get("HR_MEAN"),
                                       "HR_MAX": request.POST.get("HR_MAX"),
                                       "HR_STD": request.POST.get("HR_STD"),
                                       "RDW_max": request.POST.get("RDW_max"),
                                       "RDW_mean": request.POST.get("RDW_mean"),
                                       "RDW_min": request.POST.get("RDW_min"),
                                       "RDW_std": request.POST.get("RDW_std"),
                                       "age_adj_comorbidity_score": request.POST.get("age_adj_comorbidity_score"),
                                       "MEANBP_MIN": request.POST.get("MEANBP_MIN"),
                                       "MEANBP_MEAN": request.POST.get("MEANBP_MEAN")
                                       }])

        for col in frontend_data.columns:
            feature_name.append(col)
            feature_value.append(frontend_data[col].iloc[0])

            # data_to_send[col] = frontend_data[col].iloc[0]

        # Convert EVERY cell to numeric
        df = frontend_data.apply(pd.to_numeric, errors="coerce")

        # -----------------------------
        # 2. Load models
        # -----------------------------

        for name, path in model_paths.items():
            with open(path, "rb") as f:
                models[name] = joblib.load(path)

        # Predict
        print("df.dtypes ", df.dtypes)
        print("df.columns ", df.columns)
        print(" df.isna().sum() ", df.isna().sum())
        xb_pred = models["XGBoost"].predict_proba(df)[0][1]
        # print("gradient_boosting:", xb_pred)

        # -----------------------------
        # 4. SHAP Explainability
        # -----------------------------
        shap_results = {}
        for model_name, model in models.items():
            # Create SHAP explainer
            explainer = shap.TreeExplainer(model)
            # Compute SHAP values
            shap_values = explainer.shap_values(df)

            # begin added 28.12.2025
            """
            explainer_shap = shap.Explainer(model)
            explainer_shap_value = explainer_shap(df)
            shap.plots.waterfall(explainer_shap_value[0])
            """
            # end added 28.12.2025
            # print("shap_values: ", shap_values)
            # For classifiers → take class 1
            if isinstance(shap_values, list):
                shap_values = shap_values[1]

            shap.summary_plot(
                shap_values,
                df,
                feature_names=df.columns,
                show=False
            )
            plt.tight_layout()

            plt.savefig(staticfiles_storage.path('imgs/shap_summary.png'), dpi=300)
            plt.close()
            # For classifiers, shap_values is a list
            """
            if isinstance(shap_values, list):
                shap_values = shap_values[1]

                #Store results for the first row only
                shap_results[model_name] = {
                    "feature_names": df.columns.tolist(),
                    "shap_values": shap_values[0].tolist()
                }

            """
            # Pair and sort
            sorted_features = sorted(zip(df.columns.tolist(), shap_values[0].tolist()),
                                     key=lambda x: x[1], reverse=True)
            index = 0
            for feature, value in sorted_features:
                feature_name[index] = feature
                feature_value[index] = request.POST.get(feature)
                index = index + 1

            frontend_dict = {
                "feature_name": feature_name,
                "feature_value": feature_value
            }

            shap_results[model_name] = {
                "feature_names": df.columns.tolist(),
                "shap_values": shap_values[0].tolist()
            }
            print(shap_results[model_name])
            # -----------------------------
            # 5. Build JSON response
            # -----------------------------

            response = {
                "prediction": {
                    "XGBoost": float(xb_pred)
                },
                "explainability": shap_results,
                "frontend_data": frontend_dict

            }

            return JsonResponse(response, safe=False)
    return render(request, 'datamanagement/base.html')


def patient_list(request):
    return render(request, 'datamanagement/base.html')


def parse_prediction(x):
    # Convert prediction string → real dict
    if pd.isna(x) or x == "":
        return None
    return ast.literal_eval(x)


def patient_list(request):
    patient_list = read_feature(staticfiles_storage.path('files/patient_prediction.csv'))

    if request.method == "GET" and request.headers.get("x-requested-with") == "XMLHttpRequest":
        patient_list["prediction_dict"] = patient_list["prediction"].apply(parse_prediction)  # Extract XGBoost value
        patient_list["XGBoost_value"] = patient_list["prediction_dict"].apply(
            lambda d: d.get("XGBoost") if isinstance(d, dict) else None
        )  # Sort by XGBoost descending
        df_sorted = patient_list.sort_values("XGBoost_value", ascending=False)
        print("df_sorted: ", df_sorted)
        context = {
            'patient_data': df_sorted.to_json(orient="records"),
            'image_url': 'http://127.0.0.1:8000/static/imgs/medical_illness.png'
        }
        print(len(df_sorted))
        return JsonResponse(context, safe=False)

    return render(request, 'datamanagement/base.html')


def load_hadm_data(request):
    data_all = patient_data
    model_patient_data = defaultdict(list)
    if request.method == "GET" and request.headers.get("x-requested-with") == "XMLHttpRequest":
        print("load_hadm_data: ", request.GET)

        subject_id = request.GET.get("subject_id")
        hadm_string = request.GET.get("hadm_id")
        hadm_id = hadm_string.split(":")[1].strip()


        filtered_data = data_all[(data_all.Subject_id.astype(str) == subject_id) &
                                 (data_all.Hadm_id.astype(str) == hadm_id)
                                 ]

        data = filtered_data[['Subject_id', 'Hadm_id', 'Diagnosis', 'Gender', 'Birthday', 'Admission_time',
                              'Age', 'Marital_status', 'Language', 'Insurance', 'Religion', 'Died']]

        # we fetch the hospital admission time (hadm_id) of the same patient (subject_id)
        for item_hadm_id in data['Hadm_id']:
            model_patient_data[item_hadm_id].append(model_shap(filter_hadm_id(item_hadm_id)))

        context = {
            "subject_id": subject_id,
            "data": data.to_json(orient="records"),
            'data_lenght': len(data),
            "model_detail": model_patient_data
        }

        return JsonResponse(context, safe=False)

    return render(request, 'datamanagement/base.html')


def get_feature_result(feature):
    frontend_data = pd.DataFrame([{"GCS_max": feature["GCS_max"],
                                   "GCS_mean": feature["GCS_mean"],
                                   "Lactate_min": feature["Lactate_min"],
                                   "Lactate_max": feature["Lactate_max"],
                                   "Lactate_mean": feature["Lactate_mean"],
                                   "BUN_min": feature["BUN_min"],
                                   "BUN_mean": feature["BUN_mean"],
                                   "BUN_max": feature["BUN_max"],
                                   "Bilirubin_max": feature["Bilirubin_max"],
                                   "Bilirubin_mean": feature["Bilirubin_mean"],
                                   "Albumin_mean": feature["Albumin_mean"],
                                   "Albumin_min": feature["Albumin_min"],
                                   "Albumin_max": feature["Albumin_max"],
                                   "AlkPhos_mean": feature["AlkPhos_mean"],
                                   "AlkPhos_max": feature["AlkPhos_max"],
                                   "AlkPhos_min": feature["AlkPhos_min"],
                                   "PT_mean": feature["PT_mean"],
                                   "PT_min": feature["PT_min"],
                                   "INR_mean": feature["INR_mean"],
                                   "INR_min": feature["INR_min"],
                                   "Phosphate_mean": feature["Phosphate_mean"],
                                   "Phosphate_max": feature["Phosphate_max"],
                                   "PaO2_mean": feature["PaO2_mean"],
                                   "PaO2_max": feature["PaO2_max"],
                                   "aPTT_mean": feature["aPTT_mean"],
                                   "aPTT_min": feature["aPTT_min"],
                                   "AG_mean": feature["AG_mean"],
                                   "AG_max": feature["AG_max"],
                                   "AG_min": feature["AG_min"],
                                   "AG_std": feature["AG_std"],
                                   "SYSBP_min": feature["SYSBP_min"],
                                   "SYSBP_mean": feature["SYSBP_mean"],
                                   "SYSBP_std": feature["SYSBP_std"],
                                   "DIASBP_min": feature["DIASBP_min"],
                                   "DIASBP_mean": feature["DIASBP_mean"],
                                   "age": feature["age"],
                                   "RR_mean": feature["RR_mean"],
                                   "RR_max": feature["RR_max"],
                                   "RR_min": feature["RR_min"],
                                   "TEMP_std": feature["TEMP_std"],
                                   "TEMP_min": feature["TEMP_min"],
                                   "HR_mean": feature["HR_mean"],
                                   "HR_max": feature["HR_max"],
                                   "HR_std": feature["HR_std"],
                                   "RDW_max": feature["RDW_max"],
                                   "RDW_mean": feature["RDW_mean"],
                                   "RDW_min": feature["RDW_min"],
                                   "RDW_std": feature["RDW_std"],
                                   "age_adj_comorbidity_score": feature["age_adj_comorbidity_score"],
                                   "MEANBP_min": feature["MEANBP_min"],
                                   "MEANBP_mean": feature["MEANBP_mean"]
                                   }])
    feature_df = frontend_data.apply(pd.to_numeric, errors="coerce")
    return feature_df, frontend_data

def compute_shapvalue(df, frontend_data):
    predictions = {}
    shap_results = {}
    frontend_dict = {}

    # ---------------------------------------
    # 2. Load all models
    # ---------------------------------------

    models = {name: joblib.load(path) for name, path in model_paths.items()}
    print("gel: ", models)

    for model_name, pipeline in models.items():
        print(f"Papal: {model_name}, {pipeline}")
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
        shap.summary_plot(
            shap_values,
            df,
            feature_names=df.columns,
            show=False)
        plt.tight_layout()
        plt.savefig(staticfiles_storage.path(f'imgs/shap_summary_{model_name}.png'),
                    dpi=300)
        plt.close()

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
        "explainability": shap_results,
        "contributor_data": frontend_dict
    }

    return JsonResponse(json_response, safe=False)

def prediction_new_patient(higher_measurement, lower_measurement):
    # ---------------------------------------
    # 1. Build frontend dataframe
    # ---------------------------------------
    print(higher_measurement)
    feature_higher = higher_measurement['higher_measurement']['feature']
    feature_lower = lower_measurement['lower_measurement']['feature']

    # get frontend data
    higher_df, frontend_higher = get_feature_result(feature_higher)
    lower_df, frontend_lower = get_feature_result(feature_lower)

    # ---------------------------------------
    # 2. Load all models
    # ---------------------------------------

    models = {name: joblib.load(path) for name, path in model_paths.items()}
    print("gel: ", models)
    # ---------------------------------------
    # 3. Loop through each model
    # ---------------------------------------

    json_response_higher = compute_shapvalue(higher_df, frontend_higher)
    json_response_lower = compute_shapvalue(lower_df, frontend_lower)

    context = {
        "higher": json_response_higher,
        "lower": json_response_lower
    }
    JsonResponse(context, safe=False)


def read_measurement(folder, filename):
    file_path = upload_path + "/" + folder + "/" + filename
    with open(file_path, "r") as f:
        measurement = json.load(f)
    return measurement

def feature_extraction(request):
    training_df = pd.read_csv(feature_df_name)
    file_path1 = staticfiles_storage.path('files/high_risk_patient_data.json')
    file_path2 = staticfiles_storage.path('files/low_risk_patient_data.json')

    # load measurement as json higher and lower
    with open(file_path1, "r") as f:
        higher_measurement = json.load(f)
    with open(file_path2, "r") as f:
        lower_measurement = json.load(f)


    if request.method == "GET":
        return JsonResponse(
            {"higher_measurement": higher_measurement,
             "lower_measurement": lower_measurement},
            safe=False
        )

    if request.method == "POST":

        higher_result = engineer_features(higher_measurement, training_df=training_df)

        #model_result1, model_result2 = prediction_new_patient(higher_result, lower_result)
        print("result", higher_result)
        return JsonResponse(
            {"measurement": higher_result,
             }, safe=False
        )

def get_feature_view(measurement):
    return JsonResponse({"measurement": measurement}, safe=False)

def error_upload(request):
    """

    :param request: request for file without json or csv Format
    :return: error template
    """
    # für Datei, die keine .zip, .csv, .json Formatierung haben
    msg = "Only .json .csv and .zip format are allow to upload the file"
    context = {
        "error_upload_msg": msg
    }
    return render(request, "datamanagement/error_upload.html", context)
def handle_uploaded_file(file, filename, folder_name):
    """
    :param file: file object, binary file
    :param filename: name der file = file.name
    :param folder_name: Name of Folder, which is entered by user
    :return:

    This function saves the uploaded file to the hard drive.
    'wb+': this mode overwrites the file on the hard drive if the file already exists.
    """
    split_tup = os.path.splitext(file.name)
    if not os.path.exists(upload_path):
        os.makedirs(staticfiles_storage.path() + 'upload/')

    if not os.path.exists(upload_path + "/" + folder_name):
        os.makedirs(upload_path + "/" + folder_name + "/")

    # schreibt die Datei auf der Festplatte
    with open(upload_path + "/" + folder_name + "/" + str(filename), "wb+") as destination:
        for chunk in file.chunks():
            destination.write(chunk)


class label_dataView(FormView):
    """
    This method allows the user to upload files.
    After the template is displayed, the selected file will be sent by post.

    """
    form_class = UploadFileForm
    template_name = "datamanagement/uploadfile_labeldata.html"
    success_url = "..."

    def post(self, request, *args, **kwargs):

        # Daten, die per Post gesendet werden.
        form_class = self.get_form_class()
        form = self.get_form(form_class)
        if form.is_valid():
            return self.form_valid(form)
        else:
            return self.form_invalid(form)

    def form_valid(self, form):
        files = form.cleaned_data["file"]
        folder_title = form.cleaned_data["file_title"]

        for file in files:
            split_tup = os.path.splitext(file.name)
            filename = file.name
            if (str(filename).endswith(".json")):

                if folder_title == "":
                    folder_title = split_tup[0]

                handle_uploaded_file(file, filename, folder_title)

                # read the content of file
                measurement = read_measurement(folder=folder_title, filename=filename)
                context = {"measurement": measurement}
                
                return redirect(reverse('datamanagement:get_feature_view') + f'?measurement={measurement}')
            else:
                return redirect(reverse("datamanagement:error_upload"))  # Replace with your template.
        return redirect(reverse('datamanagement:index'))

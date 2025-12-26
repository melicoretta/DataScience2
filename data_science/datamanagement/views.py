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
from sklearn.impute import SimpleImputer
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use("Agg") #Use non-GUI backend
import matplotlib.pyplot as plt


model_paths = {
    "XGBoost": staticfiles_storage.path('model/model_xgb.joblib'),
}

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

    merged_data.rename(columns={"ROW_ID": "Row_id", "SUBJECT_ID": "Subject_id", "DOB": "Birthday",
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
        row_id = request.GET.get('term', None)

        if row_id is not None and row_id != '':
            result = [str(item) for item in arr_row_id if str(item).startswith(row_id)]
            result = result[:10]
            return JsonResponse(result, safe=False)

    return render(request, 'datamanagement/base.html')


def show_diagnosis(request):
    data_all = patient_data

    if request.method == "POST" and request.headers.get("x-requested-with") == "XMLHttpRequest":
        subject_id = request.POST.get("subject_id")

        filtered_data = data_all[data_all["Subject_id"].astype(str) == subject_id]
        data = filtered_data[['Subject_id', 'Diagnosis', 'Gender', 'Birthday', 'Admission_time',
                              'Age', 'Marital_status', 'Died']]

        context = {
            "subject_id": subject_id,
            "data": data.to_json(),
            'data_lenght': len(data)
        }

        return JsonResponse(context, safe=False)
    return render(request, 'datamanagement/base.html')


def search_diagnosis(request):
    data_all = patient_data

    if request.method == "GET" and request.headers.get("x-requested-with") == "XMLHttpRequest":
        input_diagnosis = request.GET.get('term', None)

        if input_diagnosis is not None and input_diagnosis != '':
            result = data_all[
                data_all["Diagnosis"].astype(str).str.lower().str.contains(input_diagnosis, case=False, na=False)]
            data_item = result[:10]
            json_data = data_item["Diagnosis"].to_json()

            return JsonResponse(json_data, safe=False)

    return render(request, 'datamanagement/base.html')


def feature_list(request):
    models = {}
    if request.method == "POST" and request.headers.get("x-requested-with") == "XMLHttpRequest":

        # -----------------------------
        # 1. Build input dataframe with frontend POST request
        # -----------------------------

        test_data = pd.DataFrame([{"GCS_max": request.POST.get("GCS_max"), "GCS_mean": request.POST.get("GCS_mean"),
                                   "Lactate_min": request.POST.get("Lactate_min"),
                                   "Lactate_max": request.POST.get("Lactate_max"),
                                   "Lactate_mean": request.POST.get("Lactate_mean"),
                                   "BUN_min": request.POST.get("BUN_min"),
                                   "BUN_mean": request.POST.get("BUN_mean"), "AG_max": request.POST.get("AG_max"),
                                   "AG_mean": request.POST.get("AG_mean"),
                                   "Bilirubin_max": request.POST.get("Bilirubin_max"),
                                   "Bilirubin_mean": request.POST.get("Bilirubin_mean"),
                                   "AG_MEAN": request.POST.get("AG_MEAN"),
                                   "AG_MAX": request.POST.get("AG_MAX"), "AG_MEDIAN": request.POST.get("AG_MEDIAN"),
                                   "AG_MIN": request.POST.get("AG_MIN"), "AG_STD": request.POST.get("AG_STD"),
                                   "SYSBP_MIN": request.POST.get("SYSBP_MIN"),
                                   "SYSBP_MEAN": request.POST.get("SYSBP_MEAN"),
                                   "SYSBP_STD": request.POST.get("SYSBP_STD"),
                                   "DIASBP_MIN": request.POST.get("DIASBP_MIN"),
                                   "DIASBP_MEAN": request.POST.get("DIASBP_MEAN"), "AGE": request.POST.get("age"),
                                   "RR_MEAN": request.POST.get("RR_MEAN"), "RR_STD": request.POST.get("RR_STD"),
                                   "RR_MAX": request.POST.get("RR_MAX"), "TEMP_STD": request.POST.get("TEMP_STD"),
                                   "TEMP_MIN": request.POST.get("TEMP_MIN"), "HR_MEAN": request.POST.get("HR_MEAN"),
                                   "HR_MAX": request.POST.get("HR_MAX"),
                                   "age_adj_comorbidity_score": request.POST.get("age_adj_comorbidity_score")
                                   }])

        # Convert EVERY cell to numeric
        df = test_data.apply(pd.to_numeric, errors="coerce")

        # -----------------------------
        # 2. Load models
        # -----------------------------

        for name, path in model_paths.items():
            with open(path, "rb") as f:
                models[name] = joblib.load(path)

        # Predict
        xb_pred = models["XGBoost"].predict_proba(df)[0][1]
        #print("gradient_boosting:", xb_pred)

        # -----------------------------
        # 4. SHAP Explainability
        # -----------------------------
        shap_results = {}
        for model_name, model in models.items():
            # Create SHAP explainer
            explainer = shap.TreeExplainer(model)

            # Compute SHAP values
            shap_values = explainer.shap_values(df)
            #print("shap_values: ", shap_values)
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
            #For classifiers, shap_values is a list
            """
            if isinstance(shap_values, list):
                shap_values = shap_values[1]

                #Store results for the first row only
                shap_results[model_name] = {
                    "feature_names": df.columns.tolist(),
                    "shap_values": shap_values[0].tolist()
                }
                print("shap_results: ", shap_results)
                
            """
            shap_results[model_name] = {
                "feature_names": df.columns.tolist(),
                "shap_values": shap_values[0].tolist()
            }
            #print(shap_results[model_name])
            # -----------------------------
            # 5. Build JSON response
            # -----------------------------
            response = {
                "prediction": {
                    "XGBoost": float(xb_pred)
                },
                "explainability": shap_results,
                "folder_name": "http://localhost:8000/static/imgs/shap_summary.png"
            }
            print("folder_name", staticfiles_storage.path('imgs/shap_summary.png'))
            return JsonResponse(response, safe=False)
    return render(request, 'datamanagement/base.html')

